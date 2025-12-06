import { ForbiddenError } from 'routing-controllers';

import { Hackathon, StaffType } from '../model';
import { enrollmentService } from './Enrollment';
import { platformAdminService } from './PlatformAdmin';
import { staffService } from './Staff';
import { UserServiceWithLog } from './User';

export class HackathonService extends UserServiceWithLog<Hackathon> {
    async ensureAdmin(userId: number, hackathonName: string) {
        const staff = await staffService.store.findOne({
            where: {
                hackathon: { name: hackathonName },
                user: { id: userId },
                type: StaffType.Admin
            },
            relations: ['hackathon']
        });

        if (
            !staff &&
            !(await platformAdminService.store.existsBy({
                user: { id: userId }
            }))
        )
            throw new ForbiddenError();

        return staff?.hackathon;
    }

    async ensureJudge(userId: number, hackathonName: string) {
        const staff = await staffService.store.findOne({
            where: {
                hackathon: { name: hackathonName },
                user: { id: userId },
                type: StaffType.Judge
            },
            relations: ['hackathon']
        });
        if (!staff) throw new ForbiddenError();

        return staff.hackathon;
    }

    async ensureEnrolled(userId: number, hackathonName: string) {
        const enrollment = await enrollmentService.store.findOne({
            where: {
                hackathon: { name: hackathonName },
                createdBy: { id: userId }
            },
            relations: ['hackathon']
        });
        if (!enrollment) throw new ForbiddenError();

        return enrollment.hackathon;
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
