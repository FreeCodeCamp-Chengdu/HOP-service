import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity } from 'typeorm';

import { ListChunk, Media } from './Base';
import { HackathonBase } from './Hackathon';
import { Team } from './Team';
import { User } from './User';

export enum AwardTarget {
    Team = 'team',
    Individual = 'individual'
}

@Entity()
export class Award extends HackathonBase {
    @IsString()
    @Column()
    name: string;

    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    description?: string;

    @IsInt()
    @Min(0)
    @IsOptional()
    @Column({ nullable: true })
    quantity?: number;

    @IsEnum(AwardTarget)
    @IsOptional()
    @Column({ type: 'simple-enum', enum: AwardTarget, nullable: true })
    target?: AwardTarget;

    @Type(() => Media)
    @ValidateNested({ each: true })
    @IsOptional()
    @Column({ type: 'simple-json', nullable: true })
    pictures?: Media[];
}

export class AwardListChunk implements ListChunk<Award> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => Award)
    @ValidateNested({ each: true })
    list: Award[];
}

@Entity()
export class AwardAssignment extends HackathonBase {
    @Type(() => Award)
    @Transform(({ value }) => Award.from(value))
    @ValidateNested()
    award: Award;

    @Type(() => User)
    @Transform(({ value }) => User.from(value))
    @ValidateNested()
    @IsOptional()
    user?: User;

    @Type(() => Team)
    @Transform(({ value }) => Team.from(value))
    @ValidateNested()
    @IsOptional()
    team?: Team;
}

export class AwardAssignmentListChunk implements ListChunk<AwardAssignment> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => AwardAssignment)
    @ValidateNested({ each: true })
    list: AwardAssignment[];
}
