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

import { EmailI18n, I18nContext } from '../i18n/email';

type EvaluationSubmittedProps = { teamUrl: string };

export const EvaluationSubmitted: FC<EvaluationSubmittedProps> = ({ teamUrl }) => {
    const i18n = useContext(I18nContext);
    return (
        <Html>
            <Head />
            <Preview>{i18n.t('evaluation_submitted_subject')}</Preview>
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
                        {i18n.t('evaluation_submitted_heading')}
                    </Heading>
                    <Section>
                        <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                            {i18n.t('evaluation_submitted_body')}
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
                            {i18n.t('evaluation_submitted_button')}
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export const renderEvaluationSubmitted = async (
    props: { teamUrl: string },
    i18n: EmailI18n
): Promise<Record<'subject' | 'html', string>> => ({
    subject: i18n.t('evaluation_submitted_subject'),
    html: await render(
        <I18nContext.Provider value={i18n}>
            <EvaluationSubmitted {...props} />
        </I18nContext.Provider>
    )
});
