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
    Put
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
import { ActivityLogController } from './ActivityLog';
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
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Body() award: Award
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon)
            throw new NotFoundError(`Hackathon ${name} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        const saved = await awardStore.save({ ...award, hackathon });

        await ActivityLogController.logCreate(currentUser, 'Award', saved.id);

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
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('id') id: number,
        @Body() updateData: Award
    ) {
        const award = await awardStore.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award ${id} is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        // update only allowed fields
        const updatedAward = {
            ...award,
            ...updateData,
            id, // make sure id is not overridden
            hackathon: award.hackathon // make sure hackathon relationship is not changed
        };
        const saved = await awardStore.save(updatedAward);

        await ActivityLogController.logUpdate(currentUser, 'Award', saved.id);

        return saved;
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() currentUser: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        const award = await awardStore.findOneBy({ id });

        if (!award) throw new NotFoundError(`Award "${id}" is not found`);

        await HackathonController.ensureAdmin(currentUser.id, name);

        await awardStore.softDelete(award.id);

        await ActivityLogController.logDelete(currentUser, 'Award', award.id);
    }

    @Get()
    @ResponseSchema(AwardListChunk)
    async getList(
        @Param('name') name: string,
        { pageSize, pageIndex }: BaseFilter
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
        await ActivityLogController.logCreate(
            currentUser,
            'AwardAssignment',
            saved.id
        );
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
        await ActivityLogController.logUpdate(
            currentUser,
            'AwardAssignment',
            saved.id
        );
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
    getList(@Param('id') id: number, { pageSize, pageIndex }: BaseFilter) {
        return AwardAssignmentController.getList(
            'award',
            id,
            pageSize,
            pageIndex
        );
    }
}

@JsonController('/hackathon/:name/team/:id/assignment')
export class TeamAwardAssignmentController {
    @Get()
    @ResponseSchema(AwardAssignmentListChunk)
    getList(@Param('id') id: number, { pageSize, pageIndex }: BaseFilter) {
        return AwardAssignmentController.getList(
            'team',
            id,
            pageSize,
            pageIndex
        );
    }
}
