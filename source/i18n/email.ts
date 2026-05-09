export type EmailLocale = 'en' | 'zh-CN';

export const resolveLocale = (languages?: string[]): EmailLocale => {
    for (const lang of languages ?? []) {
        // Maps all zh variants (zh-CN, zh-TW, zh-HK, etc.) to zh-CN (Simplified Chinese)
        if (lang.startsWith('zh')) return 'zh-CN';
    }
    return 'en';
};

export const emailMessages: Record<
    EmailLocale,
    {
        hackathonCreated: {
            subject: (name: string) => string;
            preview: (name: string) => string;
            heading: string;
            body: (name: string) => string;
            button: string;
        };
        hackathonStatusUpdated: {
            subject: (name: string, status: string) => string;
            preview: (name: string, status: string) => string;
            heading: string;
            body: (name: string, status: string) => string;
            button: string;
        };
        teamJoinRequest: {
            subject: (name: string) => string;
            preview: (name: string) => string;
            heading: string;
            body: (name: string) => string;
            button: string;
        };
        teamWorkSubmitted: {
            subject: (title: string) => string;
            preview: (title: string) => string;
            heading: string;
            body: (title: string) => string;
            button: string;
        };
        evaluationSubmitted: {
            subject: string;
            preview: string;
            heading: string;
            body: string;
            button: string;
        };
    }
> = {
    en: {
        hackathonCreated: {
            subject: (name: string) => `New Hackathon Needs Review: ${name}`,
            preview: (name: string) => `New Hackathon Needs Review: ${name}`,
            heading: 'New Hackathon Needs Review',
            body: (name: string) =>
                `A new hackathon "${name}" has been created and is awaiting your review.`,
            button: 'Review Hackathon'
        },
        hackathonStatusUpdated: {
            subject: (name: string, status: string) =>
                `Hackathon Status Updated: ${name} is now ${status}`,
            preview: (name: string, status: string) =>
                `Hackathon Status Updated: ${name} is now ${status}`,
            heading: 'Hackathon Status Updated',
            body: (name: string, status: string) =>
                `The hackathon "${name}" status has been updated to "${status}".`,
            button: 'View Hackathon'
        },
        teamJoinRequest: {
            subject: (name: string) => `New Team Join Request from ${name}`,
            preview: (name: string) => `New Team Join Request from ${name}`,
            heading: 'New Team Join Request',
            body: (name: string) => `${name} has applied to join your team.`,
            button: 'View Team'
        },
        teamWorkSubmitted: {
            subject: (title: string) => `New Team Work Submitted: ${title}`,
            preview: (title: string) => `New Team Work Submitted: ${title}`,
            heading: 'New Team Work Submitted',
            body: (title: string) => `Your team has submitted a new work: ${title}`,
            button: 'View Work'
        },
        evaluationSubmitted: {
            subject: 'New Evaluation Submitted for Your Team',
            preview: 'New Evaluation Submitted for Your Team',
            heading: 'New Evaluation Submitted',
            body: 'A new evaluation has been submitted for your team.',
            button: 'View Team'
        }
    },
    'zh-CN': {
        hackathonCreated: {
            subject: (name: string) => `新建黑客松待审核：${name}`,
            preview: (name: string) => `新建黑客松待审核：${name}`,
            heading: '新建黑客松待审核',
            body: (name: string) => `新建黑客松「${name}」已创建，正在等待您的审核。`,
            button: '审核黑客松'
        },
        hackathonStatusUpdated: {
            subject: (name: string, status: string) => `黑客松状态更新：${name} 现为 ${status}`,
            preview: (name: string, status: string) => `黑客松状态更新：${name} 现为 ${status}`,
            heading: '黑客松状态更新',
            body: (name: string, status: string) =>
                `黑客松「${name}」的状态已更新为「${status}」。`,
            button: '查看黑客松'
        },
        teamJoinRequest: {
            subject: (name: string) => `新的团队加入申请：${name}`,
            preview: (name: string) => `新的团队加入申请：${name}`,
            heading: '新的团队加入申请',
            body: (name: string) => `${name} 申请加入您的团队。`,
            button: '查看团队'
        },
        teamWorkSubmitted: {
            subject: (title: string) => `团队提交了新作品：${title}`,
            preview: (title: string) => `团队提交了新作品：${title}`,
            heading: '团队提交了新作品',
            body: (title: string) => `您的团队提交了新作品：${title}`,
            button: '查看作品'
        },
        evaluationSubmitted: {
            subject: '团队收到了新的评分',
            preview: '团队收到了新的评分',
            heading: '新的评分已提交',
            body: '您的团队收到了一份新的评分。',
            button: '查看团队'
        }
    }
};
