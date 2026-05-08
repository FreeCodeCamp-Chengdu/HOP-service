import { githubClient, User as GitHubUser } from 'mobx-github';
import { Body, HttpCode, HttpError, JsonController, Post } from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';
import { isDeepStrictEqual } from 'util';

import { CNBUser, OAuthSignInData, User } from '../model';
import { activityLogService, sessionService } from '../service';

@JsonController('/user/OAuth')
export class OauthController {
    userStore = sessionService.userStore;

    @Post('/GitHub')
    @HttpCode(201)
    @ResponseSchema(User)
    async signInWithGithub(@Body() { accessToken }: OAuthSignInData) {
        const { body } = await githubClient.get<GitHubUser>('user', {
            Authorization: `Bearer ${accessToken}`
        });
        const { email, login, avatar_url } = body!;
        const user =
            (await this.userStore.findOneBy({ email })) ||
            (await sessionService.signUp({ email, password: accessToken }));
        const newProfile = { name: login, avatar: avatar_url },
            oldPofile = { name: user.name, avatar: user.avatar };

        if (!isDeepStrictEqual(oldPofile, newProfile)) {
            await this.userStore.save(Object.assign(user, newProfile));

            await activityLogService.logUpdate(user, 'User', user.id);
        }
        return sessionService.sign(user);
    }

    @Post('/CNB')
    @HttpCode(201)
    @ResponseSchema(User)
    async signInWithCNB(@Body() { accessToken }: OAuthSignInData) {
        const response = await fetch('https://api.cnb.cool/user', {
            headers: {
                Accept: 'application/vnd.cnb.api+json',
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (!response.ok) throw new HttpError(response.status, response.statusText);

        const { username, nickname, email, avatar } = (await response.json()) as CNBUser;

        if (!username || !email)
            throw new HttpError(422, 'CNB user info is missing required fields (username, email)');

        const user =
            (await this.userStore.findOneBy({ email })) ||
            (await sessionService.signUp({ email, password: accessToken }));
        const newProfile = { name: nickname || username, avatar },
            oldProfile = { name: user.name, avatar: user.avatar };

        if (!isDeepStrictEqual(oldProfile, newProfile)) {
            await this.userStore.save(Object.assign(user, newProfile));

            await activityLogService.logUpdate(user, 'User', user.id);
        }
        return sessionService.sign(user);
    }
}
