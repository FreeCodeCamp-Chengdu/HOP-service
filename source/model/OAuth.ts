import { IsEnum, IsString } from 'class-validator';
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

@Entity()
export class OAuthCredential extends Base {
    @IsEnum(OAuthPlatform)
    @Column({ type: 'simple-enum', enum: OAuthPlatform })
    platform: OAuthPlatform;

    @IsString()
    @Column()
    accessToken: string;

    @ManyToOne(() => User)
    user: User;
}

export type CNBUser = Record<'id' | 'username' | 'nickname' | 'email' | 'avatar', string>;

export interface CNBError {
    errcode: number;
    errmsg: string;
    errparam: object;
}

