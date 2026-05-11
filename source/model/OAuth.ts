import { Type } from 'class-transformer';
import { IsEnum, IsString, ValidateNested } from 'class-validator';
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

export const OAuthPlatformHostMap: Record<OAuthPlatform, string> = {
    [OAuthPlatform.GitHub]: 'github.com',
    [OAuthPlatform.GitLab]: 'gitlab.com',
    [OAuthPlatform.CNB]: 'cnb.cool'
};

export const resolveOAuthPlatformByHost = (host: string) =>
    (Object.entries(OAuthPlatformHostMap).find(
        ([, domain]) => host === domain || host.endsWith(`.${domain}`)
    )?.[0] as OAuthPlatform | undefined);

@Entity()
export class OAuthCredential extends Base {
    @IsEnum(OAuthPlatform)
    @Column({ type: 'simple-enum', enum: OAuthPlatform })
    platform: OAuthPlatform;

    @IsString()
    @Column()
    accessToken: string;

    @IsString()
    @Column()
    username: string;

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
