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

import {
    BaseFilter,
    dataSource,
    PlatformAdmin,
    PlatformAdminListChunk,
    Role,
    User} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';

const store = dataSource.getRepository(PlatformAdmin),
    userStore = dataSource.getRepository(User);

@JsonController('/platform/admin')
export class PlatformAdminController {
    static isAdmin = (uid: number) => store.existsBy({ user: { id: uid } });

    @Put('/:uid')
    @Authorized(Role.Administrator)
    @HttpCode(201)
    @ResponseSchema(PlatformAdmin)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('uid') uid: number,
        @Body() { description }: PlatformAdmin
    ) {
        const user = await userStore.findOneBy({ id: uid });

        if (!user) throw new NotFoundError();

        const admin = await store.findOneBy({ user: { id: uid } });

        if (admin) return admin;

        user.roles.push(Role.Administrator);

        await userStore.save(user);

        const saved = await store.save({ user, description, createdBy });

        await ActivityLogController.logCreate(createdBy, 'PlatformAdmin', saved.id);

        return saved;
    }

    @Delete('/:uid')
    @Authorized(Role.Administrator)
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('uid') uid: number) {
        const user = await userStore.findOneBy({ id: uid });

        if (!user) throw new NotFoundError();

        const admin = await store.findOneBy({ user: { id: uid } });

        if (!admin) return;

        user.roles = user.roles.filter(role => role !== Role.Administrator);

        await userStore.save(user);

        await store.update(admin.id, { deletedBy });

        await ActivityLogController.logDelete(deletedBy, 'PlatformAdmin', admin.id);
    }

    @Get()
    @ResponseSchema(PlatformAdminListChunk)
    async getList(@QueryParams() { keywords, pageSize, pageIndex }: BaseFilter) {
        const [list, count] = await store.findAndCount({
            where: searchConditionOf<PlatformAdmin>(['description'], keywords),
            relations: ['user', 'createdBy'],
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
