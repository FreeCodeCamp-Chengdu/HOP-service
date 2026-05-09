import { createTransport, Transporter } from 'nodemailer';

import { TeamMemberRole, User } from '../model';
import { createI18n, I18nStore } from '../translation';
import { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } from '../utility';
import { platformAdminService } from './PlatformAdmin';
import { staffService } from './Staff';
import { teamMemberService } from './TeamMember';

export type LocalizedRenderer = (i18n: I18nStore) => Promise<Record<'subject' | 'html', string>>;

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

    async sendToUsers(users: User[], renderer: LocalizedRenderer) {
        if (!this.transporter) return;

        for (const user of users) {
            if (!user.email) continue;

            try {
                const i18n = createI18n();
                await i18n.loadLanguages(
                    ...((user.languages ?? []) as Parameters<typeof i18n.loadLanguages>)
                );
                const { subject, html } = await renderer(i18n);

                await this.transporter.sendMail({ from: SMTP_USER, to: user.email, subject, html });
            } catch (error) {
                console.error('[Email Service] Failed to send email:', error);
            }
        }
    }

    async sendToPlatformAdmins(renderer: LocalizedRenderer) {
        const admins = await platformAdminService.store.find({ relations: ['user'] });

        return this.sendToUsers(
            admins.map(({ user }) => user),
            renderer
        );
    }

    async sendToHackathonStaff(hackathonName: string, renderer: LocalizedRenderer) {
        const staffList = await staffService.store.find({
            where: { hackathon: { name: hackathonName } },
            relations: ['user']
        });
        return this.sendToUsers(
            staffList.map(({ user }) => user),
            renderer
        );
    }

    async sendToTeamMembers(
        teamId: number,
        role: TeamMemberRole | undefined,
        renderer: LocalizedRenderer
    ) {
        const members = await teamMemberService.store.find({
            where: { team: { id: teamId }, ...(role && { role }) },
            relations: ['user']
        });
        return this.sendToUsers(
            members.map(({ user }) => user),
            renderer
        );
    }
}

export const emailService = new EmailService();
