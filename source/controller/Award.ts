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
    dataSource,
    Hackathon,
    User,
    Award,
    Media,
    AwardTarget
} from '../model';

import { HackathonController } from './Hackathon';
import { ActivityLogController } from './ActivityLog';

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
        @Body()
        awardData: {
            name: string;
            description: string;
            quantity: number;
            target: AwardTarget;
            pictures: Media[];
        }
    ) {
        const hackathon = await this.hackathonStore.findOneBy({
            name: hackathonName
        });
        if (!hackathon) throw new NotFoundError('Hackathon not found');

        await HackathonController.ensureAdmin(currentUser.id, hackathonName);

        const saved = this.store.save({
            ...awardData,
            hackathon
        });
        await ActivityLogController.logCreate(currentUser, 'Award', saved.id);
        return saved;
    }

    @Get('/:awardId')
    @OnNull(404)
    @ResponseSchema(Award)
    async getOne(
        @Param('hackathonName') hackathonName: string,
        @Param('awardId') awardId: number
    ) {
        const award = await this.store.findOneBy({
            id: awardId,
            hackathon: { name: hackathonName }
        });

        if (!award) {
            return null;
        }

        return award;
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

        Object.assign(award, updateData);
        const saved = await this.store.save(award);
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
