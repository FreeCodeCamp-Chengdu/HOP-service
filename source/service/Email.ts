import { createTransport, Transporter } from 'nodemailer';

import { TeamMemberRole, User } from '../model';
import { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } from '../utility';
import { platformAdminService } from './PlatformAdmin';
import { staffService } from './Staff';
import { teamMemberService } from './TeamMember';

export class EmailService {
    private transporter: Transporter | null =
        SMTP_HOST && SMTP_USER && SMTP_PASSWORD
            ? createTransport({
                  host: SMTP_HOST,
                  port: +(SMTP_PORT ?? 587),
                  secure: +(SMTP_PORT ?? 587) === 465,
                  auth: { user: SMTP_USER, pass: SMTP_PASSWORD }
              })
            : null;

    private async send(to: string | string[], subject: string, html: string) {
        const recipients = Array.isArray(to) ? to.filter(Boolean) : to;

        if (!this.transporter || !recipients[0]) return;

        try {
            return await this.transporter.sendMail({
                from: SMTP_USER,
                to: recipients,
                subject,
                html
            });
        } catch (error) {
            console.error('[Email Service] Failed to send email:', error);
        }
    }

    sendToUsers(users: User[], subject: string, html: string) {
        const emails = users.map(({ email }) => email).filter(Boolean);

        return this.send(emails, subject, html);
    }

    async sendToPlatformAdmins(subject: string, html: string) {
        const admins = await platformAdminService.store.find({ relations: ['user'] });

        return this.sendToUsers(
            admins.map(({ user }) => user),
            subject,
            html
        );
    }

    async sendToHackathonStaff(hackathonName: string, subject: string, html: string) {
        const staffList = await staffService.store.find({
            where: { hackathon: { name: hackathonName } },
            relations: ['user']
        });
        return this.sendToUsers(
            staffList.map(({ user }) => user),
            subject,
            html
        );
    }

    async sendToTeamMembers(
        teamId: number,
        role: TeamMemberRole | undefined,
        subject: string,
        html: string
    ) {
        const members = await teamMemberService.store.find({
            where: { team: { id: teamId }, ...(role && { role }) },
            relations: ['user']
        });
        return this.sendToUsers(
            members.map(({ user }) => user),
            subject,
            html
        );
    }
}

export const emailService = new EmailService();
