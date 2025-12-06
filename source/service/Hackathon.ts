import { ForbiddenError } from 'routing-controllers';

import { Hackathon, StaffType } from '../model';
import { enrollmentService } from './Enrollment';
import { platformAdminService } from './PlatformAdmin';
import { staffService } from './Staff';
import { UserServiceWithLog } from './User';

export class HackathonService extends UserServiceWithLog<Hackathon> {
    async ensureAdmin(userId: number, hackathonName: string) {
        if (
            !(await staffService.store.existsBy({
                hackathon: { name: hackathonName },
                user: { id: userId },
                type: StaffType.Admin
            })) &&
            !(await platformAdminService.store.existsBy({
                user: { id: userId }
            }))
        )
            throw new ForbiddenError();
    }

    async ensureJudge(userId: number, hackathonName: string) {
        if (
            !(await staffService.store.existsBy({
                hackathon: { name: hackathonName },
                user: { id: userId },
                type: StaffType.Judge
            }))
        )
            throw new ForbiddenError();
    }

    async ensureEnrolled(userId: number, hackathonName: string) {
        if (
            !(await enrollmentService.store.existsBy({
                hackathon: { name: hackathonName },
                createdBy: { id: userId }
            }))
        )
            throw new ForbiddenError();
    }
}

export const hackathonService = new HackathonService(Hackathon, [
    'name',
    'displayName',
    'ribbon',
    'summary',
    'detail',
    'location',
    'tags'
]);
