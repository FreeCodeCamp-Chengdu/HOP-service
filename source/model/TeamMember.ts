import { Transform, Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';

import { BaseFilter, InputData, ListChunk } from './Base';
import { TeamBase } from './Team';
import { User } from './User';

export enum TeamMemberStatus {
    PendingApproval = 'pendingApproval',
    Approved = 'approved'
}

export enum TeamMemberRole {
    Admin = 'admin',
    Member = 'member'
}

@Entity()
export class TeamMember extends TeamBase {
    @IsEnum(TeamMemberRole)
    @IsOptional()
    @Column({
        type: 'simple-enum',
        enum: TeamMemberRole,
        default: TeamMemberRole.Member
    })
    role?: TeamMemberRole = TeamMemberRole.Member;

    @Type(() => User)
    @Transform(({ value }) => User.from(value))
    @ValidateNested()
    @IsOptional()
    @ManyToOne(() => User)
    user: User;

    @IsString()
    @Column('text')
    description: string;

    @IsEnum(TeamMemberStatus)
    @IsOptional()
    @Column({
        type: 'simple-enum',
        enum: TeamMemberStatus,
        default: TeamMemberStatus.PendingApproval
    })
    status?: TeamMemberStatus = TeamMemberStatus.PendingApproval;
}

export class TeamMemberFilter
    extends BaseFilter
    implements Partial<InputData<TeamMember>>
{
    @IsEnum(TeamMemberRole)
    @IsOptional()
    role?: TeamMemberRole;

    @IsEnum(TeamMemberStatus)
    @IsOptional()
    status?: TeamMemberStatus;
}

export class TeamMemberListChunk implements ListChunk<TeamMember> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => TeamMember)
    @ValidateNested({ each: true })
    list: TeamMember[];
}
