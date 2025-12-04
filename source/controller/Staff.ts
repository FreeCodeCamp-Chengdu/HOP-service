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

import { Base, dataSource, Hackathon, Staff, StaffFilter, StaffListChunk, StaffType, User } from '../model';
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';
import { HackathonController } from './Hackathon';

const userStore = dataSource.getRepository(User),
    hackathonStore = dataSource.getRepository(Hackathon);
const StaffTypeRegExp = Object.values(StaffType).join('|');
const staffService = new UserServiceWithLog(Staff, ['description']);

@JsonController(`/hackathon/:name/:type(${StaffTypeRegExp})`)
export class StaffController {
    service = staffService;

    static isAdmin = (userId: number, hackathonName: string) =>
        staffService.store.existsBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Admin
        });

    static isJudge = (userId: number, hackathonName: string) =>
        staffService.store.existsBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Judge
        });

    static async addOne(staff: Omit<Staff, keyof Base>) {
        return staffService.createOne(staff, staff.createdBy);
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

        return StaffController.addOne({ ...staff, type, user, hackathon, createdBy });
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
        const staff = await this.service.store.findOne({
            where: { hackathon: { name }, type, user: { id: uid } },
            relations: ['hackathon']
        });
        if (!staff) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        return this.service.editOne(staff.id, { description }, updatedBy);
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
        const staff = await this.service.store.findOne({
            where: { hackathon: { name }, type, user: { id: uid } },
            relations: ['hackathon']
        });
        if (!staff) throw new NotFoundError();

        if (deletedBy.id === uid) throw new ForbiddenError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(staff.id, deletedBy);
    }

    @Get()
    @ResponseSchema(StaffListChunk)
    getList(
        @Param('name') name: string,
        @Param('type') type: StaffType,
        @QueryParams() { keywords, user, ...filter }: StaffFilter
    ) {
        const where = searchConditionOf<Staff>(['description'], keywords, {
            hackathon: { name },
            type,
            ...(user && { user: { id: user } })
        });
        return this.service.getList({ keywords, ...filter }, where, { relations: ['hackathon', 'user'] });
    }
}
