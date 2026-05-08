import { IsString } from 'class-validator';

export class OAuthSignInData {
    @IsString()
    accessToken: string;
}

export interface CNBUser {
    id: string;
    username: string;
    nickname: string;
    email: string;
    avatar: string;
}
