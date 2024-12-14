import { Column, Entity, ManyToOne } from 'typeorm';
import {
    IsInt,
    IsOptional,
    IsString,
    IsEnum,
    IsObject,
    ValidateNested
} from 'class-validator';

import { Base, Media } from './Base';
import { Team } from './Team';
import { User } from './User';
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
    description: string;

    @IsInt()
    @IsOptional()
    @Column()
    quantity: number;

    @IsEnum(AwardTarget)
    @IsOptional()
    @Column({ type: 'simple-enum', enum: AwardTarget, nullable: true })
    target: AwardTarget;

    @IsObject({ each: true })
    @ValidateNested()
    @IsOptional()
    @Column({ type: 'simple-json', nullable: true })
    pictures?: Media[];
}
