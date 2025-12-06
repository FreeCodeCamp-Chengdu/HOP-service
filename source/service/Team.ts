import { ForbiddenError } from 'routing-controllers';

import { Team, TeamMemberRole } from '../model';
import { platformAdminService } from './PlatformAdmin';
import { teamMemberService } from './TeamMember';
import { UserServiceWithLog } from './User';

export class TeamService extends UserServiceWithLog<Team> {
    async ensureAdmin(userId: number, teamId: number) {
        if (
            !(await teamMemberService.store.existsBy({
                team: { id: teamId },
                user: { id: userId },
                role: TeamMemberRole.Admin
            })) &&
            !(await platformAdminService.store.existsBy({
                user: { id: userId }
            }))
        )
            throw new ForbiddenError();
    }

    async ensureMember(userId: number, teamId: number) {
        if (
            !(await teamMemberService.store.existsBy({
                user: { id: userId },
                team: { id: teamId }
            }))
        )
            throw new ForbiddenError();
    }
}

export const teamService = new TeamService(Team, ['displayName', 'description']);
