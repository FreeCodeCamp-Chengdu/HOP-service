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
    Put,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { BaseFilter, PlatformAdmin, PlatformAdminListChunk, Role, User } from '../model';
import { platformAdminService, sessionService } from '../service';
import { searchConditionOf } from '../utility';

@JsonController('/platform/admin')
export class PlatformAdminController {
    service = platformAdminService;
    userStore = sessionService.userStore;

    @Put('/:uid')
    @Authorized(Role.Administrator)
    @HttpCode(201)
    @ResponseSchema(PlatformAdmin)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('uid') uid: number,
        @Body() { description }: PlatformAdmin
    ) {
        const user = await this.userStore.findOneBy({ id: uid });

        if (!user) throw new NotFoundError();

        const admin = await this.service.store.findOneBy({ user: { id: uid } });

        if (admin) return admin;

        user.roles.push(Role.Administrator);

        await this.userStore.save(user);

        return this.service.createOne({ user, description }, createdBy);
    }

    @Delete('/:uid')
    @Authorized(Role.Administrator)
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('uid') uid: number) {
        const user = await this.userStore.findOneBy({ id: uid });

        if (!user) throw new NotFoundError();

        const admin = await this.service.store.findOneBy({ user: { id: uid } });

        if (!admin) return;

        user.roles = user.roles.filter(role => role !== Role.Administrator);

        await this.userStore.save(user);

        await this.service.deleteOne(admin.id, deletedBy);
    }

    @Get()
    @ResponseSchema(PlatformAdminListChunk)
    getList(@QueryParams() { keywords, ...filter }: BaseFilter) {
        const where = searchConditionOf<PlatformAdmin>(['description'], keywords);

        return this.service.getList({ keywords, ...filter }, where, {
            relations: ['user', 'createdBy']
        });
    }
}
