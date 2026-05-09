export default {
    hackathon_created_subject: ({ name }: { name: string }) =>
        `新建黑客松待審核：${name}`,
    hackathon_created_heading: '新建黑客松待審核',
    hackathon_created_body: ({ name }: { name: string }) =>
        `新建黑客松「${name}」已建立，正在等待您的審核。`,
    hackathon_created_button: '審核黑客松',

    hackathon_status_updated_subject: ({ name, status }: Record<'name' | 'status', string>) =>
        `黑客松狀態更新：${name} 現為 ${status}`,
    hackathon_status_updated_heading: '黑客松狀態更新',
    hackathon_status_updated_body: ({ name, status }: Record<'name' | 'status', string>) =>
        `黑客松「${name}」的狀態已更新為「${status}」。`,
    hackathon_status_updated_button: '查看黑客松',

    team_join_request_subject: ({ name }: { name: string }) =>
        `新的團隊加入申請：${name}`,
    team_join_request_heading: '新的團隊加入申請',
    team_join_request_body: ({ name }: { name: string }) =>
        `${name} 申請加入您的團隊。`,
    team_join_request_button: '查看團隊',

    team_work_submitted_subject: ({ title }: { title: string }) =>
        `團隊提交了新作品：${title}`,
    team_work_submitted_heading: '團隊提交了新作品',
    team_work_submitted_body: ({ title }: { title: string }) =>
        `您的團隊提交了新作品：${title}`,
    team_work_submitted_button: '查看作品',

    evaluation_submitted_subject: '團隊收到了新的評分',
    evaluation_submitted_heading: '新的評分已提交',
    evaluation_submitted_body: '您的團隊收到了一份新的評分。',
    evaluation_submitted_button: '查看團隊'
} as const;
