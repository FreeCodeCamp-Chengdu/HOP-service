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

import { dataSource, Hackathon, Organizer, OrganizerFilter, OrganizerListChunk, User } from '../model';
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';
import { HackathonController } from './Hackathon';

@JsonController('/hackathon/:name/organizer')
export class OrganizerController {
    service = new UserServiceWithLog(Organizer, ['name', 'description', 'url']);
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

        return this.service.createOne({ ...organizer, hackathon }, createdBy);
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

    @Get()
    @ResponseSchema(OrganizerListChunk)
    getList(@Param('name') name: string, @QueryParams() { type, keywords, ...filter }: OrganizerFilter) {
        const where = searchConditionOf<Organizer>(['name', 'description', 'url'], keywords, {
            hackathon: { name },
            ...(type && { type })
        });
        return this.service.getList({ keywords, ...filter }, where);
    }
}
