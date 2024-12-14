import { Day, formatDate } from 'web-utility';

import {
    Award,
    Hackathon,
    HackathonStatus,
    Operation,
    StaffType
} from '../source/model';
import { HttpResponse, User } from './client';
import { client, GITHUB_PAT } from './shared';

var platformAdmin: User,
    hackathonCreator: User,
    testHackathon: Hackathon,
    teamLeader1: User;

describe('Main business logic', () => {
    it('should response 401 error with invalid token', async () => {
        try {
            await client.user.userControllerGetSession();
        } catch (error) {
            expect((error as HttpResponse<any>).status).toBe(401);
        }
    });

    it('should create the first Administator only by the first User', async () => {
        const platformAdminAccount = {
            email: 'admin@test.com',
            password: 'admin'
        };
        const { data: user1 } =
            await client.user.userControllerSignUp(platformAdminAccount);

        expect(user1.email).toBe(platformAdminAccount.email);
        expect(user1.roles).toEqual([0]);
        expect(user1.password).toBeUndefined();

        platformAdmin = { ...user1, ...platformAdminAccount };

        const hackathonCreatorAccount = {
            email: 'hackathon-creator@test.com',
            password: 'hackathon-creator'
        };
        const { data: user2 } = await client.user.userControllerSignUp(
            hackathonCreatorAccount
        );
        expect(user2.email).toBe(hackathonCreatorAccount.email);
        expect(user2.roles).toEqual([2]);
        expect(user2.password).toBeUndefined();

        hackathonCreator = { ...user2, ...hackathonCreatorAccount };
    });

    it('should sign in a User with Email & Password', async () => {
        const { data: session } = await client.user.userControllerSignIn({
            email: hackathonCreator.email,
            password: hackathonCreator.password
        });

        expect(session.email).toBe(hackathonCreator.email);
        expect(session.token).toStrictEqual(expect.any(String));

        hackathonCreator.token = session.token;
    });

    it('should get the profile of signed-in User with a valid token', async () => {
        const { data: session } = await client.user.userControllerGetSession({
            headers: { Authorization: `Bearer ${hackathonCreator.token}` }
        });
        const { password, token, deletedAt, ...user } = hackathonCreator;

        expect(session).toMatchObject(user);
    });

    it("should get a User's profile by its ID", async () => {
        const { data: user } = await client.user.userControllerGetOne(
            hackathonCreator.id
        );
        const { password, token, deletedAt, ...profile } = hackathonCreator;

        expect(user).toMatchObject(profile);
    });

    it('should edit the profile of signed-in User', async () => {
        const newProfile = { name: 'Hackathon Creator' };

        const { data: user } = await client.user.userControllerUpdateOne(
            hackathonCreator.id,
            newProfile,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(user.name).toBe(newProfile.name);
        expect(user.token).not.toBe(hackathonCreator.token);
        expect(user.updatedAt).toStrictEqual(expect.any(String));

        hackathonCreator = { ...hackathonCreator, ...user };
    });

    it('should record 2 activities of a signed-up & edited User', async () => {
        const UID = hackathonCreator.id;
        const activityLog = {
                id: expect.any(Number),
                tableName: 'User',
                recordId: UID,
                record: expect.any(Object),
                createdAt: expect.any(String),
                createdBy: expect.any(Object),
                updatedAt: expect.any(String)
            },
            { data } =
                await client.activityLog.activityLogControllerGetUserList(UID);

        expect(data).toMatchObject({
            count: 2,
            list: [
                { ...activityLog, operation: Operation.Create },
                { ...activityLog, operation: Operation.Update }
            ]
        });
    });

    it('should be able to search users by part of email or name', async () => {
        const { data: result_1 } = await client.user.userControllerGetList({
            keywords: platformAdmin.email
        });
        expect(result_1.count).toBe(1);
        expect(result_1.list[0].id).toBe(platformAdmin.id);

        const { data: result_2 } = await client.user.userControllerGetList({
            keywords: hackathonCreator.name
        });
        expect(result_2.count).toBe(1);
        expect(result_2.list[0].id).toBe(hackathonCreator.id);

        const { data: empty } = await client.user.userControllerGetList({
            keywords: 'empty'
        });
        expect(empty).toEqual({ count: 0, list: [] });
    });

    it('should create a new hackathon by every user', async () => {
        const eventStartedAt = formatDate(new Date(), 'YYYY-MM-DD'),
            eventEndedAt = formatDate(+new Date() + Day, 'YYYY-MM-DD'),
            hackathonMeta = {
                name: 'test-hackathon',
                displayName: 'Test Hackathon',
                ribbon: 'Test',
                tags: ['test'],
                summary: 'Test Hackathon',
                detail: '<h1>Test Hackathon</h1>',
                location: 'https://github.com/git-hacker',
                banners: [
                    {
                        name: 'banner',
                        description: 'banner image',
                        uri: 'https://github.com/git-hacker.png'
                    }
                ]
            };
        const { data: hackathon } =
            await client.hackathon.hackathonControllerCreateOne(
                {
                    ...hackathonMeta,
                    eventStartedAt,
                    eventEndedAt,
                    enrollmentStartedAt: eventStartedAt,
                    enrollmentEndedAt: eventEndedAt,
                    judgeStartedAt: eventStartedAt,
                    judgeEndedAt: eventEndedAt
                },
                {
                    headers: {
                        Authorization: `Bearer ${hackathonCreator.token}`
                    }
                }
            );
        expect(hackathon).toMatchObject({
            ...hackathonMeta,
            autoApprove: true,
            readOnly: false,
            status: HackathonStatus.Planning,
            id: expect.any(Number),
            createdAt: expect.any(String),
            createdBy: expect.any(Object),
            updatedAt: expect.any(String)
        });

        testHackathon = hackathon;
    });

    it('should auto set the creator as an admin of this hackathon', async () => {
        const { data: staffList } =
            await client.hackathon.staffControllerGetList(
                testHackathon.name,
                StaffType.Admin
            );
        expect(staffList).toMatchObject({
            count: 1,
            list: [
                {
                    id: expect.any(Number),
                    type: StaffType.Admin,
                    user: expect.any(Object),
                    description: 'Hackathon Creator',
                    hackathon: expect.any(Object),
                    createdAt: expect.any(String),
                    updatedAt: expect.any(String)
                }
            ]
        });
        expect(staffList.list[0].user.id).toBe(hackathonCreator.id);
        expect(staffList.list[0].hackathon.id).toBe(testHackathon.id);
    });

    it('should get the detail by a hackathon name', async () => {
        const { data } = await client.hackathon.hackathonControllerGetOne(
            testHackathon.name,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(data.id).toBe(testHackathon.id);
        expect(data.enrollment).toBe(0);
        expect(data.roles).toEqual({
            isAdmin: true,
            isJudge: false,
            isEnrolled: false
        });
        testHackathon = { ...testHackathon, ...data };
        delete testHackathon.roles;
    });

    it('should update partial information by the hackathon admin', async () => {
        testHackathon.tags = ['test', 'example'];
        testHackathon.detail += '<p>Example</p>';

        const { data } = await client.hackathon.hackathonControllerUpdateOne(
            testHackathon.name,
            testHackathon,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(data.detail).toBe(testHackathon.detail);
        expect(data.updatedAt).toStrictEqual(expect.any(String));
        expect(data.updatedBy.id).toBe(hackathonCreator.id);

        testHackathon = { ...testHackathon, ...data };
        delete testHackathon.updatedBy;
        delete testHackathon.deletedAt;
    });

    it('should get the list of hackathons', async () => {
        const { data: list1 } =
            await client.hackathon.hackathonControllerGetList();

        expect(list1).toEqual({ count: 1, list: [testHackathon] });

        const { data: list2 } =
            await client.hackathon.hackathonControllerGetList({
                createdBy: hackathonCreator.id
            });
        expect(list2).toEqual({ count: 1, list: [testHackathon] });
    });

    it('should search hackathons by keywords', async () => {
        const { data: list } =
            await client.hackathon.hackathonControllerGetList({
                keywords: 'example'
            });
        expect(list).toEqual({ count: 1, list: [testHackathon] });

        const { data: empty } =
            await client.hackathon.hackathonControllerGetList({
                keywords: 'none'
            });
        expect(empty).toEqual({ count: 0, list: [] });
    });

    it('should find hackathon by its creator', async () => {
        const { data } = await client.hackathon.hackathonControllerGetList({
            createdBy: hackathonCreator.id
        });
        expect(data).toEqual({ count: 1, list: [testHackathon] });
    });

    it('should sign up & in a new User with a GitHub token', async () => {
        const { status, data: session } =
            await client.user.oauthControllerSignInWithGithub({
                accessToken: GITHUB_PAT
            });
        expect(status).toBe(201);

        expect(session).toMatchObject({
            id: expect.any(Number),
            email: expect.any(String),
            name: expect.any(String),
            avatar: expect.any(String),
            password: null,
            token: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String)
        });

        const { deletedAt, password, token, ...user } = session;

        const { data } = await client.user.userControllerGetSession({
            headers: { Authorization: `Bearer ${token}` }
        });
        expect(data).toMatchObject(user);

        teamLeader1 = session;
    });

    it('should sign in & update an existed User with a GitHub token', async () => {
        const { data: list1 } = await client.user.userControllerGetList();

        await client.user.oauthControllerSignInWithGithub({
            accessToken: GITHUB_PAT
        });
        const { data: list2 } = await client.user.userControllerGetList();

        expect(list1.count).toBe(list2.count);
    });

    // Award API tests
    let testAward: Award;

    it('should create an award for the hackathon', async () => {
        const awardData = {
            name: 'Best Innovation Award',
            description: 'Award for the most innovative project',
            quantity: 1,
            target: 'team' as const,
            pictures: [
                {
                    name: 'award-image',
                    description: 'Award trophy image',
                    uri: 'https://example.com/award.png'
                }
            ]
        };

        const { data: award } = await client.award.awardControllerCreateOne(
            testHackathon.name,
            awardData,
            {
                headers: {
                    Authorization: `Bearer ${hackathonCreator.token}`
                }
            }
        );

        expect(award).toMatchObject({
            ...awardData,
            id: expect.any(Number),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            hackathon: expect.any(Object)
        });
        expect(award.hackathon.id).toBe(testHackathon.id);
    });

    it('should get an award by id', async () => {
        const { data: award } = await client.award.awardControllerGetOne(
            testHackathon.name,
            testAward.id
        );

        expect(award).toMatchObject({
            id: testAward.id,
            name: testAward.name,
            description: testAward.description,
            quantity: testAward.quantity,
            target: testAward.target,
            pictures: testAward.pictures
        });
    });

    it('should update an award', async () => {
        const updateData = {
            name: 'Updated Award Name',
            description: 'Updated award description',
            quantity: 2
        };

        const { data: award } = await client.award.awardControllerUpdateOne(
            testHackathon.name,
            testAward.id,
            updateData,
            {
                headers: {
                    Authorization: `Bearer ${hackathonCreator.token}`
                }
            }
        );

        expect(award).toMatchObject({
            ...testAward,
            ...updateData,
            updatedAt: expect.any(String)
        });

        expect(award.hackathon.id).toBe(testHackathon.id);
    });

    it('should delete an award', async () => {
        await client.award.awardControllerDeleteOne(
            testHackathon.name,
            testAward.id,
            {
                headers: {
                    Authorization: `Bearer ${hackathonCreator.token}`
                }
            }
        );

        try {
            await client.award.awardControllerGetOne(
                testHackathon.name,
                testAward.id
            );
            fail('Should have thrown a 404 error');
        } catch (error: any) {
            expect(error.status).toBe(404);
        }
    });

    it('should not allow unauthorized users to manage awards', async () => {
        try {
            await client.award.awardControllerCreateOne(testHackathon.name, {
                name: 'Unauthorized Award',
                description: 'Test award description',
                quantity: 1,
                target: 'team',
                pictures: []
            });
            fail('Should have thrown a 401 error');
        } catch (error: any) {
            expect(error.status).toBe(401);
        }
    });

    it('should delete a hackathon by its admin', async () => {
        const { name } = testHackathon;
        const { status, data } =
            await client.hackathon.hackathonControllerDeleteOne(name, {
                headers: { Authorization: `Bearer ${hackathonCreator.token}` }
            });
        expect(status).toBe(204);
        expect(data).toBeNull();

        try {
            await client.hackathon.hackathonControllerGetOne(name);
        } catch (error) {
            expect((error as HttpResponse<any>).status).toBe(404);
        }
        const { data: hackathonList } =
            await client.hackathon.hackathonControllerGetList();

        expect(hackathonList).toEqual({ count: 0, list: [] });
    });
});
