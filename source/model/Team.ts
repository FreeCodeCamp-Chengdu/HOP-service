import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity, ManyToOne, VirtualColumn } from 'typeorm';

import { ListChunk } from './Base';
import { HackathonBase } from './Hackathon';

@Entity()
export class Team extends HackathonBase {
    @IsString()
    @Column()
    displayName: string;

    @IsString()
    @Column('text')
    description: string;

    @IsBoolean()
    @Column()
    @IsOptional()
    autoApprove?: boolean = false;

    @IsInt()
    @Min(1)
    @VirtualColumn({
        query: alias =>
            `SELECT COUNT(*) FROM "team_member" WHERE "team_member"."teamId" = ${alias}.id`
    })
    @IsOptional()
    membersCount?: number = 1;

    @Type(() => Score)
    @ValidateNested({ each: true })
    @IsOptional()
    @Column('simple-json', { nullable: true })
    scores?: Score[] = [];

    @IsNumber()
    @Min(0)
    @IsOptional()
    @Column('float', { default: 0 })
    score?: number = 0;
}

export abstract class TeamBase extends HackathonBase {
    @Type(() => Team)
    @Transform(({ value }) => Team.from(value))
    @ValidateNested()
    @IsOptional()
    @ManyToOne(() => Team)
    team: Team;
}

export class TeamListChunk implements ListChunk<Team> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => Team)
    @ValidateNested({ each: true })
    list: Team[];
}

export class Score {
    @IsString()
    dimension: string;

    @IsInt()
    @Min(0)
    score: number;

    @IsString()
    @IsOptional()
    reason?: string;
}
