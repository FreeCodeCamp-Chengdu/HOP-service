import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
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
import { FindOptionsWhere, IsNull, Not } from 'typeorm';

import {
    BaseFilter,
    dataSource,
    Team,
    TeamWork,
    TeamWorkFilter,
    TeamWorkListChunk,
    TeamWorkType,
    User
} from '../model';
import { gitTemplateService, teamService, UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';

const teamStore = dataSource.getRepository(Team);

@JsonController('/hackathon/:name/team/:tid/work')
export class TeamWorkController {
    service = new UserServiceWithLog(TeamWork, ['title', 'description', 'url', 'gitRepository']);

    @Get('/git-repository')
    @ResponseSchema(TeamWorkListChunk)
    getGitList(@QueryParams() filter: BaseFilter) {
        return this.queryList(filter, { gitRepository: Not(IsNull()) });
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(TeamWork)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('tid') tid: number,
        @Body() work: TeamWork
    ) {
        const team = await teamStore.findOne({
            where: { id: tid },
            relations: ['hackathon']
        });
        if (!team) throw new NotFoundError();

        await teamService.ensureMember(createdBy.id, tid);

        const gitRepository =
            work.type === TeamWorkType.Website && work.url.startsWith('https://github.com/')
                ? await gitTemplateService.getRepository(work.url)
                : undefined;

        return this.service.createOne(
            {
                ...work,
                gitRepository: gitRepository as TeamWork['gitRepository'],
                team,
                hackathon: team.hackathon
            },
            createdBy
        );
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(TeamWork)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('id') id: number,
        @Body() work: TeamWork
    ) {
        const old = await this.service.getOne(id, ['team']);
        if (!old) throw new NotFoundError();

        await teamService.ensureMember(updatedBy.id, old.team.id);

        return this.service.editOne(id, work, updatedBy);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('id') id: number) {
        const old = await this.service.getOne(id, ['team']);
        if (!old) throw new NotFoundError();

        await teamService.ensureMember(deletedBy.id, old.team.id);

        await this.service.deleteOne(id, deletedBy);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(TeamWork)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id);
    }

    queryList({ keywords, ...filter }: BaseFilter, requiredCondition: FindOptionsWhere<TeamWork>) {
        const where = searchConditionOf<TeamWork>(
            ['title', 'description', 'url', 'gitRepository'],
            keywords,
            requiredCondition
        );
        return this.service.getList({ keywords, ...filter }, where);
    }

    @Get()
    @ResponseSchema(TeamWorkListChunk)
    getList(@QueryParams() { type, ...filter }: TeamWorkFilter) {
        return this.queryList(filter, { type });
    }
}
