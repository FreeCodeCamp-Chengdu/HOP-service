import { TranslationModel } from 'mobx-i18n';
import { createContext } from 'react';

import zhCN from './zh-CN';

export type TranslationKey = keyof typeof zhCN;
export type I18nStore = ReturnType<typeof createI18n>;

export const createI18n = () =>
    new TranslationModel({
        'zh-CN': zhCN,
        'zh-TW': () => import('./zh-TW'),
        'en-US': () => import('./en-US')
    });
export const I18nContext = createContext<I18nStore>(createI18n());
