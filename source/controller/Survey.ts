import {
    Authorized,
    Body,
    CurrentUser,
    Get,
    JsonController,
    NotFoundError,
    OnNull,
    Param,
    Put
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { dataSource, Hackathon, Questionnaire, Standard, User } from '../model';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';

const questionnaireStore = dataSource.getRepository(Questionnaire),
    standardStore = dataSource.getRepository(Standard),
    hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name')
export class SurveyController {
    @Get('/questionnaire')
    @OnNull(404)
    @ResponseSchema(Questionnaire)
    getQuestionnaire(@Param('name') name: string) {
        return questionnaireStore.findOneBy({ hackathon: { name } });
    }

    @Put('/questionnaire')
    @Authorized()
    @ResponseSchema(Questionnaire)
    async updateQuestionnaire(
        @CurrentUser() user: User,
        @Param('name') name: string,
        @Body() form: Questionnaire
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(user.id, name);

        const old = await this.getQuestionnaire(name);

        const saved = await questionnaireStore.save({
            ...old,
            ...form,
            hackathon,
            ...(old ? { updatedBy: user } : { createdBy: user })
        });

        if (old)
            await ActivityLogController.logUpdate(
                user,
                'Questionnaire',
                saved.id
            );
        else
            await ActivityLogController.logCreate(
                user,
                'Questionnaire',
                saved.id
            );
        return saved;
    }

    @Get('/standard')
    @OnNull(404)
    @ResponseSchema(Standard)
    getStandard(@Param('name') name: string) {
        return standardStore.findOneBy({ hackathon: { name } });
    }

    @Put('/standard')
    @Authorized()
    @ResponseSchema(Standard)
    async updateStandard(
        @CurrentUser() user: User,
        @Param('name') name: string,
        @Body() form: Standard
    ) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(user.id, name);

        const old = await this.getStandard(name);

        const saved = await standardStore.save({
            ...old,
            ...form,
            hackathon,
            ...(old ? { updatedBy: user } : { createdBy: user })
        });

        if (old)
            await ActivityLogController.logUpdate(user, 'Standard', saved.id);
        else await ActivityLogController.logCreate(user, 'Standard', saved.id);

        return saved;
    }
}
