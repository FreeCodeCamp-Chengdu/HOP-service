import { RepositoryModel } from 'mobx-github';
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
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    BaseFilter,
    dataSource,
    GitTemplate,
    GitTemplateListChunk,
    Hackathon,
    HackathonBase,
    User
} from '../model';
import { activityLogService } from '../service';
import { searchConditionOf } from '../utility';
import { HackathonController } from './Hackathon';

const store = dataSource.getRepository(GitTemplate),
    hackathonStore = dataSource.getRepository(Hackathon);
const repositoryStore = new RepositoryModel();

@JsonController('/hackathon/:name/git-template')
export class GitTemplateController {
    static async getRepository(
        URI: string
    ): Promise<Omit<GitTemplate, keyof HackathonBase>> {
        const path = URI.replace(
            new RegExp(String.raw`^https://github.com/`),
            'repos'
        );
        const repository = await repositoryStore.getOne(path, ['languages']);

        const { name, full_name, html_url, default_branch } = repository,
            { languages, topics, description, homepage } = repository;
        return {
            ...{ name, full_name, html_url, default_branch },
            ...{ languages, topics, description, homepage }
        };
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(GitTemplate)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() { html_url }: GitTemplate
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(createdBy.id, name);

        const repository = await GitTemplateController.getRepository(html_url);

        const saved = await store.save({ ...repository, hackathon, createdBy });

        await activityLogService.logCreate(createdBy, 'GitTemplate', saved.id);
        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        const gitTemplate = await store.findOneBy({ id });

        if (!gitTemplate) throw new NotFoundError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await store.save({ ...gitTemplate, deletedBy });
        await store.softDelete(id);

        await activityLogService.logDelete(deletedBy, 'GitTemplate', id);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(GitTemplate)
    getOne(@Param('id') id: number) {
        return store.findOneBy({ id });
    }

    @Get()
    @ResponseSchema(GitTemplateListChunk)
    async getList(
        @Param('name') name: string,
        @QueryParams()
        { keywords, pageSize, pageIndex }: BaseFilter
    ) {
        const where = searchConditionOf<GitTemplate>(
            [
                'name',
                'full_name',
                'html_url',
                'default_branch',
                'languages',
                'topics',
                'description',
                'homepage'
            ],
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
