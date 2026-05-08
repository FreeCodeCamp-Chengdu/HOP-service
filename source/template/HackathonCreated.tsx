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

interface HackathonCreatedProps {
    displayName: string;
    reviewUrl: string;
}

const HackathonCreated = ({ displayName, reviewUrl }: HackathonCreatedProps) => (
    <Html>
        <Head />
        <Preview>New Hackathon Needs Review: {displayName}</Preview>
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
                    New Hackathon Needs Review
                </Heading>
                <Section>
                    <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                        A new hackathon <strong>{displayName}</strong> has been created and is
                        awaiting your review.
                    </Text>
                </Section>
                <Section style={{ marginTop: '24px' }}>
                    <Button
                        href={reviewUrl}
                        style={{
                            backgroundColor: '#4F46E5',
                            color: '#ffffff',
                            padding: '12px 24px',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '16px'
                        }}
                    >
                        Review Hackathon
                    </Button>
                </Section>
            </Container>
        </Body>
    </Html>
);

export const renderHackathonCreated = (props: HackathonCreatedProps) =>
    render(<HackathonCreated {...props} />);

export default HackathonCreated;
