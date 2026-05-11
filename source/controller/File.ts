import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import multer from '@koa/multer';
import { tmpdir } from 'os';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import { promisify } from 'util';
import {
    Authorized,
    Controller,
    Ctx,
    CurrentUser,
    Delete,
    HttpCode,
    OnUndefined,
    Param,
    Post,
    Put
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';
import type { ParameterizedContext } from 'koa';

import {
    dataSource,
    OAuthCredential,
    OAuthPlatform,
    OAuthPlatformDomain,
    SignedLink,
    User
} from '../model';
import { AWS_S3_BUCKET, AWS_S3_PUBLIC_HOST, s3Client } from '../utility';

const execFileAsync = promisify(execFile);
const upload = multer({
    dest: tmpdir(),
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 20,
        fields: 20,
        parts: 40,
        fieldSize: 1 * 1024 * 1024
    }
});

@Controller('/file')
export class FileController {
    credentialStore = dataSource.getRepository(OAuthCredential);

    @Post('/signed-link/:path(.*)')
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(SignedLink)
    async createSignedLink(
        @CurrentUser() { id }: User,
        @Param('path') path: string
    ) {
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
     * PUT /file/Git/:noProtocolURL
     *
     * Accepts a multipart/form-data request where each field key is a relative
     * file path within the target repository and each value is the corresponding
     * file blob. Files are written to a temporary directory, then committed and
     * pushed to the target Git repository using the authenticated user's stored
     * OAuth credentials via `xgit upload` from the `git-utility` package.
     *
     * @param noProtocolURL - Repository URL without the protocol prefix,
     *   e.g. `github.com/owner/repo`. The platform is inferred from the domain.
     */
    @Put('/Git/:noProtocolURL(.*)')
    @Authorized()
    @OnUndefined(204)
    async uploadToGit(
        @CurrentUser() currentUser: User,
        @Param('noProtocolURL') noProtocolURL: string,
        @Ctx() ctx: ParameterizedContext
    ) {
        // 1. Infer platform from repository URL domain
        const platform = this.resolvePlatform(noProtocolURL);

        if (!platform)
            throw Object.assign(
                new Error(`Unsupported Git platform in URL: ${noProtocolURL}`),
                { status: 422 }
            );

        // 2. Look up the user's stored OAuth credential for that platform
        const credential = await this.credentialStore.findOne({
            where: { platform, user: { id: currentUser.id } },
            relations: ['user']
        });

        if (!credential?.username)
            throw Object.assign(
                new Error(
                    `No ${platform} credential found for current user. ` +
                        `Please sign in with ${platform} first.`
                ),
                { status: 401 }
            );

        // 3. Parse the multipart/form-data upload via @koa/multer
        await upload.any()(ctx as any, () => Promise.resolve());

        const uploadedFiles: Array<{ fieldname: string; path: string }> =
            (ctx.request as any).files ?? [];

        if (!uploadedFiles.length)
            throw Object.assign(new Error('No files provided in FormData'), { status: 400 });

        // 4. Reconstruct files in a dedicated temp working directory,
        //    using the FormData field name as the relative path inside the repo
        const workDir = await fs.mkdtemp(join(tmpdir(), 'hop-git-upload-'));

        try {
            await Promise.all(
                uploadedFiles.map(async file => {
                    const rel = relative(workDir, resolve(workDir, file.fieldname));

                    if (!rel || rel.startsWith('..') || isAbsolute(rel))
                        throw Object.assign(
                            new Error(`Invalid file path: ${file.fieldname}`),
                            { status: 400 }
                        );

                    const destPath = resolve(workDir, rel);
                    const destDir = dirname(destPath);

                    if (destDir && destDir !== workDir)
                        await fs.mkdir(destDir, { recursive: true });

                    await fs.rename(file.path, destPath);
                })
            );

            // 5. Build clean HTTPS remote URL and provide credentials via Git's
            //    askpass protocol so the OAuth token is not exposed in argv.
            const domain = OAuthPlatformDomain[platform];
            const repoPath = noProtocolURL.replace(new RegExp(`^${domain}/`), '');
            const repoURL = `https://${domain}/${repoPath}`;
            const askPassPath = join(workDir, '.git-askpass.sh');
            await fs.writeFile(
                askPassPath,
                '#!/bin/sh\n' +
                    'case "$1" in\n' +
                    '  *Username*) printf "%s\\n" "$GIT_USERNAME" ;;\n' +
                    '  *Password*) printf "%s\\n" "$GIT_PASSWORD" ;;\n' +
                    '  *) printf "\\n" ;;\n' +
                    'esac\n',
                { mode: 0o700 }
            );

            // 6. Push via git-utility CLI: xgit upload <folder> <url> <branch>
            await execFileAsync('xgit', ['upload', workDir, repoURL, 'main'], {
                env: {
                    ...process.env,
                    GIT_ASKPASS: askPassPath,
                    GIT_TERMINAL_PROMPT: '0',
                    GIT_USERNAME: credential.username,
                    GIT_PASSWORD: credential.accessToken
                }
            });
        } finally {
            await fs.rm(workDir, { recursive: true, force: true });
            await Promise.allSettled(uploadedFiles.map(f => fs.rm(f.path, { force: true })));
        }
    }

    /**
     * Resolve which OAuthPlatform corresponds to the given no-protocol URL
     * by checking each platform's primary domain prefix (OAuthPlatformDomain).
     */
    private resolvePlatform(noProtocolURL: string): OAuthPlatform | null {
        for (const [platform, domain] of Object.entries(OAuthPlatformDomain) as [
            OAuthPlatform,
            string
        ][]) {
            if (noProtocolURL.startsWith(domain)) return platform;
        }
        return null;
    }
}
