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
import { UserServiceWithLog } from '../service';
import { HackathonController } from './Hackathon';

const hackathonStore = dataSource.getRepository(Hackathon);

@JsonController('/hackathon/:name')
export class SurveyController {
    questionnaireService = new UserServiceWithLog(Questionnaire, ['questions']);
    standardService = new UserServiceWithLog(Standard, ['dimensions']);

    @Get('/questionnaire')
    @OnNull(404)
    @ResponseSchema(Questionnaire)
    getQuestionnaire(@Param('name') name: string) {
        return this.questionnaireService.store.findOneBy({ hackathon: { name } });
    }

    @Put('/questionnaire')
    @Authorized()
    @ResponseSchema(Questionnaire)
    async updateQuestionnaire(@CurrentUser() user: User, @Param('name') name: string, @Body() form: Questionnaire) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(user.id, name);

        const old = await this.getQuestionnaire(name);

        if (old) return this.questionnaireService.editOne(old.id, form, user);
        else return this.questionnaireService.createOne({ ...form, hackathon }, user);
    }

    @Get('/standard')
    @OnNull(404)
    @ResponseSchema(Standard)
    getStandard(@Param('name') name: string) {
        return this.standardService.store.findOneBy({ hackathon: { name } });
    }

    @Put('/standard')
    @Authorized()
    @ResponseSchema(Standard)
    async updateStandard(@CurrentUser() user: User, @Param('name') name: string, @Body() form: Standard) {
        const hackathon = await hackathonStore.findOneBy({ name });

        if (!hackathon) throw new NotFoundError();

        await HackathonController.ensureAdmin(user.id, name);

        const old = await this.getStandard(name);

        if (old) return this.standardService.editOne(old.id, form, user);
        else return this.standardService.createOne({ ...form, hackathon }, user);
    }
}
