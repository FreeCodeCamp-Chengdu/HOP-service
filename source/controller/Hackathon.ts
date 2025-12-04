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

import { dataSource, Hackathon, HackathonFilter, HackathonListChunk, StaffType, User } from '../model';
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';
import { EnrollmentController } from './Enrollment';
import { PlatformAdminController } from './PlatformAdmin';
import { StaffController } from './Staff';

const store = dataSource.getRepository(Hackathon);

@JsonController('/hackathon')
export class HackathonController {
    service = new UserServiceWithLog(Hackathon, [
        'name',
        'displayName',
        'ribbon',
        'summary',
        'detail',
        'location',
        'tags'
    ]);

    static async ensureAdmin(userId: number, hackathonName: string) {
        if (
            !(await StaffController.isAdmin(userId, hackathonName)) &&
            !(await PlatformAdminController.isAdmin(userId))
        )
            throw new ForbiddenError();
    }

    static async ensureJudge(userId: number, hackathonName: string) {
        if (!(await StaffController.isJudge(userId, hackathonName))) throw new ForbiddenError();
    }

    static async ensureEnrolled(userId: number, hackathonName: string) {
        if (!(await EnrollmentController.isEnrolled(userId, hackathonName))) throw new ForbiddenError();
    }

    @Put('/:name')
    @Authorized()
    @ResponseSchema(Hackathon)
    async updateOne(@CurrentUser() updatedBy: User, @Param('name') name: string, @Body() newData: Hackathon) {
        const old = await store.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, name);

        return this.service.editOne(old.id, newData, updatedBy);
    }

    @Get('/:name')
    @ResponseSchema(Hackathon)
    @OnNull(404)
    async getOne(@CurrentUser() user: User, @Param('name') name: string) {
        const hackathon = await store.findOne({
            where: { name },
            relations: ['createdBy']
        });

        if (user && hackathon) {
            const uid = user.id;

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
    async deleteOne(@CurrentUser() deletedBy: User, @Param('name') name: string) {
        const old = await store.findOneBy({ name });

        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(old.id, deletedBy);
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Hackathon)
    async createOne(@CurrentUser() createdBy: User, @Body() hackathon: Hackathon) {
        const saved = await this.service.createOne(hackathon, createdBy);

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
    getList(
        @QueryParams()
        { keywords, createdBy, updatedBy, ...filter }: HackathonFilter
    ) {
        const where = searchConditionOf<Hackathon>(
            ['name', 'displayName', 'ribbon', 'summary', 'detail', 'location', 'tags'],
            keywords,
            {
                ...filter,
                ...(createdBy && { createdBy: { id: createdBy } }),
                ...(updatedBy && { updatedBy: { id: updatedBy } })
            }
        );
        return this.service.getList({ keywords, ...filter }, where, { relations: ['createdBy'] });
    }
}
