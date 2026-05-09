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
import { FC } from 'react';

import { emailMessages, resolveLocale } from '../i18n/email';

type TeamWorkSubmittedProps = Record<'workTitle' | 'teamUrl', string> & { locale?: string };

export const TeamWorkSubmitted: FC<TeamWorkSubmittedProps> = ({ workTitle, teamUrl, locale }) => {
    const t = emailMessages[resolveLocale([locale])].teamWorkSubmitted;

    return (
        <Html>
            <Head />
            <Preview>{t.preview(workTitle)}</Preview>
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
                        {t.heading}
                    </Heading>
                    <Section>
                        <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                            {t.body(workTitle)}
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
                            {t.button}
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export const renderTeamWorkSubmitted = async (
    { workTitle, teamUrl }: Record<'workTitle' | 'teamUrl', string>,
    locale?: string
): Promise<{ subject: string; html: string }> => {
    const t = emailMessages[resolveLocale([locale])].teamWorkSubmitted;

    return {
        subject: t.subject(workTitle),
        html: await render(
            <TeamWorkSubmitted workTitle={workTitle} teamUrl={teamUrl} locale={locale} />
        )
    };
};
