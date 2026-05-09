export default {
    hackathon_created_subject: ({ name }: { name: string }) =>
        `新建黑客松待审核：${name}`,
    hackathon_created_heading: '新建黑客松待审核',
    hackathon_created_body: ({ name }: { name: string }) =>
        `新建黑客松「${name}」已创建，正在等待您的审核。`,
    hackathon_created_button: '审核黑客松',

    hackathon_status_updated_subject: ({ name, status }: Record<'name' | 'status', string>) =>
        `黑客松状态更新：${name} 现为 ${status}`,
    hackathon_status_updated_heading: '黑客松状态更新',
    hackathon_status_updated_body: ({ name, status }: Record<'name' | 'status', string>) =>
        `黑客松「${name}」的状态已更新为「${status}」。`,
    hackathon_status_updated_button: '查看黑客松',

    team_join_request_subject: ({ name }: { name: string }) =>
        `新的团队加入申请：${name}`,
    team_join_request_heading: '新的团队加入申请',
    team_join_request_body: ({ name }: { name: string }) =>
        `${name} 申请加入您的团队。`,
    team_join_request_button: '查看团队',

    team_work_submitted_subject: ({ title }: { title: string }) =>
        `团队提交了新作品：${title}`,
    team_work_submitted_heading: '团队提交了新作品',
    team_work_submitted_body: ({ title }: { title: string }) =>
        `您的团队提交了新作品：${title}`,
    team_work_submitted_button: '查看作品',

    evaluation_submitted_subject: '团队收到了新的评分',
    evaluation_submitted_heading: '新的评分已提交',
    evaluation_submitted_body: '您的团队收到了一份新的评分。',
    evaluation_submitted_button: '查看团队'
} as const;
