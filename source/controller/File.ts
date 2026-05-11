import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from '@koa/multer';
import {
    Authorized,
    BadRequestError,
    Controller,
    Ctx,
    CurrentUser,
    Delete,
    ForbiddenError,
    HttpCode,
    InternalServerError,
    OnUndefined,
    Param,
    Post,
    Put,
    QueryParam,
    UnprocessableEntityError,
    UseBefore
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';
import { $, fs, os, path } from 'zx';

import {
    MAX_ERROR_LINES,
    normalizeRelativePath,
    resolveSafePath,
    sanitizeGitError
} from '../gitUploadUtility';
import { dataSource, OAuthCredential, resolveOAuthPlatformByHost, SignedLink, User } from '../model';
import { AWS_S3_BUCKET, AWS_S3_PUBLIC_HOST, s3Client } from '../utility';

const uploadMiddleware = multer({ dest: os.tmpdir() });

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

    @Put('/Git/:noProtocolURL(.*)')
    @Authorized()
    @HttpCode(201)
    @UseBefore(uploadMiddleware.any())
    async uploadFilesToGit(
        @Ctx() { req }: { req: { files?: Express.Multer.File[] } },
        @CurrentUser() user: User,
        @Param('noProtocolURL') noProtocolURL: string,
        @QueryParam('branch') branch = 'main',
        @QueryParam('folder') folder?: string
    ) {
        const { files } = req;

        if (!files?.length) throw new BadRequestError('No files uploaded');

        let repositoryURL: URL;
        try {
            repositoryURL = new URL(`https://${noProtocolURL}`);
        } catch {
            throw new UnprocessableEntityError('Invalid Git repository URL');
        }

        const platform = resolveOAuthPlatformByHost(repositoryURL.hostname);

        if (!platform)
            throw new UnprocessableEntityError(
                `Unsupported Git platform: ${repositoryURL.hostname}`
            );

        const credential = await this.credentialStore.findOneBy({
            platform,
            user: { id: user.id }
        });

        if (!credential) throw new ForbiddenError(`Missing ${platform} OAuth credential`);
        if (!branch.trim()) throw new UnprocessableEntityError('Branch is required');

        repositoryURL.username = credential.username;
        repositoryURL.password = credential.accessToken;

        const targetFolder = folder ? normalizeRelativePath(folder) : undefined;
        const tempRoot = await fs.mkdtemp(path.resolve(os.tmpdir(), 'hop-git-upload-'));
        const pendingUploadedPaths = new Set(files.map(({ path }) => path));
        const originalVerbose = Boolean($.verbose);

        try {
            $.verbose = true;
            for (const file of files) {
                const filePath = resolveSafePath(tempRoot, file.fieldname);

                await fs.mkdirp(path.dirname(filePath));
                await fs.move(file.path, filePath, { overwrite: true });
                pendingUploadedPaths.delete(file.path);
            }
            if (targetFolder)
                await $`npx xgit upload ${tempRoot} ${repositoryURL} ${branch} ${targetFolder}`;
            else
                await $`npx xgit upload ${tempRoot} ${repositoryURL} ${branch}`;
        } catch (error) {
            const detail = sanitizeGitError(
                error instanceof Error
                    ? `${error.message}\n${(error as { stderr?: string }).stderr ?? ''}`
                    : String(error),
                credential.accessToken
            );
            const reason = detail.split('\n').slice(0, MAX_ERROR_LINES).join(' | ');

            console.error('Git upload failed:', detail);

            throw new InternalServerError(`Git upload failed: ${reason}`);
        } finally {
            $.verbose = originalVerbose;
            await Promise.all([...pendingUploadedPaths].map(uploadPath => fs.remove(uploadPath)));
            await fs.remove(tempRoot);
        }
    }
}
