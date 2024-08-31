import type {} from 'koa2-swagger-ui';
import { createAPI } from 'koagger';

import { isProduct } from '../utility';
import { BaseController } from './Base';
import { UserController } from './User';
import { OauthController } from './OAuth';
import { ActivityLogController } from './ActivityLog';
import { HackathonController } from './Hackathon';
import { StaffController } from './Staff';
import { OrganizerController } from './Organizer';
import { AnnouncementController } from './Announcement';
import { GitTemplateController } from './GitTemplate';
import { SurveyController } from './Questionnaire';
import { EnrollmentController } from './Enrollment';
import { TeamController } from './Team';
import { TeamMemberController } from './TeamMember';
import { TeamWorkController } from './TeamWork';
import { EvaluationController } from './Evaluation';

export * from './Base';
export * from './User';
export * from './OAuth';
export * from './ActivityLog';
export * from './Hackathon';
export * from './Staff';
export * from './Organizer';
export * from './Announcement';
export * from './GitTemplate';
export * from './Questionnaire';
export * from './Enrollment';
export * from './Team';
export * from './TeamMember';
export * from './TeamWork';
export * from './Evaluation';

export const { swagger, mocker, router } = createAPI({
    mock: !isProduct,
    controllers: [
        OauthController,
        UserController,
        ActivityLogController,
        StaffController,
        OrganizerController,
        EnrollmentController,
        SurveyController,
        GitTemplateController,
        AnnouncementController,
        EvaluationController,
        TeamWorkController,
        TeamMemberController,
        TeamController,
        HackathonController,
        BaseController
    ]
});
