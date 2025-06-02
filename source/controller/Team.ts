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
    BaseFilter,
    dataSource,
    Hackathon,
    Team,
    TeamListChunk,
    TeamMemberRole,
    TeamMemberStatus,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';
import { PlatformAdminController } from './PlatformAdmin';
import { TeamMemberController } from './TeamMember';

const store = dataSource.getRepository(Team),
    hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/team')
export class TeamController {
    static async ensureAdmin(userId: number, teamId: number) {
        if (
            !(await TeamMemberController.isAdmin(userId, teamId)) &&
            !(await PlatformAdminController.isAdmin(userId))
        )
            throw new ForbiddenError();
    }

    static async ensureMember(userId: number, teamId: number) {
        if (!(await TeamMemberController.isMember(userId, teamId)))
            throw new ForbiddenError();
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Team)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() team: Team
    ) {
        const hackathon = await hackathonStore.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureEnrolled(createdBy.id, name);

        const same = await store.findOneBy({
            hackathon: { name },
            displayName: team.displayName
        });

        if (same)
            throw new ForbiddenError(`Team ${team.displayName} already exists`);

        const saved = await store.save({ ...team, hackathon, createdBy });

        await ActivityLogController.logCreate(createdBy, 'Team', saved.id);

        await TeamMemberController.addOne({
            role: TeamMemberRole.Admin,
            user: createdBy,
            description: 'Team Creator',
            status: TeamMemberStatus.Approved,
            team: saved,
            hackathon,
            createdBy
        });
        return saved;
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Team)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() newData: Team
    ) {
        const old = await store.findOne({
            where: { id },
            relations: ['hackathon', 'createdBy']
        });
        if (!old) throw new NotFoundError();

        await TeamController.ensureMember(updatedBy.id, id);

        const saved = await store.save({ ...old, ...newData, updatedBy });

        await ActivityLogController.logUpdate(updatedBy, 'Team', old.id);

        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('id') id: number) {
        const team = await store.findOne({
            where: { id },
            relations: ['hackathon', 'createdBy']
        });
        if (!team) throw new NotFoundError();

        await TeamController.ensureAdmin(deletedBy.id, id);

        await store.save({ ...team, deletedBy });
        await store.softDelete(id);

        await ActivityLogController.logDelete(deletedBy, 'Team', team.id);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Team)
    getOne(@Param('id') id: number) {
        return store.findOneBy({ id });
    }

    @Get()
    @ResponseSchema(TeamListChunk)
    async getList(
        @Param('name') name: string,
        @QueryParams() { keywords, pageSize, pageIndex }: BaseFilter
    ) {
        const where = searchConditionOf<Team>(
            ['displayName', 'description'],
            keywords,
            { hackathon: { name } }
        );
        const [list, count] = await store.findAndCount({
            where,
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
