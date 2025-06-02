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

import {
    Announcement,
    AnnouncementListChunk,
    BaseFilter,
    dataSource,
    Hackathon,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

const store = dataSource.getRepository(Announcement),
    hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/announcement')
export class AnnouncementController {
    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Announcement)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() announcement: Announcement
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(createdBy.id, name);

        const saved = await store.save({
            ...announcement,
            hackathon,
            createdBy
        });
        await ActivityLogController.logCreate(
            createdBy,
            'Announcement',
            saved.id
        );
        return saved;
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Announcement)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() newData: Announcement
    ) {
        const old = await store.findOneBy({ id });

        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        const saved = await store.save({ ...old, ...newData, updatedBy });

        await ActivityLogController.logUpdate(updatedBy, 'Announcement', id);

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
        const old = await store.findOne({
            where: { id },
            relations: ['hackathon']
        });
        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await store.save({ ...old, deletedBy });
        await store.softDelete(id);

        await ActivityLogController.logDelete(deletedBy, 'Announcement', id);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Announcement)
    getOne(@Param('id') id: number) {
        return store.findOneBy({ id });
    }

    @Get()
    @ResponseSchema(AnnouncementListChunk)
    async getList(
        @Param('name') name: string,
        @QueryParams() { keywords, pageSize, pageIndex }: BaseFilter
    ) {
        const where = searchConditionOf<Announcement>(
            ['title', 'content'],
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
