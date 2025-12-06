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

import { BaseFilter, dataSource, Evaluation, EvaluationListChunk, Score, Team, User } from '../model';
import { UserServiceWithLog } from '../service';
import { searchConditionOf } from '../utility';

const teamStore = dataSource.getRepository(Team);

@JsonController('/hackathon/:name/team/:tid/evaluation')
export class EvaluationController {
    service = new UserServiceWithLog(Evaluation, ['scores', 'comment']);

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

        const saved = await this.service.createOne({ ...evaluation, team, hackathon: team.hackathon }, createdBy);

        const allScores = (await this.service.store.findBy({ team: { id: tid } }))
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
    getList(@Param('tid') tid: number, @QueryParams() { keywords, ...filter }: BaseFilter) {
        const where = searchConditionOf<Evaluation>(['scores', 'comment'], keywords, {
            team: { id: tid }
        });
        return this.service.getList({ keywords, ...filter }, where);
    }
}
