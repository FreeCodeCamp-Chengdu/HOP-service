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
    Put
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { Award, dataSource, Hackathon, User } from '../model';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

@JsonController('/hackathon/:name/award')
export class AwardController {
    store = dataSource.getRepository(Award);
    hackathonStore = dataSource.getRepository(Hackathon);

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Award)
    async createOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Body() award: Award
    ) {
        const hackathon = await this.hackathonStore.findOneBy({ name });

        if (!hackathon)
            throw new NotFoundError(`Hackathon ${name} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        const saved = await this.store.save({ ...award, hackathon });

        await ActivityLogController.logCreate(currentUser, 'Award', saved.id);

        return saved;
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Award)
    getOne(@Param('id') id: number) {
        return this.store.findOneBy({ id });
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Award)
    async updateOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() updateData: Award
    ) {
        const award = await this.store.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award ${id} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        // update only allowed fields
        const updatedAward = {
            ...award,
            ...updateData,
            id, // make sure id is not overridden
            hackathon: award.hackathon // make sure hackathon relationship is not changed
        };
        const saved = await this.store.save(updatedAward);

        await ActivityLogController.logUpdate(currentUser, 'Award', saved.id);

        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        const award = await this.store.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award ${id} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        await this.store.softDelete(award.id);

        await ActivityLogController.logDelete(currentUser, 'Award', award.id);
    }
}
