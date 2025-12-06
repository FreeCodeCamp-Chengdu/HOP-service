import { Staff, StaffType } from '../model';
import { UserServiceWithLog } from './User';

export class StaffService extends UserServiceWithLog<Staff> {
    isAdmin = (userId: number, hackathonName: string) =>
        this.store.existsBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Admin
        });

    isJudge = (userId: number, hackathonName: string) =>
        this.store.existsBy({
            hackathon: { name: hackathonName },
            user: { id: userId },
            type: StaffType.Judge
        });
}

export const staffService = new StaffService(Staff, ['description']);
