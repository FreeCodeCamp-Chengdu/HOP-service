import { Transform, Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity, Index, ManyToOne, VirtualColumn } from 'typeorm';

import { ListChunk, Media } from './Base';
import { UserBase, UserBaseFilter, UserInputData } from './User';

export enum HackathonStatus {
    Planning = 'planning',
    PendingApproval = 'pendingApproval',
    Online = 'online',
    Offline = 'offline'
}

export class HackathonSessionRole {
    @IsBoolean()
    isAdmin: boolean;

    @IsBoolean()
    isJudge: boolean;

    @IsBoolean()
    isEnrolled: boolean;
}

@Entity()
export class Hackathon extends UserBase {
    @Matches(/^[\w-]+$/)
    @Column()
    @Index({ unique: true })
    name: string;

    @IsString()
    @Column({ unique: true })
    displayName: string;

    @IsString()
    @Column()
    ribbon: string;

    @IsString({ each: true })
    @Column('simple-json')
    tags: string[];

    @IsString()
    @Column()
    summary: string;

    @IsString()
    @Column('text')
    detail: string;

    @IsString()
    @Column()
    location: string;

    @Type(() => Media)
    @Transform(({ value }) =>
        (Array.isArray(value) ? value : [value]).filter(
            ({ uri, name, description }: Media) => uri && name && description
        )
    )
    @ValidateNested({ each: true })
    @Column('simple-json')
    banners: Media[];

    @IsEnum(HackathonStatus)
    @IsOptional()
    @Column({
        type: 'simple-enum',
        enum: HackathonStatus,
        default: HackathonStatus.Planning
    })
    status?: HackathonStatus = HackathonStatus.Planning;

    @IsBoolean()
    @IsOptional()
    @Column('boolean', { default: false })
    readOnly?: boolean = false;

    @IsBoolean()
    @IsOptional()
    @Column('boolean', { default: true })
    autoApprove?: boolean = true;

    @IsInt()
    @Min(0)
    @IsOptional()
    @Column({ nullable: true })
    maxEnrollment?: number;

    @IsInt()
    @Min(0)
    @IsOptional()
    @VirtualColumn({
        query: alias =>
            `SELECT COUNT(*) FROM "enrollment" WHERE "enrollment"."hackathonId" = ${alias}.id`
    })
    enrollment: number;

    @IsDateString()
    @Column('date')
    eventStartedAt: string;

    @IsDateString()
    @Column('date')
    eventEndedAt: string;

    @IsDateString()
    @Column('date')
    enrollmentStartedAt: string;

    @IsDateString()
    @Column('date')
    enrollmentEndedAt: string;

    @IsDateString()
    @Column('date')
    judgeStartedAt: string;

    @IsDateString()
    @Column('date')
    judgeEndedAt: string;

    @Type(() => HackathonSessionRole)
    @ValidateNested()
    @IsOptional()
    roles?: HackathonSessionRole;
}

export abstract class HackathonBase extends UserBase {
    @Type(() => Hackathon)
    @Transform(({ value }) => Hackathon.from(value))
    @ValidateNested()
    @IsOptional()
    @ManyToOne(() => Hackathon)
    hackathon: Hackathon;
}

export class HackathonFilter
    extends UserBaseFilter
    implements Partial<UserInputData<Hackathon>>
{
    @IsEnum(HackathonStatus)
    @IsOptional()
    status?: HackathonStatus;

    @IsBoolean()
    @IsOptional()
    readOnly?: boolean;

    @IsBoolean()
    @IsOptional()
    autoApprove?: boolean;
}

export class HackathonListChunk implements ListChunk<Hackathon> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => Hackathon)
    @ValidateNested({ each: true })
    list: Hackathon[];
}
