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
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';
import { HackathonController } from './Hackathon';
import { PlatformAdminController } from './PlatformAdmin';
import { TeamMemberController } from './TeamMember';

const hackathonStore = dataSource.getRepository(Hackathon),
    teamStore = dataSource.getRepository(Team);

@JsonController('/hackathon/:name/team')
export class TeamController {
    service = new UserServiceWithLog(Team, ['displayName', 'description']);

    static async ensureAdmin(userId: number, teamId: number) {
        if (
            !(await TeamMemberController.isAdmin(userId, teamId)) &&
            !(await PlatformAdminController.isAdmin(userId))
        )
            throw new ForbiddenError();
    }

    static async ensureMember(userId: number, teamId: number) {
        if (!(await TeamMemberController.isMember(userId, teamId))) throw new ForbiddenError();
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Team)
    async createOne(@CurrentUser() createdBy: User, @Param('name') name: string, @Body() team: Team) {
        const hackathon = await hackathonStore.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureEnrolled(createdBy.id, name);

        const same = await teamStore.findOneBy({
            hackathon: { name },
            displayName: team.displayName
        });

        if (same) throw new ForbiddenError(`Team ${team.displayName} already exists`);

        const saved = await this.service.createOne({ ...team, hackathon }, createdBy);

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
    async updateOne(@CurrentUser() updatedBy: User, @Param('id') id: number, @Body() newData: Team) {
        await TeamController.ensureMember(updatedBy.id, id);

        return this.service.editOne(id, newData, updatedBy);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('id') id: number) {
        await TeamController.ensureAdmin(deletedBy.id, id);

        await this.service.deleteOne(id, deletedBy);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Team)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id, ['createdBy', 'hackathon']);
    }

    @Get()
    @ResponseSchema(TeamListChunk)
    getList(@Param('name') name: string, @QueryParams() { keywords, ...filter }: BaseFilter) {
        const where = searchConditionOf<Team>(['displayName', 'description'], keywords, {
            hackathon: { name }
        });
        return this.service.getList(
            { keywords, ...filter },
            where,
            { order: { score: 'DESC', updatedAt: 'DESC' }, relations: ['createdBy', 'hackathon'] }
        );
    }
}
