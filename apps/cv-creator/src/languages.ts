import { TemplateLanguage } from './types';

// Idiomas soportados por las plantillas y la traducción con IA.
export const LANGUAGE_OPTIONS: { code: TemplateLanguage; name: string; short: string }[] = [
  { code: 'es', name: 'Español 🇪🇸', short: 'ES' },
  { code: 'en', name: 'English 🇬🇧', short: 'EN' },
  { code: 'it', name: 'Italiano 🇮🇹', short: 'IT' },
  { code: 'de', name: 'Deutsch 🇩🇪', short: 'DE' },
  { code: 'fr', name: 'Français 🇫🇷', short: 'FR' },
  { code: 'pt', name: 'Português 🇵🇹', short: 'PT' },
];

export const langLabel = (code?: TemplateLanguage): string =>
  LANGUAGE_OPTIONS.find((l) => l.code === (code || 'es'))?.name || 'Español 🇪🇸';

export const langShort = (code?: TemplateLanguage): string =>
  LANGUAGE_OPTIONS.find((l) => l.code === (code || 'es'))?.short || 'ES';
