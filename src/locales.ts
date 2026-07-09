import es from './locales/es.json';
import pl from './locales/pl.json';

export type Language = 'es' | 'pl';

// The Translation shape is derived directly from es.json (the source
// language). Adding a key to src/locales/es.json — and running
// `npm run i18n:sync` to fill it into pl.json — is the only step needed;
// this type and the `translations` record below update automatically.
export type Translation = typeof es;

export const translations: Record<Language, Translation> = {
  es,
  pl: pl as Translation,
};
