import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
    Get,
    HttpCode,
    JsonController,
    NotFoundError,
    OnUndefined,
    Param,
    Post,
    Put,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    dataSource,
    Hackathon,
    Organizer,
    OrganizerFilter,
    OrganizerListChunk,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

@JsonController('/hackathon/:name/organizer')
export class OrganizerController {
    store = dataSource.getRepository(Organizer);
    hackathonStore = dataSource.getRepository(Hackathon);

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Organizer)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() organizer: Organizer
    ) {
        const hackathon = await this.hackathonStore.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(createdBy.id, name);

        const saved = await this.store.save({
            ...organizer,
            hackathon,
            createdBy
        });
        await ActivityLogController.logCreate(createdBy, 'Organizer', saved.id);

        return saved;
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Organizer)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() newData: Organizer
    ) {
        const old = await this.store.findOne({
            where: { id },
            relations: ['hackathon']
        });
        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        const saved = await this.store.save({ ...old, ...newData, updatedBy });

        await ActivityLogController.logUpdate(updatedBy, 'Organizer', old.id);

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
        const organizer = await this.store.findOne({
            where: { id },
            relations: ['hackathon']
        });
        if (!organizer) throw new NotFoundError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await this.store.save({ ...organizer, deletedBy });
        await this.store.softDelete(id);

        await ActivityLogController.logDelete(
            deletedBy,
            'Organizer',
            organizer.id
        );
    }

    @Get()
    @ResponseSchema(OrganizerListChunk)
    async getList(
        @Param('name') name: string,
        @QueryParams() { type, keywords, pageSize, pageIndex }: OrganizerFilter
    ) {
        const where = searchConditionOf<Organizer>(
            ['name', 'description', 'url'],
            keywords,
            { hackathon: { name }, ...(type && { type }) }
        );
        const [list, count] = await this.store.findAndCount({
            where,
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
