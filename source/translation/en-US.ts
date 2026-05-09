export default {
    hackathon_created_subject: ({ name }: { name: string }) =>
        `New Hackathon Needs Review: ${name}`,
    hackathon_created_heading: 'New Hackathon Needs Review',
    hackathon_created_body: ({ name }: { name: string }) =>
        `A new hackathon "${name}" has been created and is awaiting your review.`,
    hackathon_created_button: 'Review Hackathon',

    hackathon_status_updated_subject: ({ name, status }: Record<'name' | 'status', string>) =>
        `Hackathon Status Updated: ${name} is now ${status}`,
    hackathon_status_updated_heading: 'Hackathon Status Updated',
    hackathon_status_updated_body: ({ name, status }: Record<'name' | 'status', string>) =>
        `The hackathon "${name}" status has been updated to "${status}".`,
    hackathon_status_updated_button: 'View Hackathon',

    team_join_request_subject: ({ name }: { name: string }) =>
        `New Team Join Request from ${name}`,
    team_join_request_heading: 'New Team Join Request',
    team_join_request_body: ({ name }: { name: string }) =>
        `${name} has applied to join your team.`,
    team_join_request_button: 'View Team',

    team_work_submitted_subject: ({ title }: { title: string }) =>
        `New Team Work Submitted: ${title}`,
    team_work_submitted_heading: 'New Team Work Submitted',
    team_work_submitted_body: ({ title }: { title: string }) =>
        `Your team has submitted a new work: ${title}`,
    team_work_submitted_button: 'View Work',

    evaluation_submitted_subject: 'New Evaluation Submitted for Your Team',
    evaluation_submitted_heading: 'New Evaluation Submitted',
    evaluation_submitted_body: 'A new evaluation has been submitted for your team.',
    evaluation_submitted_button: 'View Team'
} as const;
