import { TranslationModel } from 'mobx-i18n';

import zhCN from './email/zh-CN';

export type EmailKey = keyof typeof zhCN;

export const i18n = new TranslationModel({
    'zh-CN': zhCN,
    en: () => import('./email/en')
});
