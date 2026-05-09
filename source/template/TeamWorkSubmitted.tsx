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
import { FC, useContext } from 'react';

import { I18nStore, I18nContext } from '../translation';

type TeamWorkSubmittedProps = Record<'workTitle' | 'teamUrl', string>;

export const TeamWorkSubmitted: FC<TeamWorkSubmittedProps> = ({ workTitle, teamUrl }) => {
    const { t } = useContext(I18nContext);

    return (
        <Html>
            <Head />
            <Preview>{t('team_work_submitted_subject', { title: workTitle })}</Preview>
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
                        {t('team_work_submitted_heading')}
                    </Heading>
                    <Section>
                        <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                            {t('team_work_submitted_body', { title: workTitle })}
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
                            {t('team_work_submitted_button')}
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export const renderTeamWorkSubmitted = async (
    props: Record<'workTitle' | 'teamUrl', string>,
    i18n: I18nStore
): Promise<Record<'subject' | 'html', string>> => ({
    subject: i18n.t('team_work_submitted_subject', { title: props.workTitle }),
    html: await render(
        <I18nContext.Provider value={i18n}>
            <TeamWorkSubmitted {...props} />
        </I18nContext.Provider>
    )
});
