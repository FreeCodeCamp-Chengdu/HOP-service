import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
    Get,
    HttpCode,
    JsonController,
    OnNull,
    OnUndefined,
    Param,
    Post,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { BaseFilter, GitTemplate, GitTemplateListChunk, User } from '../model';
import { gitTemplateService, hackathonService } from '../service';
import { searchConditionOf } from '../utility';

@JsonController('/hackathon/:name/git-template')
export class GitTemplateController {
    service = gitTemplateService;

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(GitTemplate)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() { html_url }: GitTemplate
    ) {
        const hackathon = await hackathonService.ensureAdmin(createdBy.id, name);

        const repository = await gitTemplateService.getRepository(html_url);

        return this.service.createOne({ ...repository, hackathon }, createdBy);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        await hackathonService.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(id, deletedBy);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(GitTemplate)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id);
    }

    @Get()
    @ResponseSchema(GitTemplateListChunk)
    getList(@Param('name') name: string, @QueryParams() { keywords, ...filter }: BaseFilter) {
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
        return this.service.getList({ keywords, ...filter }, where);
    }
}
