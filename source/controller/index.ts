import type {} from 'koa2-swagger-ui';
import { createAPI } from 'koagger';

import { isProduct } from '../utility';
import { ActivityLogController } from './ActivityLog';
import { AnnouncementController } from './Announcement';
import {
    AwardAssignmentController,
    AwardController,
    TeamAwardAssignmentController
} from './Award';
import { BaseController } from './Base';
import { EnrollmentController } from './Enrollment';
import { EvaluationController } from './Evaluation';
import { FileController } from './File';
import { GitTemplateController } from './GitTemplate';
import { HackathonController } from './Hackathon';
import { OauthController } from './OAuth';
import { OrganizerController } from './Organizer';
import { PlatformAdminController } from './PlatformAdmin';
import { SurveyController } from './Questionnaire';
import { StaffController } from './Staff';
import { TeamController } from './Team';
import { TeamMemberController } from './TeamMember';
import { TeamWorkController } from './TeamWork';
import { UserController } from './User';

export * from './ActivityLog';
export * from './Announcement';
export * from './Award';
export * from './Base';
export * from './Enrollment';
export * from './Evaluation';
export * from './File';
export * from './GitTemplate';
export * from './Hackathon';
export * from './OAuth';
export * from './Organizer';
export * from './PlatformAdmin';
export * from './Questionnaire';
export * from './Staff';
export * from './Team';
export * from './TeamMember';
export * from './TeamWork';
export * from './User';

export const controllers = [
    OauthController,
    UserController,
    PlatformAdminController,
    ActivityLogController,
    FileController,
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
    TeamAwardAssignmentController,
    AwardAssignmentController,
    AwardController,
    HackathonController,
    BaseController
];

export const { swagger, mocker, router } = createAPI({
    mock: !isProduct,
    controllers
});
