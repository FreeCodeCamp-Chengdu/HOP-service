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

type HackathonStatusUpdatedProps = Record<'displayName' | 'newStatus' | 'hackathonUrl', string>;

export const HackathonStatusUpdated: FC<HackathonStatusUpdatedProps> = ({
    displayName,
    newStatus,
    hackathonUrl
}) => {
    const { t } = useContext(I18nContext);

    return (
        <Html>
            <Head />
            <Preview>
                {t('hackathon_status_updated_subject', { name: displayName, status: newStatus })}
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
                        {t('hackathon_status_updated_heading')}
                    </Heading>
                    <Section>
                        <Text style={{ color: '#555555', fontSize: '16px', lineHeight: '1.6' }}>
                            {t('hackathon_status_updated_body', {
                                name: displayName,
                                status: newStatus
                            })}
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
                            {t('hackathon_status_updated_button')}
                        </Button>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export const renderHackathonStatusUpdated = async (
    props: Record<'displayName' | 'newStatus' | 'hackathonUrl', string>,
    i18n: I18nStore
): Promise<Record<'subject' | 'html', string>> => ({
    subject: i18n.t('hackathon_status_updated_subject', {
        name: props.displayName,
        status: props.newStatus
    }),
    html: await render(
        <I18nContext.Provider value={i18n}>
            <HackathonStatusUpdated {...props} />
        </I18nContext.Provider>
    )
});
