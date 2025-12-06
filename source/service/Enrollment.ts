import { Enrollment } from '../model';
import { UserServiceWithLog } from './User';

export class EnrollmentService extends UserServiceWithLog<Enrollment> {
    isEnrolled = (userId: number, hackathonName: string) =>
        this.store.existsBy({
            hackathon: { name: hackathonName },
            createdBy: { id: userId }
        });
}

export const enrollmentService = new EnrollmentService(Enrollment, ['form']);
