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

import { Announcement, AnnouncementListChunk, BaseFilter, dataSource, Hackathon, User } from '../model';
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';
import { HackathonController } from './Hackathon';

const hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/announcement')
export class AnnouncementController {
    service = new UserServiceWithLog(Announcement, ['title', 'content']);

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

        return this.service.createOne({ ...announcement, hackathon }, createdBy);
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
        await HackathonController.ensureAdmin(updatedBy.id, name);

        return this.service.editOne(id, newData, updatedBy);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        await HackathonController.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(id, deletedBy);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Announcement)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id);
    }

    @Get()
    @ResponseSchema(AnnouncementListChunk)
    getList(@Param('name') name: string, @QueryParams() { keywords, ...filter }: BaseFilter) {
        const where = searchConditionOf<Announcement>(['title', 'content'], keywords, {
            hackathon: { name }
        });
        return this.service.getList({ keywords, ...filter }, where);
    }
}
