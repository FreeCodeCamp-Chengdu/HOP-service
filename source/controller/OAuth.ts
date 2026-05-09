import { githubClient, User as GitHubUser } from 'mobx-github';
import {
    Body,
    HeaderParam,
    HttpCode,
    HttpError,
    JsonController,
    Post,
    UnprocessableEntityError
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';
import { isDeepStrictEqual } from 'util';

import { AccountOrigin, CNBUser, OAuthSignInData, User } from '../model';
import { activityLogService, sessionService } from '../service';
import { parseAcceptLanguage } from '../utility';

@JsonController('/user/OAuth')
export class OauthController {
    userStore = sessionService.userStore;

    private async syncProfile(
        email: string,
        password: string,
        profile: Partial<Pick<User, 'name' | 'avatar' | 'accountOrigin' | 'languages'>>
    ) {
        const user =
            (await this.userStore.findOneBy({ email })) ||
            (await sessionService.signUp({ email, password }));
        const { name, avatar, accountOrigin, languages } = user;
        const oldProfile = { name, avatar, accountOrigin, languages };

        if (!isDeepStrictEqual(oldProfile, profile)) {
            await this.userStore.save(Object.assign(user, profile));

            await activityLogService.logUpdate(user, 'User', user.id);
        }
        return sessionService.sign(user);
    }

    @Post('/GitHub')
    @HttpCode(201)
    @ResponseSchema(User)
    async signInWithGithub(
        @Body() { accessToken }: OAuthSignInData,
        @HeaderParam('accept-language') acceptLanguage: string
    ) {
        const { body } = await githubClient.get<GitHubUser>('user', {
            Authorization: `Bearer ${accessToken}`
        });
        const { email, login, avatar_url } = body!;

        return this.syncProfile(email, accessToken, {
            name: login,
            avatar: avatar_url,
            accountOrigin: AccountOrigin.GitHub,
            languages: parseAcceptLanguage(acceptLanguage)
        });
    }

    @Post('/CNB')
    @HttpCode(201)
    @ResponseSchema(User)
    async signInWithCNB(
        @Body() { accessToken }: OAuthSignInData,
        @HeaderParam('accept-language') acceptLanguage: string
    ) {
        const response = await fetch('https://api.cnb.cool/user', {
            headers: {
                Accept: 'application/vnd.cnb.api+json',
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!response.ok) throw new HttpError(response.status, response.statusText);

        const { username, nickname, email, avatar } = (await response.json()) as CNBUser;

        if (!username || !email)
            throw new UnprocessableEntityError(
                'CNB user info is missing required fields (username, email)'
            );
        return this.syncProfile(email, accessToken, {
            name: nickname || username,
            avatar,
            accountOrigin: AccountOrigin.CNB,
            languages: parseAcceptLanguage(acceptLanguage)
        });
    }
}
