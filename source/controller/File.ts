import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from '@koa/multer';
import { rm } from 'fs/promises';
import { resolve } from 'path';
import {
    Authorized,
    BadRequestError,
    Controller,
    CurrentUser,
    Delete,
    HttpCode,
    OnUndefined,
    Param,
    Post,
    Put,
    Req,
    UseBefore
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { GitUploadResult, SignedLink, User } from '../model';
import { gitFileService, IncomingGitFile } from '../service';
import { AWS_S3_BUCKET, AWS_S3_PUBLIC_HOST, s3Client } from '../utility';

const gitUploadMiddleware = multer({
    dest: resolve(process.env.TEMP || process.env.TMP || '.', 'hop-service-upload')
});

@Controller('/file')
export class FileController {
    gitFileService = gitFileService;

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

    @Put('/Git/:noProtocolURL(.*)')
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(GitUploadResult)
    @UseBefore(gitUploadMiddleware.any())
    async uploadGitFiles(
        @CurrentUser() { id }: User,
        @Param('noProtocolURL') noProtocolURL: string,
        @Req() request: { files?: IncomingGitFile[] }
    ) {
        const files = Array.isArray(request.files)
            ? request.files.map(({ fieldname, path }) => ({ fieldname, path }))
            : [];

        if (!files.length) throw new BadRequestError('No file uploaded');

        try {
            return await this.gitFileService.uploadFilesToRepository(id, noProtocolURL, files);
        } finally {
            await Promise.all(files.map(({ path }) => rm(path, { force: true })));
        }
    }
}
