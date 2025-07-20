import { Day, formatDate } from 'web-utility';

import { Award, Hackathon, HttpResponse, Score, Standard, Team, User } from './client';
import { client, GITHUB_PAT } from './shared';

const baseData = {
    id: expect.any(Number),
    createdAt: expect.any(String),
    updatedAt: expect.any(String)
};
let platformAdmin: User,
    hackathonCreator: User,
    testHackathon: Hackathon,
    teamLeader1: User,
    testAward: Award,
    testTeam: Team;

describe('Main business logic', () => {
    it('should response 401 error with invalid token', async () => {
        try {
            await client.user.userControllerGetSession();

            fail('it should have thrown a 403 error');
        } catch (error) {
            expect((error as HttpResponse<unknown>).status).toBe(401);
        }
    });

    it('should create the first Administator only by the first User', async () => {
        const platformAdminAccount = { email: 'admin@test.com', password: 'admin' };

        const { data: user1 } = await client.user.userControllerSignUp(platformAdminAccount);

        expect(user1.email).toBe(platformAdminAccount.email);
        expect(user1.roles).toEqual([0]);
        expect(user1.password).toBeUndefined();

        platformAdmin = { ...user1, ...platformAdminAccount };

        const hackathonCreatorAccount = {
            email: 'hackathon-creator@test.com',
            password: 'hackathon-creator'
        };
        const { data: user2 } = await client.user.userControllerSignUp(hackathonCreatorAccount);

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
        const { data: user } = await client.user.userControllerGetOne(hackathonCreator.id);

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
                ...baseData,
                tableName: 'User',
                recordId: UID,
                record: expect.any(Object)
            },
            { data } = await client.activityLog.activityLogControllerGetUserList(UID);

        expect(data).toMatchObject({
            count: 2,
            list: [
                { ...activityLog, operation: 'create' },
                { ...activityLog, operation: 'update' }
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
        const eventStartedAt = formatDate(Date.now() - Day, 'YYYY-MM-DD'),
            eventEndedAt = formatDate(Date.now() + Day, 'YYYY-MM-DD'),
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
        const { data: hackathon } = await client.hackathon.hackathonControllerCreateOne(
            {
                ...hackathonMeta,
                eventStartedAt,
                eventEndedAt,
                enrollmentStartedAt: eventStartedAt,
                enrollmentEndedAt: eventEndedAt,
                judgeStartedAt: eventStartedAt,
                judgeEndedAt: eventEndedAt
            },
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(hackathon).toMatchObject({
            ...baseData,
            ...hackathonMeta,
            autoApprove: true,
            readOnly: false,
            status: 'planning'
        });
        testHackathon = hackathon;
    });

    it('should auto set the creator as an admin of this hackathon', async () => {
        const { data: staffList } = await client.hackathon.staffControllerGetList(
            testHackathon.name,
            'admin'
        );
        expect(staffList).toMatchObject({
            count: 1,
            list: [
                {
                    ...baseData,
                    type: 'admin',
                    user: expect.any(Object),
                    description: 'Hackathon Creator',
                    hackathon: expect.any(Object)
                }
            ]
        });
        expect(staffList.list[0].user.id).toBe(hackathonCreator.id);
        expect(staffList.list[0].hackathon.id).toBe(testHackathon.id);
    });

    it('should get the detail by a hackathon name', async () => {
        const { data } = await client.hackathon.hackathonControllerGetOne(testHackathon.name, {
            headers: { Authorization: `Bearer ${hackathonCreator.token}` }
        });
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
        const { data: list1 } = await client.hackathon.hackathonControllerGetList();

        expect(list1).toEqual({ count: 1, list: [testHackathon] });

        const { data: list2 } = await client.hackathon.hackathonControllerGetList({
            createdBy: hackathonCreator.id
        });
        expect(list2).toEqual({ count: 1, list: [testHackathon] });
    });

    it('should search hackathons by keywords', async () => {
        const { data: list } = await client.hackathon.hackathonControllerGetList({
            keywords: 'example'
        });
        expect(list).toEqual({ count: 1, list: [testHackathon] });

        const { data: empty } = await client.hackathon.hackathonControllerGetList({
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
        const { status, data: session } = await client.user.oauthControllerSignInWithGithub({
            accessToken: GITHUB_PAT
        });
        expect(status).toBe(201);

        expect(session).toMatchObject({
            ...baseData,
            email: expect.any(String),
            name: expect.any(String),
            avatar: expect.any(String),
            password: null,
            token: expect.any(String)
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
        const { data: award } = await client.hackathon.awardControllerCreateOne(
            testHackathon.name,
            awardData,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        testAward = award;

        expect(award).toMatchObject({
            ...baseData,
            ...awardData,
            hackathon: expect.any(Object)
        });
        expect(award.hackathon.id).toBe(testHackathon.id);
    });

    it('should get an award by id', async () => {
        const { data: award } = await client.hackathon.awardControllerGetOne(
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

        const { data: award } = await client.hackathon.awardControllerUpdateOne(
            testHackathon.name,
            testAward.id,
            updateData,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(award).toMatchObject({
            ...updateData,
            updatedAt: expect.any(String)
        });
        expect(award.id).toBe(testAward.id);
    });

    it('should not allow unauthorized users to manage awards', async () => {
        try {
            await client.hackathon.awardControllerCreateOne(testHackathon.name, {
                name: 'Unauthorized Award',
                description: 'Test award description',
                quantity: 1,
                target: 'team' as const,
                pictures: []
            });
            fail('Should have thrown a 401 error');
        } catch (error) {
            expect((error as HttpResponse<unknown>).status).toBe(401);
        }
    });

    it('should add Standard dimensions to a hackathon', async () => {
        const standard: Standard = {
            dimensions: [
                {
                    name: 'Technical Difficulty',
                    description: 'The technical difficulty of the project',
                    maximumScore: 5
                },
                {
                    name: 'Creativity',
                    description: 'The creativity of the project',
                    maximumScore: 5
                },
                {
                    name: 'Code Quality',
                    description: 'The quality of the code',
                    maximumScore: 5
                }
            ]
        };
        const { data } = await client.hackathon.surveyControllerUpdateStandard(
            testHackathon.name,
            standard,
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(data).toMatchObject({
            ...baseData,
            hackathon: expect.any(Object),
            ...standard
        });
    });

    it('should enroll a user in the hackathon', async () => {
        const { data: enrollment } = await client.hackathon.enrollmentControllerCreateOne(
            testHackathon.name,
            { form: [] },
            { headers: { Authorization: `Bearer ${teamLeader1.token}` } }
        );
        expect(enrollment).toMatchObject({
            ...baseData,
            hackathon: expect.any(Object)
        });
        const { data: hackathon } = await client.hackathon.hackathonControllerGetOne(
            testHackathon.name
        );
        expect(hackathon.enrollment).toBe(1);
    });

    it('should create a hackathon team by a participant', async () => {
        const newTeam = {
            displayName: 'New Team',
            description: 'A new team for the hackathon'
        };
        const { data: team } = await client.hackathon.teamControllerCreateOne(
            testHackathon.name,
            newTeam,
            { headers: { Authorization: `Bearer ${teamLeader1.token}` } }
        );
        expect(team).toMatchObject({ ...baseData, ...newTeam });

        testTeam = team;
        delete testTeam.deletedAt;
    });

    it('should get the created team by its Hackathon Name & ID', async () => {
        const { data: team } = await client.hackathon.teamControllerGetOne(
            testHackathon.name,
            testTeam.id
        );
        expect(team).toMatchObject({
            ...baseData,
            ...testTeam,
            createdBy: expect.any(Object),
            hackathon: expect.any(Object)
        });
    });

    it('should update the team by its members', async () => {
        const updateData = {
            displayName: 'Updated Team Name',
            description: 'Updated team description'
        };
        const { data: team } = await client.hackathon.teamControllerUpdateOne(
            testHackathon.name,
            testTeam.id,
            updateData,
            { headers: { Authorization: `Bearer ${teamLeader1.token}` } }
        );
        expect(team).toMatchObject({
            ...baseData,
            ...updateData,
            updatedBy: expect.any(Object)
        });
    });

    it('should not allow unauthorized users to update a team', async () => {
        try {
            await client.hackathon.teamControllerUpdateOne(
                testHackathon.name,
                testTeam.id,
                { displayName: 'Unauthorized Update', description: 'This should not be allowed' },
                { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
            );
            fail('it should have thrown a 403 error');
        } catch (error) {
            expect((error as HttpResponse<unknown>).status).toBe(403);
        }
    });

    it('should get the list of teams in the hackathon', async () => {
        const { data: teamList } = await client.hackathon.teamControllerGetList(testHackathon.name);

        expect(teamList.count).toBe(1);
        expect(teamList.list[0].id).toBe(testTeam.id);
    });

    it('should allow anyone to evaluate the team', async () => {
        const scores1: Score[] = [
            { dimension: 'Technical Difficulty', score: 4 },
            { dimension: 'Creativity', score: 5 },
            { dimension: 'Code Quality', score: 4 }
        ];
        const { data: data1 } = await client.hackathon.evaluationControllerCreateOne(
            testHackathon.name,
            testTeam.id,
            { scores: scores1 },
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(data1).toMatchObject({
            ...baseData,
            hackathon: expect.any(Object),
            team: expect.any(Object),
            scores: scores1
        });

        const scores2: Score[] = [
            { dimension: 'Technical Difficulty', score: 5 },
            { dimension: 'Creativity', score: 4 },
            { dimension: 'Code Quality', score: 5 }
        ];
        const { data: data2 } = await client.hackathon.evaluationControllerCreateOne(
            testHackathon.name,
            testTeam.id,
            { scores: scores2 },
            { headers: { Authorization: `Bearer ${teamLeader1.token}` } }
        );
        expect(data2).toMatchObject({
            ...baseData,
            hackathon: expect.any(Object),
            team: expect.any(Object),
            scores: scores2
        });
    });

    it('should get the evaluations & final score of a team', async () => {
        const { data: evaluations } = await client.hackathon.evaluationControllerGetList(
            testHackathon.name,
            testTeam.id
        );
        expect(evaluations.count).toBe(2);
        expect(evaluations.list[0].scores).toHaveLength(3);
        expect(evaluations.list[1].scores).toHaveLength(3);

        const { data: team } = await client.hackathon.teamControllerGetOne(
            testHackathon.name,
            testTeam.id
        );
        expect(team.scores).toEqual([
            { dimension: 'Technical Difficulty', score: 4.5 },
            { dimension: 'Creativity', score: 4.5 },
            { dimension: 'Code Quality', score: 4.5 }
        ]);
        expect(team.score).toBe(13.5);
    });

    it('should assign an award to a team by hackathon staffs', async () => {
        const { data: assignment } = await client.hackathon.awardAssignmentControllerCreateOne(
            testHackathon.name,
            testAward.id,
            { team: testTeam },
            { headers: { Authorization: `Bearer ${hackathonCreator.token}` } }
        );
        expect(assignment.award.id).toBe(testAward.id);
        expect(assignment.team.id).toBe(testTeam.id);
    });

    it('should get the list of award assignments for a hackathon', async () => {
        const { data: awardAssignments } = await client.hackathon.awardAssignmentControllerGetList(
            testHackathon.name,
            testAward.id
        );
        expect(awardAssignments.count).toBe(1);
        expect(awardAssignments.list[0].award.id).toBe(testAward.id);
        expect(awardAssignments.list[0].team.id).toBe(testTeam.id);

        const { data: teamAssignments } =
            await client.hackathon.teamAwardAssignmentControllerGetList(
                testHackathon.name,
                testTeam.id
            );
        expect(teamAssignments.count).toBe(1);
        expect(teamAssignments.list[0].award.id).toBe(testAward.id);
        expect(teamAssignments.list[0].team.id).toBe(testTeam.id);
    });

    it('should delete a hackathon by its admin', async () => {
        const { name } = testHackathon;
        const { status, data } = await client.hackathon.hackathonControllerDeleteOne(name, {
            headers: { Authorization: `Bearer ${hackathonCreator.token}` }
        });
        expect(status).toBe(204);
        expect(data).toBeNull();

        try {
            await client.hackathon.hackathonControllerGetOne(name);

            fail('it should have thrown a 403 error');
        } catch (error) {
            expect((error as HttpResponse<unknown>).status).toBe(404);
        }
        const { data: hackathonList } = await client.hackathon.hackathonControllerGetList();

        expect(hackathonList).toEqual({ count: 0, list: [] });
    });
});
