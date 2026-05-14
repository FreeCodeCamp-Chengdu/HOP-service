import { execFile } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { dirname, join } from 'path';
import { tmpdir } from 'os';
import { promisify } from 'util';

import multer from '@koa/multer';
import {
    Authorized,
    Ctx,
    CurrentUser,
    HttpCode,
    JsonController,
    Param,
    Put
} from 'routing-controllers';
import { ParameterizedContext } from 'koa';

import {
    dataSource,
    OAuthCredential,
    OAuthPlatform,
    PlatformDomainMap,
    User
} from '../model';

const execFileAsync = promisify(execFile);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
const MAX_FILE_COUNT = 20;

const ALLOWED_EXTENSIONS = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.less',
    '.html', '.md', '.yaml', '.yml', '.toml', '.xml', '.svg',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.txt',
    '.sh', '.bash', '.py', '.go', '.rs', '.java', '.c', '.cpp',
    '.h', '.hpp', '.rb', '.php', '.sql', '.wasm',
    '.env', '.gitignore', '.dockerignore', '.editorconfig',
    '.prettierrc', '.eslintrc', '.babelrc'
];

function hasAllowedExtension(filename: string): boolean {
    const lower = filename.toLowerCase();
    return ALLOWED_EXTENSIONS.some(ext => lower.endsWith(ext));
}

interface GitCredential {
    username: string;
    accessToken: string;
    platform: OAuthPlatform;
}

async function findGitCredential(
    user: User,
    gitHost: string
): Promise<GitCredential> {
    const credentialStore = dataSource.getRepository(OAuthCredential);

    for (const [platform, domain] of Object.entries(PlatformDomainMap)) {
        if (!gitHost.includes(domain)) continue;

        const credential = await credentialStore.findOne({
            where: {
                platform: platform as OAuthPlatform,
                user: { id: user.id }
            }
        });

        if (credential?.accessToken && credential?.username) {
            return {
                username: credential.username,
                accessToken: credential.accessToken,
                platform: platform as OAuthPlatform
            };
        }
    }

    throw new Error(
        `No OAuth credential found for ${gitHost}. Please link your account first.`
    );
}

function parseGitURL(noProtocolURL: string): {
    host: string;
    owner: string;
    repo: string;
    branch: string;
    path: string;
} {
    const parts = noProtocolURL.split('/');
    const host = parts[0];
    const owner = parts[1];
    const repo = parts[2];

    let branch = 'main';
    let filePath = '';

    if (parts.length > 5) {
        const treeOrBlobIndex = parts.findIndex(
            p => p === 'tree' || p === 'blob'
        );
        if (treeOrBlobIndex !== -1) {
            branch = parts[treeOrBlobIndex + 1];
            filePath = parts.slice(treeOrBlobIndex + 2).join('/');
        }
    }

    return { host, owner, repo, branch, path: filePath };
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, tmpdir()),
        filename: (_req, file, cb) =>
            cb(null, `hop-${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`)
    }),
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: MAX_FILE_COUNT
    }
});

interface UploadResult {
    repository: string;
    branch: string;
    files: string[];
}

@JsonController('/file/Git')
export class GitFileController {
    @Put('/:noProtocolURL(.*)')
    @Authorized()
    @HttpCode(201)
    async uploadFiles(
        @CurrentUser() user: User,
        @Param('noProtocolURL') noProtocolURL: string,
        @Ctx() ctx: ParameterizedContext
    ): Promise<UploadResult> {
        const gitInfo = parseGitURL(noProtocolURL);

        const credential = await findGitCredential(user, gitInfo.host);

        const { host, owner, repo, branch, path: targetPath } = gitInfo;
        const domain = PlatformDomainMap[credential.platform];
        const authedGitURL = `https://${credential.username}:${credential.accessToken}@${domain}/${owner}/${repo}`;

        // Handle multipart upload via multer
        await new Promise<void>((resolve, reject) => {
            upload.any()(ctx.req, ctx.res, err => {
                if (err) return reject(err);
                resolve();
            });
        });

        const reqFiles = (ctx.req as unknown as { files?: { fieldname: string; path: string; size: number; originalname: string }[] }).files;

        if (!reqFiles || reqFiles.length === 0) {
            throw new Error('No files provided');
        }

        const files = reqFiles;

        // Validate total size & extensions
        let totalSize = 0;
        for (const file of files) {
            totalSize += file.size;
            if (totalSize > MAX_TOTAL_SIZE) {
                // Clean up uploaded files
                for (const f of files) {
                    rm(f.path, { force: true });
                }
                throw new Error(
                    `Total upload size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB limit`
                );
            }

            if (!hasAllowedExtension(file.originalname)) {
                for (const f of files) {
                    rm(f.path, { force: true });
                }
                throw new Error(`File type not allowed: ${file.originalname}`);
            }
        }

        // Create temp directory for organized files
        const tempDir = join(
            tmpdir(),
            `hop-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`
        );

        try {
            await mkdir(tempDir, { recursive: true });

            // Organize files: field name = relative path in repo
            for (const file of files) {
                const targetFilePath = targetPath
                    ? join(tempDir, targetPath, file.fieldname)
                    : join(tempDir, file.fieldname);

                await mkdir(dirname(targetFilePath), { recursive: true });

                const sourceStream = createReadStream(file.path);
                const destStream = createWriteStream(targetFilePath);

                await new Promise<void>((resolve, reject) => {
                    sourceStream.pipe(destStream);
                    sourceStream.on('error', reject);
                    destStream.on('error', reject);
                    destStream.on('finish', resolve);
                });
            }

            // Use git-utility to upload
            const xgitPath = require.resolve('git-utility/dist/index.js');

            if (targetPath) {
                await execFileAsync('node', [
                    xgitPath, 'upload', tempDir, authedGitURL, branch, targetPath
                ]);
            } else {
                await execFileAsync('node', [
                    xgitPath, 'upload', tempDir, authedGitURL, branch
                ]);
            }

            return {
                repository: `${host}/${owner}/${repo}`,
                branch,
                files: files.map(f => f.fieldname)
            };
        } finally {
            // Clean up temp directory and multer temp files
            await rm(tempDir, { recursive: true, force: true });
            for (const f of files) {
                await rm(f.path, { force: true });
            }
        }
    }
}
