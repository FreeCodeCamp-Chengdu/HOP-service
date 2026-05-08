import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text
} from '@react-email/components';
import { render } from '@react-email/render';
import React from 'react';

interface TeamWorkSubmittedProps {
    workTitle: string;
    teamUrl: string;
}

const TeamWorkSubmitted = ({ workTitle, teamUrl }: TeamWorkSubmittedProps) => (
    <Html>
        <Head />
        <Preview>New Team Work Submitted: {workTitle}</Preview>
        <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f4', padding: '20px' }}>
            <Container
                style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    padding: '32px'
                }}
            >
                <Heading style={{ color: '#333333', fontSize: '24px', marginBottom: '16px' }}>
                    New Team Work Submitted
                </Heading>
                <Section>
                    <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                        Your team has submitted a new work: <strong>{workTitle}</strong>
                    </Text>
                </Section>
                <Section style={{ marginTop: '24px' }}>
                    <Button
                        href={teamUrl}
                        style={{
                            backgroundColor: '#4F46E5',
                            color: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '16px'
                        }}
                    >
                        View Work
                    </Button>
                </Section>
            </Container>
        </Body>
    </Html>
);

export const renderTeamWorkSubmitted = (props: TeamWorkSubmittedProps) =>
    render(<TeamWorkSubmitted {...props} />);

export default TeamWorkSubmitted;
