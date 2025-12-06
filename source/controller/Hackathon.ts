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
import { enrollmentService,hackathonService, staffService } from '../service';
import { searchConditionOf } from '../utility';

const store = dataSource.getRepository(Hackathon);

@JsonController('/hackathon')
export class HackathonController {
    service = hackathonService;

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

        await hackathonService.ensureAdmin(updatedBy.id, name);

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
        const old = await store.findOneBy({ name });

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
