import { githubClient } from 'mobx-github';

import { OauthController } from '../source/controller/OAuth';
import { OAuthPlatform } from '../source/model';
import { activityLogService, sessionService } from '../source/service';

type OauthControllerDouble = Omit<OauthController, 'userStore' | 'credentialStore'> & {
    userStore: {
        findOneBy: jest.Mock;
        save: jest.Mock;
    };
    credentialStore: {
        findOneBy: jest.Mock;
        save: jest.Mock;
    };
};

describe('OauthController', () => {
    afterEach(() => jest.restoreAllMocks());

    it('stores GitHub login as OAuth credential userName', async () => {
        const controller = new OauthController() as unknown as OauthControllerDouble;

        controller.userStore = {
            findOneBy: jest.fn().mockResolvedValue(null),
            save: jest.fn()
        };
        controller.credentialStore = {
            findOneBy: jest.fn().mockResolvedValue(null),
            save: jest.fn()
        };

        jest.spyOn(githubClient, 'get').mockResolvedValue({
            body: {
                email: 'alice@example.com',
                login: 'alice',
                avatar_url: 'https://avatars.example.com/alice'
            }
        } as never);
        jest.spyOn(sessionService, 'signUp').mockResolvedValue({
            id: 7,
            email: 'alice@example.com',
            name: 'alice',
            avatar: 'https://avatars.example.com/alice',
            languages: ['en'],
            roles: [2]
        } as never);
        jest.spyOn(sessionService, 'sign').mockImplementation(user => user as never);
        jest.spyOn(activityLogService, 'logUpdate').mockResolvedValue({} as never);

        await controller.signInWithGithub({ accessToken: 'secret-token' }, 'en');

        expect(controller.credentialStore.save).toHaveBeenCalledWith(
            expect.objectContaining({
                platform: OAuthPlatform.GitHub,
                userName: 'alice',
                accessToken: 'secret-token',
                user: expect.objectContaining({ id: 7 })
            })
        );
    });
});
