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
 * 平台名到主域名的映射
 * 用于自动根据上传 URL 获取相应鉴权凭据
 */
export const platformDomainMap: Record<OAuthPlatform, string> = {
    [OAuthPlatform.GitHub]: 'github.com',
    [OAuthPlatform.GitLab]: 'gitlab.com',
    [OAuthPlatform.CNB]: 'cnb.cool'
};

/**
 * 根据 URL 自动匹配对应的 OAuth 平台
 */
export const detectPlatformFromURL = (url: string): OAuthPlatform | null => {
    const entry = Object.entries(platformDomainMap).find(([, domain]) => url.includes(domain));
    return entry ? (entry[0] as OAuthPlatform) : null;
};

/**
 * 拼接带鉴权的 Git 仓库 HTTP URL
 */
export const buildAuthenticatedGitURL = (
    platform: OAuthPlatform,
    username: string,
    accessToken: string,
    repoHostPath: string
): string => {
    const domain = platformDomainMap[platform];
    return `https://${username}:${accessToken}@${domain}/${repoHostPath}`;
};

@Entity()
export class OAuthCredential extends Base {
    @IsEnum(OAuthPlatform)
    @Column({ type: 'simple-enum', enum: OAuthPlatform })
    platform: OAuthPlatform;

    @IsString()
    @Column()
    accessToken: string;

    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    platformUsername?: string;

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
