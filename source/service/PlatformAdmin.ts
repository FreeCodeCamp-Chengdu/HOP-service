import { PlatformAdmin } from '../model';
import { UserServiceWithLog } from './User';

export class PlatformAdminService extends UserServiceWithLog<PlatformAdmin> {
    isAdmin = (uid: number) => this.store.existsBy({ user: { id: uid } });
}

export const platformAdminService = new PlatformAdminService(PlatformAdmin, ['description']);
