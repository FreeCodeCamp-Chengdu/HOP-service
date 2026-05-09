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

type HackathonCreatedProps = Record<'displayName' | 'reviewUrl', string>;

export const HackathonCreated: FC<HackathonCreatedProps> = ({ displayName, reviewUrl }) => {
    const { t } = useContext(I18nContext);

    return (
        <Html>
            <Head />
            <Preview>{t('hackathon_created_subject', { name: displayName })}</Preview>
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
                        {t('hackathon_created_heading')}
                    </Heading>
                    <Section>
                        <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                            {t('hackathon_created_body', { name: displayName })}
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
                            {t('hackathon_created_button')}
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export const renderHackathonCreated = async (
    props: Record<'displayName' | 'reviewUrl', string>,
    i18n: I18nStore
): Promise<Record<'subject' | 'html', string>> => ({
    subject: i18n.t('hackathon_created_subject', { name: props.displayName }),
    html: await render(
        <I18nContext.Provider value={i18n}>
            <HackathonCreated {...props} />
        </I18nContext.Provider>
    )
});
