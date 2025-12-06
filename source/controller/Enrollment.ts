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
    Post,
    Put,
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
import { enrollmentService, hackathonService } from '../service';
import { searchConditionOf } from '../utility';

const hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/enrollment')
export class EnrollmentController {
    service = enrollmentService;

    @Get('/session')
    @Authorized()
    @ResponseSchema(Enrollment)
    getSessionOne(@CurrentUser() createdBy: User) {
        return this.service.store.findOneBy({ createdBy });
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Enrollment)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('id') id: number,
        @Body() { status }: Enrollment
    ) {
        const old = await this.service.getOne(id, ['hackathon']);
        if (!old) throw new NotFoundError();

        await hackathonService.ensureAdmin(updatedBy.id, old.hackathon.name);

        return this.service.editOne(id, { status }, updatedBy);
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

        return this.service.createOne(
            {
                hackathon,
                form,
                status: hackathon.autoApprove
                    ? EnrollmentStatus.Approved
                    : EnrollmentStatus.PendingApproval
            },
            createdBy
        );
    }

    @Get()
    @ResponseSchema(EnrollmentListChunk)
    getList(
        @QueryParams() { keywords, status, createdBy, updatedBy, ...filter }: EnrollmentFilter
    ) {
        const where = searchConditionOf<Enrollment>(['form'], keywords, {
            ...(status && { status }),
            ...(createdBy && { createdBy: { id: createdBy } }),
            ...(updatedBy && { updatedBy: { id: updatedBy } })
        });
        return this.service.getList({ keywords, ...filter }, where, { relations: ['createdBy'] });
    }
}
