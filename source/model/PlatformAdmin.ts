import { Transform, Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested
} from 'class-validator';
import { Column, Entity, ManyToOne } from 'typeorm';

import { ListChunk } from './Base';
import { User, UserBase } from './User';

@Entity()
export class PlatformAdmin extends UserBase {
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

export class PlatformAdminListChunk implements ListChunk<PlatformAdmin> {
    @IsInt()
    @Min(0)
    count: number;

    @Type(() => PlatformAdmin)
    @ValidateNested({ each: true })
    list: PlatformAdmin[];
}
