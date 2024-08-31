import {
    Authorized,
    Body,
    CurrentUser,
    ForbiddenError,
    Get,
    HttpCode,
    JsonController,
    NotFoundError,
    Param,
    Patch,
    Post,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    dataSource,
    Enrollment,
    EnrollmentFilter,
    EnrollmentListChunk,
    EnrollmentStatus,
    Hackathon,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

const store = dataSource.getRepository(Enrollment),
    hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/enrollment')
export class EnrollmentController {
    static async isEnrolled(userId: number, hackathonName: string) {
        const enrollment = await store.findOneBy({
            hackathon: { name: hackathonName },
            createdBy: { id: userId }
        });
        return !!enrollment;
    }

    @Get('/session')
    @Authorized()
    @ResponseSchema(Enrollment)
    getSessionOne(@CurrentUser() createdBy: User) {
        return store.findOneBy({ createdBy });
    }

    @Patch('/:id')
    @Authorized()
    @ResponseSchema(Enrollment)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('id') id: number,
        @Body() { status }: Enrollment
    ) {
        const old = await store.findOne({
            where: { id },
            relations: ['hackathon']
        });
        if (!old) throw new NotFoundError();

        await HackathonController.ensureAdmin(updatedBy.id, old.hackathon.name);

        const saved = await store.save({ ...old, status, updatedBy });

        await ActivityLogController.logUpdate(updatedBy, 'Enrollment', old.id);

        return saved;
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Enrollment)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() { form }: Enrollment
    ) {
        const hackathon = await hackathonStore.findOneBy({ name }),
            now = Date.now();

        if (!hackathon) throw new NotFoundError();

        if (
            now < +new Date(hackathon.enrollmentStartedAt) ||
            now > +new Date(hackathon.enrollmentEndedAt)
        )
            throw new ForbiddenError('Not in enrollment period');

        const saved = await store.save({
            createdBy,
            hackathon,
            form,
            status: hackathon.autoApprove
                ? EnrollmentStatus.Approved
                : EnrollmentStatus.PendingApproval
        });
        await ActivityLogController.logCreate(
            createdBy,
            'Enrollment',
            saved.id
        );
        return saved;
    }

    @Get()
    @ResponseSchema(EnrollmentListChunk)
    async getList(
        @QueryParams()
        { status, keywords, pageSize, pageIndex }: EnrollmentFilter
    ) {
        const where = searchConditionOf<Enrollment>(
            ['form'],
            keywords,
            status && { status }
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
