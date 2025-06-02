import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
    ForbiddenError,
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
    Base,
    dataSource,
    Hackathon,
    Staff,
    StaffFilter,
    StaffListChunk,
    StaffType,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

const store = dataSource.getRepository(Staff),
    userStore = dataSource.getRepository(User),
    hackathonStore = dataSource.getRepository(Hackathon);
const StaffTypeRegExp = Object.values(StaffType).join('|');

@JsonController(`/hackathon/:name/:type(${StaffTypeRegExp})`)
export class StaffController {
    static async isAdmin(userId: number, hackathonName: string) {
        const staff = await store.findOneBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Admin
        });
        return !!staff;
    }

    static async isJudge(userId: number, hackathonName: string) {
        const staff = await store.findOneBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Judge
        });
        return !!staff;
    }

    static async addOne(staff: Omit<Staff, keyof Base>) {
        const saved = await store.save(staff);

        await ActivityLogController.logCreate(
            staff.createdBy,
            'Staff',
            saved.id
        );
        return saved;
    }

    @Put('/:uid')
    @HttpCode(201)
    @Authorized()
    @ResponseSchema(Staff)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Param('type') type: StaffType,
        @Param('uid') uid: number,
        @Body() staff: Staff
    ) {
        const [user, hackathon] = await Promise.all([
            userStore.findOneBy({ id: uid }),
            hackathonStore.findOneBy({ name })
        ]);
        if (!user || !hackathon || !StaffType[type]) throw new NotFoundError();

        if (createdBy.id === uid) throw new ForbiddenError();

        await HackathonController.ensureAdmin(createdBy.id, name);

        return StaffController.addOne({
            ...staff,
            type,
            user,
            hackathon,
            createdBy
        });
    }

    @Put('/:uid')
    @Authorized()
    @ResponseSchema(Staff)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Param('type') type: StaffType,
        @Param('uid') uid: number,
        @Body() { description }: Staff
    ) {
        const staff = await store.findOne({
            where: { hackathon: { name }, type, user: { id: uid } },
            relations: ['hackathon']
        });
        if (!staff) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        const saved = await store.save({
            ...staff,
            description,
            updatedBy
        });
        await ActivityLogController.logUpdate(updatedBy, 'Staff', staff.id);

        return saved;
    }

    @Delete('/:uid')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('type') type: StaffType,
        @Param('uid') uid: number
    ) {
        const staff = await store.findOne({
            where: { hackathon: { name }, type, user: { id: uid } },
            relations: ['hackathon']
        });
        if (!staff) throw new NotFoundError();

        if (deletedBy.id === uid) throw new ForbiddenError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await store.save({ ...staff, deletedBy });
        await store.softDelete(staff.id);

        await ActivityLogController.logDelete(deletedBy, 'Staff', staff.id);
    }

    @Get()
    @ResponseSchema(StaffListChunk)
    async getList(
        @Param('name') name: string,
        @Param('type') type: StaffType,
        @QueryParams() { keywords, pageSize, pageIndex, user }: StaffFilter
    ) {
        const where = searchConditionOf<Staff>(['description'], keywords, {
            hackathon: { name },
            type,
            user: { id: user }
        });
        const [list, count] = await store.findAndCount({
            where,
            relations: ['hackathon', 'user'],
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
