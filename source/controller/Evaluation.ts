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
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';
import { groupBy, sum } from 'web-utility';

import {
    BaseFilter,
    dataSource,
    Evaluation,
    EvaluationListChunk,
    Score,
    Team,
    User
} from '../model';
import { searchConditionOf } from '../utility';
import { ActivityLogController } from './ActivityLog';

const store = dataSource.getRepository(Evaluation),
    teamStore = dataSource.getRepository(Team);

@JsonController('/hackathon/:name/team/:tid/evaluation')
export class EvaluationController {
    @Post()
    @Authorized()
    @HttpCode(201)
    @ResponseSchema(Evaluation)
    async createOne(
        @CurrentUser() createdBy: User,
        @Param('name') name: string,
        @Param('tid') tid: number,
        @Body() evaluation: Evaluation
    ) {
        const team = await teamStore.findOne({
            where: { id: tid },
            relations: ['hackathon']
        });
        if (!team) throw new NotFoundError();

        const { hackathon } = team,
            now = Date.now();
        if (now < +new Date(hackathon.judgeStartedAt) || now > +new Date(hackathon.judgeEndedAt))
            throw new ForbiddenError('Not in evaluation period');

        const saved = await store.save({
            ...evaluation,
            team,
            hackathon: team.hackathon,
            createdBy
        });
        await ActivityLogController.logCreate(createdBy, 'Evaluation', saved.id);

        const allScores = (await store.findBy({ team: { id: tid } }))
            .map(({ scores }) => scores)
            .flat();
        const dimensionGroup = groupBy(allScores, 'dimension');

        const scores = Object.values(dimensionGroup).map(
            (scores): Score => ({
                dimension: scores[0].dimension,
                score: sum(...scores.map(({ score }) => score)) / scores.length
            })
        );
        const score = sum(...scores.map(({ score }) => score));

        await teamStore.save({ ...team, scores, score });

        return saved;
    }

    @Get()
    @ResponseSchema(EvaluationListChunk)
    async getList(
        @Param('tid') tid: number,
        @QueryParams() { keywords, pageSize, pageIndex }: BaseFilter
    ) {
        const where = searchConditionOf<Evaluation>(['scores', 'comment'], keywords, {
            team: { id: tid }
        });
        const [list, count] = await store.findAndCount({
            where,
            skip: pageSize * (pageIndex - 1),
            take: pageSize
        });
        return { list, count };
    }
}
