import { TeamMember, TeamMemberRole, TeamMemberStatus } from '../model';
import { UserServiceWithLog } from './User';

export class TeamMemberService extends UserServiceWithLog<TeamMember> {
    isAdmin = (userId: number, teamId: number) =>
        this.store.existsBy({
            team: { id: teamId },
            user: { id: userId },
            role: TeamMemberRole.Admin
        });

    isMember = (userId: number, teamId: number) =>
        this.store.existsBy({ user: { id: userId }, team: { id: teamId } });

    addOne = (member: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>) =>
        this.createOne(
            {
                status: member.team.autoApprove
                    ? TeamMemberStatus.Approved
                    : TeamMemberStatus.PendingApproval,
                ...member
            },
            member.createdBy
        );
}

export const teamMemberService = new TeamMemberService(TeamMember, ['description']);
