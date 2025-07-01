import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity } from 'typeorm';

import { ListChunk } from './Base';
import { HackathonBase } from './Hackathon';
import { TeamBase } from './Team';

export enum QuestionType {
    Text = 'text',
    URL = 'url'
}

export class Question {
    @IsEnum(QuestionType)
    @IsOptional()
    type?: QuestionType;

    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    title: string;

    @IsString({ each: true })
    @IsOptional()
    options?: string[];

    @IsBoolean()
    @IsOptional()
    multiple?: boolean;

    @IsBoolean()
    @IsOptional()
    required?: boolean;
}

export class Answer {
    @IsString()
    title: string;

    @IsString()
    content: string;
}

@Entity()
export class Questionnaire extends HackathonBase {
    @Type(() => Question)
    @ValidateNested({ each: true })
    @Column('simple-json')
    questions: Question[];
}

export class Dimension {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    maximumScore?: number = 10;
}

@Entity()
export class Standard extends HackathonBase {
    @Type(() => Dimension)
    @ValidateNested({ each: true })
    @Column('simple-json')
    dimensions: Dimension[];
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

@Entity()
export class Evaluation extends TeamBase {
    @Type(() => Score)
    @ValidateNested({ each: true })
    @Column('simple-json')
    scores: Score[];

    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    comment?: string;
}

export class EvaluationListChunk implements ListChunk<Evaluation> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => Evaluation)
    @ValidateNested({ each: true })
    list: Evaluation[];
}
