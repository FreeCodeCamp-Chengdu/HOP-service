import {
    Authorized,
    Body,
    CurrentUser,
    Delete,
    ForbiddenError,
    Get,
    HttpCode,
    JsonController,
    OnNull,
    OnUndefined,
    Param,
    Post,
    Put,
    QueryParams
} from 'routing-controllers';
import { ResponseSchema } from 'routing-controllers-openapi';

import {
    BaseFilter,
    Enrollment,
    HackathonListChunk,
    Role,
    SignInData,
    Staff,
    User,
    UserFilter,
    UserHackathonType,
    UserListChunk
} from '../model';
import {
    activityLogService,
    BaseService,
    hackathonService,
    sessionService
} from '../service';

const UserHackathonTypeRegExp = Object.values(UserHackathonType).join('|');

@JsonController('/user')
export class UserController {
    store = sessionService.userStore;
    service = new BaseService(User, ['email', 'mobilePhone', 'name']);

    @Get('/session')
    @Authorized()
    @ResponseSchema(User)
    getSession(@CurrentUser() user: User) {
        return user;
    }

    @Post('/session')
    @HttpCode(201)
    @ResponseSchema(User)
    async signIn(@Body() { email, password }: SignInData): Promise<User> {
        const user = await this.store.findOneBy({
            email,
            password: sessionService.encrypt(password)
        });
        if (!user) throw new ForbiddenError();

        return sessionService.sign(user);
    }

    @Post()
    @HttpCode(201)
    @ResponseSchema(User)
    signUp(@Body() data: SignInData) {
        return sessionService.signUp(data);
    }

    @Put('/:id')
    @Authorized()
    @ResponseSchema(User)
    async updateOne(
        @Param('id') id: number,
        @CurrentUser() updatedBy: User,
        @Body() { password, ...data }: User
    ) {
        if (!updatedBy.roles.includes(Role.Administrator) && id !== updatedBy.id)
            throw new ForbiddenError();

        await this.store.save({
            ...data,
            password: password && sessionService.encrypt(password),
            id
        });
        await activityLogService.logUpdate(updatedBy, 'User', id);

        return sessionService.sign(await this.store.findOneBy({ id }));
    }

    @Get(`/:id/hackathon/:type(${UserHackathonTypeRegExp})`)
    @ResponseSchema(HackathonListChunk)
    async getHackathonListByType(
        @Param('id') id: number,
        @Param('type') type: UserHackathonType,
        @QueryParams() { pageSize = 10, pageIndex = 1 }: BaseFilter
    ): Promise<HackathonListChunk> {
        const skip = pageSize * (pageIndex - 1);

        if (type === UserHackathonType.Enrollee) {
            const [list, count] = await hackathonService.store
                .createQueryBuilder('hackathon')
                .innerJoin(
                    Enrollment,
                    'enrollment',
                    'enrollment.hackathonId = hackathon.id AND enrollment.createdById = :id',
                    { id }
                )
                .leftJoinAndSelect('hackathon.createdBy', 'createdBy')
                .orderBy('hackathon.updatedAt', 'DESC')
                .skip(skip)
                .take(pageSize)
                .getManyAndCount();

            return { count, list };
        }

        if (type === UserHackathonType.Staff) {
            const [list, count] = await hackathonService.store
                .createQueryBuilder('hackathon')
                .innerJoin(
                    Staff,
                    'staff',
                    'staff.hackathonId = hackathon.id AND staff.userId = :id',
                    { id }
                )
                .leftJoinAndSelect('hackathon.createdBy', 'createdBy')
                .orderBy('hackathon.updatedAt', 'DESC')
                .skip(skip)
                .take(pageSize)
                .getManyAndCount();

            return { count, list };
        }

        return hackathonService.getList({ createdBy: id, pageSize, pageIndex });
    }

    @Get('/:id')
    @OnNull(404)
    @ResponseSchema(User)
    getOne(@Param('id') id: number) {
        return this.service.getOne(id);
    }

    @Delete('/:id')
    @Authorized()
    @OnUndefined(204)
    async deleteOne(@Param('id') id: number, @CurrentUser() deletedBy: User) {
        if (deletedBy.roles.includes(Role.Administrator) && id == deletedBy.id)
            throw new ForbiddenError();

        await this.store.softDelete(id);

        await activityLogService.logDelete(deletedBy, 'User', id);
    }

    @Get()
    @ResponseSchema(UserListChunk)
    getList(@QueryParams() filter: UserFilter) {
        return this.service.getList(filter);
    }
}
