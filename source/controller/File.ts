import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import {
    Authorized,
    BadRequestError,
    Body,
    Controller,
    CurrentUser,
    Delete,
    HttpCode,
    OnUndefined,
    Param,
    Post,
    Put,
    UnauthorizedError
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    buildAuthenticatedGitURL,
    dataSource,
    detectPlatformFromURL,
    OAuthCredential,
    platformDomainMap,
    SignedLink,
    User
} from '../model';
import { AWS_S3_BUCKET, AWS_S3_PUBLIC_HOST, s3Client } from '../utility';

export class GitUploadBody {
    files: Record<string, string>;
    branch?: string;
    message?: string;
}

@Controller('/file')
export class FileController {
    credentialStore = dataSource.getRepository(OAuthCredential);

    @Post('/signed-link/:path(.*)')
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(SignedLink)
    async createSignedLink(@CurrentUser() { id }: User, @Param('path') path: string) {
        const Key = `user/${id}/${path}`;
        const command = new PutObjectCommand({ Bucket: AWS_S3_BUCKET, Key });
        const putLink = await getSignedUrl(s3Client, command);
        return { putLink, getLink: `${AWS_S3_PUBLIC_HOST}/${Key}` };
    }

    @Delete('/:path(.*)')
    @Authorized()
    @OnUndefined(204)
    async deleteFile(@CurrentUser() { id }: User, @Param('path') path: string) {
        const Key = `user/${id}/${path}`;
        const command = new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET, Key });
        await s3Client.send(command);
    }

    /**
     * Git 代码库多文件上传接口
     *
     * PUT /file/Git/github.com/owner/repo
     *
     * Body (JSON):
     * {
     *   "files": {
     *     "path/to/file1.txt": "文件内容",
     *     "path/to/file2.js": "console.log('hello');"
     *   },
     *   "branch": "main",
     *   "message": "Upload via HOP API"
     * }
     */
    @Put('/Git/:noProtocolURL(.*)')
    @Authorized()
    @HttpCode(201)
    async uploadToGit(
        @CurrentUser() user: User,
        @Param('noProtocolURL') repoPath: string,
        @Body() body: GitUploadBody
    ) {
        const platform = detectPlatformFromURL(repoPath);
        if (!platform) throw new BadRequestError('不支持的 Git 平台域名');

        const credential = await this.credentialStore.findOneBy({
            platform,
            user: { id: user.id }
        });
        if (!credential?.platformUsername)
            throw new UnauthorizedError(`未找到 ${platform} 平台凭据，请先登录`);

        const files = body.files;
        if (!files || !Object.keys(files).length) throw new BadRequestError('请至少提供一个文件');

        const tempDir = path.join(os.tmpdir(), `hop-git-upload-${Date.now()}`);
        await fs.mkdir(tempDir, { recursive: true });

        try {
            for (const [filePath, content] of Object.entries(files)) {
                const fullPath = path.join(tempDir, filePath);
                await fs.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.writeFile(fullPath, content, 'utf-8');
            }

            const branch = body.branch || 'main';
            const cleanPath = repoPath.replace(new RegExp(`^${platformDomainMap[platform]}/`), '');
            const authURL = buildAuthenticatedGitURL(
                platform,
                credential.platformUsername!,
                credential.accessToken,
                cleanPath
            );

            const result = execSync(
                `npx git-utility upload "${tempDir}" "${authURL}" "${branch}"`,
                { timeout: 120000, stdio: 'pipe', encoding: 'utf-8' }
            );

            return {
                success: true,
                repository: repoPath,
                branch,
                output: result.trim()
            };
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
}
