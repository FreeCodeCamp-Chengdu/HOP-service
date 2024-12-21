import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity } from 'typeorm';

import { Media } from './Base';
import { HackathonBase } from './Hackathon';

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
