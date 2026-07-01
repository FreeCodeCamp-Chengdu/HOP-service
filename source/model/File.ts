import { IsInt, IsString, IsUrl, Min } from 'class-validator';

export class SignedLink {
    @IsUrl()
    putLink: string;

    @IsUrl()
    getLink: string;
}

export class GitUploadResult {
    @IsUrl()
    repositoryUrl: string;

    @IsString()
    branch: string;

    @IsInt()
    @Min(0)
    fileCount: number;
}
