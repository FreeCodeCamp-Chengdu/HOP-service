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

import { ListChunk } from './Base';
import { HackathonBase } from './Hackathon';
import { User, UserBaseFilter, UserInputData } from './User';

export enum StaffType {
    Admin = 'admin',
    Judge = 'judge',
    Member = 'member'
}

@Entity()
export class Staff extends HackathonBase {
    @IsEnum(StaffType)
    @IsOptional()
    @Column({ type: 'simple-enum', enum: StaffType })
    type: StaffType;

    @Type(() => User)
    @Transform(({ value }) => User.from(value))
    @ValidateNested()
    @IsOptional()
    @ManyToOne(() => User)
    user: User;

    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    description?: string;
}

export class StaffFilter
    extends UserBaseFilter
    implements Partial<UserInputData<Staff>>
{
    @IsInt()
    @Min(1)
    @IsOptional()
    user?: number;
}

export class StaffListChunk implements ListChunk<Staff> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => Staff)
    @ValidateNested({ each: true })
    list: Staff[];
}
