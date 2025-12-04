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
    TeamWork,
    TeamWorkFilter,
    TeamWorkListChunk,
    TeamWorkType,
    User
} from '../model';
import { activityLogService } from '../service';
import { searchConditionOf } from '../utility';
import { GitTemplateController } from './GitTemplate';
import { TeamController } from './Team';

const store = dataSource.getRepository(TeamWork);

@JsonController('/hackathon/:name/team/:tid/work')
export class TeamWorkController {
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
        const team = await store.findOne({
            where: { id: tid },
            relations: ['hackathon']
        });
        if (!team) throw new NotFoundError();

        await TeamController.ensureMember(createdBy.id, tid);

        const gitRepository =
            work.type === TeamWorkType.Website &&
            work.url.startsWith('https://github.com/')
                ? await GitTemplateController.getRepository(work.url)
                : undefined;
        const saved = await store.save({
            ...work,
            gitRepository,
            team,
            hackathon: team.hackathon,
            createdBy
        });
        await activityLogService.logCreate(createdBy, 'TeamWork', saved.id);

        return saved;
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(TeamWork)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('id') id: number,
        @Body() work: TeamWork
    ) {
        const old = await store.findOne({
            where: { id },
            relations: ['team']
        });
        if (!old) throw new NotFoundError();

        await TeamController.ensureMember(updatedBy.id, old.team.id);

        const saved = await store.save({ ...old, ...work, updatedBy });

        await activityLogService.logUpdate(updatedBy, 'TeamWork', id);

        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('id') id: number) {
        const old = await store.findOne({
            where: { id },
            relations: ['team']
        });
        if (!old) throw new NotFoundError();

        await TeamController.ensureMember(deletedBy.id, old.team.id);

        await store.save({ ...old, deletedBy });
        await store.softDelete(id);

        await activityLogService.logDelete(deletedBy, 'TeamWork', id);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(TeamWork)
    getOne(@Param('id') id: number) {
        return store.findOneBy({ id });
    }

    async queryList(
        { keywords, pageSize, pageIndex }: BaseFilter,
        requiredCondition: FindOptionsWhere<TeamWork>
    ) {
        const where = searchConditionOf<TeamWork>(
            ['title', 'description', 'url', 'gitRepository'],
            keywords,
            requiredCondition
        );
        const [list, count] = await store.findAndCount({
            where,
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }

    @Get()
    @ResponseSchema(TeamWorkListChunk)
    getList(@QueryParams() { type, ...filter }: TeamWorkFilter) {
        return this.queryList(filter, { type });
    }
}
