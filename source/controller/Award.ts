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
import { awardAssignmentService, awardService, hackathonService } from '../service';

const hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name/award')
export class AwardController {
    service = awardService;

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

        if (!hackathon) throw new NotFoundError(`Hackathon ${name} is not found`);

        await hackathonService.ensureAdmin(createdBy.id, name);

        return this.service.createOne({ ...award, hackathon }, createdBy);
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(Award)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id);
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
        await hackathonService.ensureAdmin(updatedBy.id, name);

        return this.service.editOne(id, updateData, updatedBy);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(
        @CurrentUser() deletedBy: User,
        @Param('name') name: string,
        @Param('id') id: number
    ) {
        await hackathonService.ensureAdmin(deletedBy.id, name);

        await this.service.deleteOne(id, deletedBy);
    }

    @Get()
    @ResponseSchema(AwardListChunk)
    getList(@Param('name') name: string, @QueryParams() { ...filter }: BaseFilter) {
        return this.service.getList(
            filter,
            { hackathon: { name } },
            { relations: ['createdBy', 'updatedBy'] }
        );
    }
}

@JsonController('/hackathon/:name/award/:aid/assignment')
export class AwardAssignmentController {
    service = awardAssignmentService;
    awardService = awardService;

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
        const award = await this.awardService.getOne(aid, ['hackathon']);
        if (!award) throw new NotFoundError(`Award "${aid}" is not found`);

        await hackathonService.ensureAdmin(currentUser.id, name);

        return this.service.createOne(
            { ...assignment, hackathon: award.hackathon, award },
            currentUser
        );
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
        await hackathonService.ensureAdmin(currentUser.id, name);

        return this.service.editOne(id, newData, currentUser);
    }

    @Get()
    @ResponseSchema(AwardAssignmentListChunk)
    getList(@Param('aid') aid: number, @QueryParams() { pageSize, pageIndex }: BaseFilter) {
        return awardAssignmentService.getListByDimension('award', aid, pageSize, pageIndex);
    }
}

@JsonController('/hackathon/:name/team/:id/assignment')
export class TeamAwardAssignmentController {
    @Get()
    @ResponseSchema(AwardAssignmentListChunk)
    getList(@Param('id') id: number, @QueryParams() { pageSize, pageIndex }: BaseFilter) {
        return awardAssignmentService.getListByDimension('team', id, pageSize, pageIndex);
    }
}
