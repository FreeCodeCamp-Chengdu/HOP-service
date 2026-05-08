import { IsString } from 'class-validator';

export class OAuthSignInData {
    @IsString()
    accessToken: string;
}

export interface CNBUser {
    login: string;
    email: string;
    avatar_url: string;
}
