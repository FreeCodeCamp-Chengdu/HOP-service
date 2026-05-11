import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';

export class OAuthSignInData {
    @IsString()
    accessToken: string;
}

export enum OAuthPlatform {
    GitHub = 'GitHub',
    GitLab = 'GitLab',
    CNB = 'CNB'
}

/**
 * Maps each OAuthPlatform to its primary Git hosting domain.
 * Used to derive credential lookups from a repository URL.
 */
export const OAuthPlatformDomain: Record<OAuthPlatform, string> = {
    [OAuthPlatform.GitHub]: 'github.com',
    [OAuthPlatform.GitLab]: 'gitlab.com',
    [OAuthPlatform.CNB]: 'cnb.cool'
};

@Entity()
export class OAuthCredential extends Base {
    @IsEnum(OAuthPlatform)
    @Column({ type: 'simple-enum', enum: OAuthPlatform })
    platform: OAuthPlatform;

    @IsString()
    @Column()
    accessToken: string;

    /**
     * The username on the third-party platform (e.g. GitHub login, CNB username).
     * Combined with accessToken to construct authenticated Git HTTP URLs:
     * https://<username>:<accessToken>@<domain>/<owner>/<repo>.git
     */
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    username?: string;

    @Type(() => User)
    @ValidateNested()
    @ManyToOne(() => User, user => user.oauthCredentials)
    user: User;
}

export type CNBUser = Record<'id' | 'username' | 'nickname' | 'email' | 'avatar', string>;

export interface CNBError {
    errcode: number;
    errmsg: string;
    errparam: object;
}
