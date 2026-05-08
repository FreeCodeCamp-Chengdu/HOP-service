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

interface HackathonStatusUpdatedProps {
    displayName: string;
    newStatus: string;
    hackathonUrl: string;
}

const HackathonStatusUpdated = ({
    displayName,
    newStatus,
    hackathonUrl
}: HackathonStatusUpdatedProps) => (
    <Html>
        <Head />
        <Preview>
            Hackathon Status Updated: {displayName} is now {newStatus}
        </Preview>
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
                    Hackathon Status Updated
                </Heading>
                <Section>
                    <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                        The hackathon <strong>{displayName}</strong> status has been updated to{' '}
                        <strong>{newStatus}</strong>.
                    </Text>
                </Section>
                <Section style={{ marginTop: '24px' }}>
                    <Button
                        href={hackathonUrl}
                        style={{
                            backgroundColor: '#4F46E5',
                            color: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '16px'
                        }}
                    >
                        View Hackathon
                    </Button>
                </Section>
            </Container>
        </Body>
    </Html>
);

export const renderHackathonStatusUpdated = (props: HackathonStatusUpdatedProps) =>
    render(<HackathonStatusUpdated {...props} />);

export default HackathonStatusUpdated;
