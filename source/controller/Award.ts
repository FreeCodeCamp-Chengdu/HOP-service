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
    Patch,
    Post
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    Award,
    AwardTarget,
    dataSource,
    Hackathon,
    Media,
    User} from '../model';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

@JsonController('/hackathon/:hackathonName/award')
export class AwardController {
    store = dataSource.getRepository(Award);
    hackathonStore = dataSource.getRepository(Hackathon);

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Award)
    async createOne(
        @CurrentUser() currentUser: User,
        @Param('hackathonName') hackathonName: string,
        @Body() awardData: Award
    ) {
        const hackathon = await this.hackathonStore.findOneBy({
            name: hackathonName
        });
        if (!hackathon)
            throw new NotFoundError(`Hackathon ${hackathon} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, hackathonName);

        const saved = await this.store.save({
            ...awardData,
            hackathon
        });
        await ActivityLogController.logCreate(currentUser, 'Award', saved.id);
        return saved;
    }

    @Get('/:awardId')
    @OnNull(404)
    @ResponseSchema(Award)
    async getOne(@Param('awardId') id: number) {
        return this.store.findOneBy({ id });
    }

    @Patch('/:awardId')
    @Authorized()
    @ResponseSchema(Award)
    async updateOne(
        @CurrentUser() currentUser: User,
        @Param('hackathonName') hackathonName: string,
        @Param('awardId') awardId: number,
        @Body()
        updateData: Award
    ) {
        const award = await this.store.findOneBy({
            id: awardId,
            hackathon: { name: hackathonName }
        });

        if (!award) throw new NotFoundError('Award not found');

        await HackathonController.ensureAdmin(currentUser.id, hackathonName);

        // 只更新允许的字段
        const updatedAward = {
            ...award,
            ...updateData,
            id: award.id, // 确保 ID 不被覆盖
            hackathon: award.hackathon // 确保 hackathon 关系不被覆盖
        };

        const saved = await this.store.save(updatedAward);
        await ActivityLogController.logUpdate(currentUser, 'Award', saved.id);
        return saved;
    }

    @Delete('/:awardId')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() currentUser: User,
        @Param('hackathonName') hackathonName: string,
        @Param('awardId') awardId: number
    ) {
        const award = await this.store.findOneBy({
            id: awardId,
            hackathon: { name: hackathonName }
        });

        if (!award) throw new NotFoundError('Award not found');

        await HackathonController.ensureAdmin(currentUser.id, hackathonName);
        await this.store.softDelete(award.id);
        await ActivityLogController.logDelete(currentUser, 'Award', award.id);
    }
}
