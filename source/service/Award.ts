import { Award, AwardAssignment } from '../model';
import { UserServiceWithLog } from './User';

export class AwardService extends UserServiceWithLog<Award> {}

export const awardService = new AwardService(Award, ['name', 'description']);

export class AwardAssignmentService extends UserServiceWithLog<AwardAssignment> {
    getListByDimension(
        dimension: keyof AwardAssignment,
        id: number,
        pageSize: number,
        pageIndex: number
    ) {
        return this.getList(
            { pageSize, pageIndex },
            { [dimension]: { id } },
            { relations: ['createdBy', 'updatedBy', 'award', 'user', 'team'] }
        );
    }
}
export const awardAssignmentService = new AwardAssignmentService(AwardAssignment);
