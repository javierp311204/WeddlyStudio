import { FAQ_ES } from './faq.es';
import { FAQ_EN } from './faq.en';
import { FAQ_FR } from './faq.fr';
import { FAQ_CA } from './faq.ca';

export const FAQ_MAP: Record<string, typeof FAQ_ES> = {
  es: FAQ_ES,
  en: FAQ_EN,
  fr: FAQ_FR,
  ca: FAQ_CA,
};