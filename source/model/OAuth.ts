import { IsString } from 'class-validator';

export class OAuthSignInData {
    @IsString()
    accessToken: string;
}

export type CNBUser = Record<'id' | 'username' | 'nickname' | 'email' | 'avatar', string>;

export interface CNBError {
    errcode: number;
    errmsg: string;
    errparam: object;
}
