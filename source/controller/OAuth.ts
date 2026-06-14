import { githubClient, User as GitHubUser } from 'mobx-github';
import { parseLanguageHeader } from 'mobx-i18n';
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

import {
    CNBError,
    CNBUser,
    dataSource,
    OAuthCredential,
    OAuthPlatform,
    OAuthSignInData,
    User
} from '../model';
import { activityLogService, sessionService } from '../service';

@JsonController('/user/OAuth')
export class OauthController {
    userStore = sessionService.userStore;
    credentialStore = dataSource.getRepository(OAuthCredential);

    private async syncProfile(
        email: string,
        platform: OAuthPlatform,
        accessToken: string,
        profile: Partial<Pick<User, 'name' | 'avatar' | 'languages'>>,
        platformUsername?: string
    ) {
        const user =
            (await this.userStore.findOneBy({ email })) ||
            (await sessionService.signUp({ email, password: accessToken }));
        const { name, avatar, languages } = user;
        const oldProfile = { name, avatar, languages: languages?.length ? languages : [] };
        const newProfile = {
            ...profile,
            languages: profile.languages?.length ? profile.languages : []
        };

        if (!isDeepStrictEqual(oldProfile, newProfile)) {
            await this.userStore.save(Object.assign(user, newProfile));

            await activityLogService.logUpdate(user, 'User', user.id);
        }

        const existing = await this.credentialStore.findOneBy({
            platform,
            user: { id: user.id }
        });
        await this.credentialStore.save({
            ...existing,
            platform,
            accessToken,
            platformUsername,
            user
        });

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

        return this.syncProfile(
            email,
            OAuthPlatform.GitHub,
            accessToken,
            {
                name: login,
                avatar: avatar_url,
                languages: parseLanguageHeader(acceptLanguage ?? '')
            },
            login
        );
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
        if (!response.ok) {
            console.table((await response.json()) as CNBError);

            throw new HttpError(response.status, response.statusText);
        }

        const { username, nickname, email, avatar } = (await response.json()) as CNBUser;

        if (!username || !email)
            throw new UnprocessableEntityError(
                'CNB user info is missing required fields (username, email)'
            );
        return this.syncProfile(
            email,
            OAuthPlatform.CNB,
            accessToken,
            {
                name: nickname || username,
                avatar,
                languages: parseLanguageHeader(acceptLanguage ?? '')
            },
            username
        );
    }
}
