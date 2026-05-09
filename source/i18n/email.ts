import { createContext } from 'react';
import { TranslationModel } from 'mobx-i18n';

import zhCN from '../translation/zh-CN';

export type EmailKey = keyof typeof zhCN;
export type EmailI18n = ReturnType<typeof createI18n>;

export const createI18n = () =>
    new TranslationModel({
        'zh-CN': zhCN,
        'zh-TW': () => import('../translation/zh-TW'),
        'en-US': () => import('../translation/en-US')
    });

export const I18nContext = createContext<EmailI18n>(createI18n());
