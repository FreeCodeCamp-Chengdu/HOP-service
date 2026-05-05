import { escape as escapeHTML } from 'html-escaper';
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
    Hackathon,
    HackathonFilter,
    HackathonListChunk,
    HackathonStatus,
    Role,
    StaffType,
    User
} from '../model';
import { emailService, enrollmentService, hackathonService, staffService } from '../service';
import { ADMIN_FRONTEND_URL, HACKATHON_ADMIN_URL, interpolateURL } from '../utility';

@JsonController('/hackathon')
export class HackathonController {
    service = hackathonService;
    store = this.service.store;

    @Put('/:name')
    @Authorized()
    @ResponseSchema(Hackathon)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Body() newData: Hackathon
    ) {
        const old = await this.store.findOne({
            where: { name },
            relations: ['createdBy']
        });
        if (!old) throw new NotFoundError();

        await hackathonService.ensureAdmin(updatedBy.id, name);

        const updated = await this.service.editOne(old.id, newData, updatedBy);

        if (newData.status && newData.status !== old.status && HACKATHON_ADMIN_URL)
            await emailService.sendToHackathonStaff(
                name,
                `Hackathon Status Updated: ${old.displayName}`,
                `<p>The hackathon <strong>${escapeHTML(old.displayName)}</strong> status has been updated to <strong>${escapeHTML(newData.status)}</strong>.</p>` +
                    `<p><a href="${escapeHTML(interpolateURL(HACKATHON_ADMIN_URL, { name }))}">View Hackathon</a></p>`
            );

        return updated;
    }

    @Get('/:name')
    @ResponseSchema(Hackathon)
    @OnNull(404)
    async getOne(@CurrentUser({ required: false }) user: User, @Param('name') name: string) {
        const hackathon = await this.store.findOne({
            where: { name },
            relations: ['createdBy']
        });

        if (!hackathon) return null;

        if (hackathon.status !== HackathonStatus.Online) {
            if (!user) throw new ForbiddenError();

            await hackathonService.ensureAdmin(user.id, name);
        }

        if (user) {
            const uid = user.id;

            hackathon.roles = {
                isAdmin: await staffService.isAdmin(uid, name),
                isJudge: await staffService.isJudge(uid, name),
                isEnrolled: await enrollmentService.isEnrolled(uid, name)
            };
        }
        return hackathon;
    }

    @Delete('/:name')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@CurrentUser() deletedBy: User, @Param('name') name: string) {
        const old = await this.store.findOneBy({ name });

        if (!old) throw new NotFoundError();

        await hackathonService.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(old.id, deletedBy);
    }

    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Hackathon)
    async createOne(@CurrentUser() createdBy: User, @Body() hackathon: Hackathon) {
        const saved = await this.service.createOne(hackathon, createdBy);

        await staffService.createOne(
            {
                type: StaffType.Admin,
                user: createdBy,
                description: 'Hackathon Creator',
                hackathon: saved,
                createdBy
            },
            createdBy
        );

        if (ADMIN_FRONTEND_URL)
            await emailService.sendToPlatformAdmins(
                `New Hackathon Needs Review: ${saved.displayName}`,
                `<p>A new hackathon <strong>${escapeHTML(saved.displayName)}</strong> has been created and is awaiting your review.</p>` +
                    `<p><a href="${escapeHTML(interpolateURL(ADMIN_FRONTEND_URL, { name: saved.name }))}">Review Hackathon</a></p>`
            );

        return saved;
    }

    @Get()
    @ResponseSchema(HackathonListChunk)
    async getList(@CurrentUser({ required: false }) user: User, @QueryParams() filter: HackathonFilter) {
        const isAdmin = user?.roles?.includes(Role.Administrator) ?? false;

        if (!isAdmin) filter.status = HackathonStatus.Online;

        return this.service.getList(filter);
    }
}
