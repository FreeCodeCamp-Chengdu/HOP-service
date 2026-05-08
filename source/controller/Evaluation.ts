import { escape as escapeHTML } from 'html-escaper';
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

import { BaseFilter, Evaluation, EvaluationListChunk, Score, User } from '../model';
import { emailService, teamService, UserServiceWithLog } from '../service';
import { interpolateURL, searchConditionOf, TEAM_FRONTEND_URL } from '../utility';

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
        const team = await teamService.store.findOne({
            where: { id: tid },
            relations: ['hackathon']
        });
        if (!team) throw new NotFoundError();

        const { hackathon } = team,
            now = Date.now();
        if (now < +new Date(hackathon.judgeStartedAt) || now > +new Date(hackathon.judgeEndedAt))
            throw new ForbiddenError('Not in evaluation period');

        const saved = await this.service.createOne(
            { ...evaluation, team, hackathon: team.hackathon },
            createdBy
        );
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

        await teamService.store.save({ ...team, scores, score });

        if (TEAM_FRONTEND_URL) {
            const url = escapeHTML(interpolateURL(TEAM_FRONTEND_URL, { name, tid }));
            const subject = `New Evaluation Submitted for Your Team`;
            const html =
                `<p>A new evaluation has been submitted for your team.</p>` +
                `<p><a href="${url}">View Team</a></p>`;

            emailService.sendToTeamMembers(tid, undefined, subject, html);
            emailService.sendToHackathonStaff(name, subject, html);
        }
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
