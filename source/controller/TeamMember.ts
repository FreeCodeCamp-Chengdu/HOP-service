import { isNotEmptyObject } from 'class-validator';
import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
    ForbiddenError,
    Get,
    HttpCode,
    JsonController,
    NotFoundError,
    OnNull,
    OnUndefined,
    Param,
    Post,
    Put,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    Base,
    dataSource,
    Team,
    TeamMember,
    TeamMemberFilter,
    TeamMemberListChunk,
    TeamMemberRole,
    TeamMemberStatus,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';
import { TeamController } from './Team';

const store = dataSource.getRepository(TeamMember),
    userStore = dataSource.getRepository(User),
    teamStore = dataSource.getRepository(Team);

@JsonController('/hackathon/:name/team/:id/member')
export class TeamMemberController {
    static isAdmin = (userId: number, teamId: number) =>
        store.existsBy({
            team: { id: teamId },
            user: { id: userId },
            role: TeamMemberRole.Admin
        });

    static isMember = (userId: number, teamId: number) =>
        store.existsBy({ user: { id: userId }, team: { id: teamId } });

    static async addOne(member: Omit<TeamMember, keyof Base>) {
        const saved = await store.save({
            status: member.team.autoApprove
                ? TeamMemberStatus.Approved
                : TeamMemberStatus.PendingApproval,
            ...member
        });
        await ActivityLogController.logCreate(member.createdBy, 'TeamMember', saved.id);

        return saved;
    }

    @Put('/:uid')
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(TeamMember)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('id') id: number,
        @Param('uid') uid: number,
        @Body() { role, description, status }: TeamMember
    ) {
        const [user, team] = await Promise.all([
            userStore.findOneBy({ id: uid }),
            teamStore.findOne({ where: { id }, relations: ['hackathon'] })
        ]);
        if (!user || !team) throw new NotFoundError();

        if (createdBy.id === uid) throw new ForbiddenError();

        await TeamController.ensureMember(createdBy.id, id);

        return TeamMemberController.addOne({
            role,
            user,
            description,
            status,
            team,
            hackathon: team.hackathon,
            createdBy
        });
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(TeamMember)
    async joinOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() { description }: TeamMember
    ) {
        const team = await teamStore.findOne({
            where: { id },
            relations: ['hackathon']
        });
        if (!team) throw new NotFoundError();

        await HackathonController.ensureEnrolled(createdBy.id, name);

        return TeamMemberController.addOne({
            user: createdBy,
            description,
            team,
            hackathon: team.hackathon,
            createdBy
        });
    }

    @Put('/:uid')
    @Authorized()
    @ResponseSchema(TeamMember)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('id') id: number,
        @Param('uid') uid: number,
        @Body() { role, description, status }: TeamMember
    ) {
        const member = await store.findOneBy({
            team: { id },
            user: { id: uid }
        });
        if (!member) throw new NotFoundError();

        const authorization = { role, status };

        if (isNotEmptyObject(authorization)) {
            if (updatedBy.id === uid) throw new ForbiddenError();

            await TeamController.ensureAdmin(updatedBy.id, id);
        } else await TeamController.ensureMember(updatedBy.id, id);

        const saved = await store.save({
            ...member,
            ...authorization,
            description,
            updatedBy
        });
        await ActivityLogController.logUpdate(updatedBy, 'TeamMember', saved.id);

        return saved;
    }

    @Delete('/:uid')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('id') id: number,
        @Param('uid') uid: number
    ) {
        const member = await store.findOneBy({
            team: { id },
            user: { id: uid }
        });
        if (!member) throw new NotFoundError();

        if (deletedBy.id === uid) throw new ForbiddenError();

        await TeamController.ensureMember(deletedBy.id, id);

        await store.save({ ...member, deletedBy });
        await store.softDelete(member.id);

        await ActivityLogController.logDelete(deletedBy, 'TeamMember', member.id);
    }

    @Delete()
    @Authorized()
    @OnUndefined(204)
    async leaveOne(@CurrentUser() deletedBy: User, @Param('id') id: number) {
        const member = await store.findOneBy({
            team: { id },
            user: { id: deletedBy.id }
        });
        if (!member) throw new ForbiddenError();

        await store.save({ ...member, deletedBy });
        await store.softDelete(member.id);

        await ActivityLogController.logDelete(deletedBy, 'TeamMember', member.id);
    }

    @Get('/:uid')
    @OnNull(404)
    @ResponseSchema(TeamMember)
    getOne(@Param('id') id: number, @Param('uid') uid: number) {
        return store.findOne({
            where: { team: { id }, user: { id: uid } },
            relations: ['user']
        });
    }

    @Get()
    @ResponseSchema(TeamMemberListChunk)
    async getList(
        @Param('id') id: number,
        @QueryParams()
        { role, status, keywords, pageSize, pageIndex }: TeamMemberFilter
    ) {
        const where = searchConditionOf<TeamMember>(['description'], keywords, {
            team: { id },
            role,
            status
        });
        const [list, count] = await store.findAndCount({
            where,
            relations: ['user'],
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
