import * as Localization from 'expo-localization';
import i18n, { changeLanguage, use as registerPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { Storage } from '@services/storage.service';

import en from './locales/en.json';
import pl from './locales/pl.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';

export const SUPPORTED_LANGUAGES = ['en', 'ru', 'pl', 'uk'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
const LANGUAGE_STORAGE_KEY = 'app_language';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  pl: { translation: pl },
  uk: { translation: uk },
} as const;

function isSupported(lang: string | undefined | null): lang is SupportedLanguage {
  return !!lang && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

function detectInitialLanguage(): SupportedLanguage {
  const saved = Storage.get<string>(LANGUAGE_STORAGE_KEY);
  if (isSupported(saved)) return saved;

  const deviceLocales = Localization.getLocales();
  for (const locale of deviceLocales) {
    const code = locale.languageCode?.toLowerCase();
    if (isSupported(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

export function getStoredLanguage(): SupportedLanguage | undefined {
  const saved = Storage.get<string>(LANGUAGE_STORAGE_KEY);
  return isSupported(saved) ? saved : undefined;
}

export async function setAppLanguage(lang: SupportedLanguage): Promise<void> {
  Storage.set(LANGUAGE_STORAGE_KEY, lang);
  await changeLanguage(lang);
}

void registerPlugin(initReactI18next).init({
  resources,
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

export default i18n;
