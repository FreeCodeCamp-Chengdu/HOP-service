import { ConnectionOptions, parse } from 'pg-connection-string';
import { DataSource } from 'typeorm';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';

import { DATABASE_URL, isProduct } from '../utility';
import { ActivityLog, UserRank } from './ActivityLog';
import { Announcement } from './Announcement';
import { Award } from './Award';
import { Enrollment } from './Enrollment';
import { GitTemplate } from './GitTemplate';
import { Hackathon } from './Hackathon';
import { Organizer } from './Organizer';
import { PlatformAdmin } from './PlatformAdmin';
import { Evaluation, Questionnaire, Standard } from './Questionnaire';
import { Staff } from './Staff';
import { Team } from './Team';
import { TeamMember } from './TeamMember';
import { TeamWork } from './TeamWork';
import { User } from './User';

export * from './ActivityLog';
export * from './Announcement';
export * from './Award';
export * from './Base';
export * from './Enrollment';
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

const { ssl, host, port, user, password, database } = isProduct
    ? parse(DATABASE_URL)
    : ({} as ConnectionOptions);

const commonOptions: Pick<
    SqliteConnectionOptions,
    'logging' | 'synchronize' | 'entities' | 'migrations'
> = {
    logging: true,
    synchronize: true,
    entities: [
        User,
        PlatformAdmin,
        ActivityLog,
        UserRank,
        Hackathon,
        Staff,
        Organizer,
        Announcement,
        GitTemplate,
        Questionnaire,
        Standard,
        Enrollment,
        Team,
        TeamMember,
        TeamWork,
        Evaluation,
        Award
    ],
    migrations: [`${isProduct ? '.data' : 'migration'}/*.ts`]
};

export const dataSource = isProduct
    ? new DataSource({
          type: 'postgres',
          ssl: ssl as boolean,
          host,
          port: +port,
          username: user,
          password,
          database,
          ...commonOptions
      })
    : new DataSource({
          type: 'sqlite',
          database: '.data/test.db',
          ...commonOptions
      });
