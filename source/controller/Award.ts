import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
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
    Award,
    AwardAssignment,
    AwardAssignmentListChunk,
    AwardListChunk,
    BaseFilter,
    dataSource,
    Hackathon,
    User
} from '../model';
import { activityLogService } from '../service';
import { HackathonController } from './Hackathon';

const hackathonStore = dataSource.getRepository(Hackathon),
    awardStore = dataSource.getRepository(Award);

@JsonController('/hackathon/:name/award')
export class AwardController {
    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Award)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Body() award: Award
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon)
            throw new NotFoundError(`Hackathon ${name} is not found`);

        await HackathonController.ensureAdmin(createdBy.id, name);

        const saved = await awardStore.save({ ...award, createdBy, hackathon });

        await activityLogService.logCreate(createdBy, 'Award', saved.id);

        return saved;
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Award)
    getOne(@Param('id') id: number) {
        return awardStore.findOneBy({ id });
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(Award)
    async updateOne(
        @CurrentUser() updatedBy: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() updateData: Award
    ) {
        const award = await awardStore.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award ${id} is not found`);

        await HackathonController.ensureAdmin(updatedBy.id, name);

        // update only allowed fields
        const updatedAward = {
            ...award,
            ...updateData,
            id, // make sure id is not overridden
            updatedBy,
            hackathon: award.hackathon // make sure hackathon relationship is not changed
        };
        const saved = await awardStore.save(updatedAward);

        await activityLogService.logUpdate(updatedBy, 'Award', saved.id);

        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        const award = await awardStore.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award "${id}" is not found`);

        await HackathonController.ensureAdmin(deletedBy.id, name);

        await awardStore.save({ ...award, deletedBy });
        await awardStore.softDelete(award.id);

        await activityLogService.logDelete(deletedBy, 'Award', award.id);
    }

    @Get()
    @ResponseSchema(AwardListChunk)
    async getList(
        @Param('name') name: string,
        @QueryParams() { pageSize, pageIndex }: BaseFilter
    ) {
        const [list, count] = await awardStore.findAndCount({
            where: { hackathon: { name } },
            skip: pageSize * (pageIndex - 1),
            take: pageSize,
            relations: ['createdBy', 'updatedBy']
        });
        return { list, count };
    }
}

const assignmentStore = dataSource.getRepository(AwardAssignment);

@JsonController('/hackathon/:name/award/:aid/assignment')
export class AwardAssignmentController {
    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(AwardAssignment)
    async createOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('aid') aid: number,
        @Body() assignment: AwardAssignment
    ) {
        const award = await awardStore.findOne({
            where: { id: aid },
            relations: ['hackathon']
        });
        if (!award) throw new NotFoundError(`Award "${aid}" is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        const saved = await assignmentStore.save({
            ...assignment,
            hackathon: { id: award.hackathon.id },
            award
        });
        await activityLogService.logCreate(currentUser, 'AwardAssignment', saved.id);
        return saved;
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(AwardAssignment)
    async updateOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() newData: AwardAssignment
    ) {
        const assignment = await assignmentStore.findOne({
            where: { id },
            relations: ['hackathon', 'award']
        });
        if (!assignment)
            throw new NotFoundError(`AwardAssignment "${id}" is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        const saved = await assignmentStore.save({
            ...assignment,
            ...newData,
            id,
            hackathon: assignment.hackathon,
            award: assignment.award
        });
        await activityLogService.logUpdate(currentUser, 'AwardAssignment', saved.id);
        return saved;
    }

    static async getList(
        dimension: keyof AwardAssignment,
        id: number,
        pageSize: number,
        pageIndex: number
    ) {
        const [list, count] = await assignmentStore.findAndCount({
            where: { [dimension]: { id } },
            skip: pageSize * (pageIndex - 1),
            take: pageSize,
            relations: ['createdBy', 'updatedBy', 'award', 'user', 'team']
        });
        return { list, count };
    }

    @Get()
    @ResponseSchema(AwardAssignmentListChunk)
    getList(
        @Param('aid') aid: number,
        @QueryParams() { pageSize, pageIndex }: BaseFilter
    ) {
        return AwardAssignmentController.getList(
            'award',
            aid,
            pageSize,
            pageIndex
        );
    }
}

@JsonController('/hackathon/:name/team/:id/assignment')
export class TeamAwardAssignmentController {
    @Get()
    @ResponseSchema(AwardAssignmentListChunk)
    getList(
        @Param('id') id: number,
        @QueryParams() { pageSize, pageIndex }: BaseFilter
    ) {
        return AwardAssignmentController.getList(
            'team',
            id,
            pageSize,
            pageIndex
        );
    }
}
