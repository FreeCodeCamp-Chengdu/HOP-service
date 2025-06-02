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
    OnNull,
    OnUndefined,
    Param,
    Post,
    Put,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    dataSource,
    Hackathon,
    HackathonFilter,
    HackathonListChunk,
    StaffType,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { EnrollmentController } from './Enrollment';
import { PlatformAdminController } from './PlatformAdmin';
import { StaffController } from './Staff';

const store = dataSource.getRepository(Hackathon);

@JsonController('/hackathon')
export class HackathonController {
    static async ensureAdmin(userId: number, hackathonName: string) {
        if (
            !(await StaffController.isAdmin(userId, hackathonName)) &&
            !(await PlatformAdminController.isAdmin(userId))
        )
            throw new ForbiddenError();
    }

    static async ensureJudge(userId: number, hackathonName: string) {
        if (!(await StaffController.isJudge(userId, hackathonName)))
            throw new ForbiddenError();
    }

    static async ensureEnrolled(userId: number, hackathonName: string) {
        if (!(await EnrollmentController.isEnrolled(userId, hackathonName)))
            throw new ForbiddenError();
    }

    @Put('/:name')
    @Authorized()
    @ResponseSchema(Hackathon)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Body() newData: Hackathon
    ) {
        const old = await store.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        const saved = await store.save({ ...old, ...newData, updatedBy });

        await ActivityLogController.logUpdate(updatedBy, 'Hackathon', old.id);

        return saved;
    }

    @Get('/:name')
    @ResponseSchema(Hackathon)
    @OnNull(404)
    async getOne(@CurrentUser() user: User, @Param('name') name: string) {
        const hackathon = await store.findOne({
            where: { name },
            relations: ['createdBy']
        });

        if (user) {
            const hid = hackathon.id,
                uid = user.id;

            hackathon.roles = {
                isAdmin: await StaffController.isAdmin(uid, name),
                isJudge: await StaffController.isJudge(uid, name),
                isEnrolled: await EnrollmentController.isEnrolled(uid, name)
            };
        }
        return hackathon;
    }

    @Delete('/:name')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string
    ) {
        const old = await store.findOneBy({ name });

        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await store.save({ ...old, deletedBy });
        await store.softDelete(old.id);

        await ActivityLogController.logDelete(deletedBy, 'Hackathon', old.id);
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Hackathon)
    async createOne(
        @CurrentUser() createdBy: User,
        @Body() hackathon: Hackathon
    ) {
        const saved = await store.save({ ...hackathon, createdBy });

        await ActivityLogController.logCreate(createdBy, 'Hackathon', saved.id);

        await StaffController.addOne({
            type: StaffType.Admin,
            user: createdBy,
            description: 'Hackathon Creator',
            hackathon: saved,
            createdBy
        });
        return saved;
    }

    @Get()
    @ResponseSchema(HackathonListChunk)
    async getList(
        @QueryParams()
        {
            keywords,
            pageSize,
            pageIndex,
            createdBy,
            updatedBy,
            ...filter
        }: HackathonFilter
    ) {
        const where = searchConditionOf<Hackathon>(
            [
                'name',
                'displayName',
                'ribbon',
                'summary',
                'detail',
                'location',
                'tags'
            ],
            keywords,
            {
                ...filter,
                createdBy: { id: createdBy },
                updatedBy: { id: updatedBy }
            }
        );
        const [list, count] = await store.findAndCount({
            where,
            relations: ['createdBy'],
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
