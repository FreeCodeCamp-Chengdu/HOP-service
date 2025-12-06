import {
    Authorized,
    Body,
    CurrentUser,
    Get,
    JsonController,
    OnNull,
    Param,
    Put
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import { Questionnaire, Standard, User } from '../model';
import { hackathonService, UserServiceWithLog } from '../service';

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
    async updateQuestionnaire(
        @CurrentUser() user: User,
        @Param('name') name: string,
        @Body() form: Questionnaire
    ) {
        const hackathon = await hackathonService.ensureAdmin(user.id, name);

        const old = await this.getQuestionnaire(name);

        return old
            ? this.questionnaireService.editOne(old.id, form, user)
            : this.questionnaireService.createOne({ ...form, hackathon }, user);
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
    async updateStandard(
        @CurrentUser() user: User,
        @Param('name') name: string,
        @Body() form: Standard
    ) {
        const hackathon = await hackathonService.ensureAdmin(user.id, name);

        const old = await this.getStandard(name);

        return old
            ? this.standardService.editOne(old.id, form, user)
            : this.standardService.createOne({ ...form, hackathon }, user);
    }
}
