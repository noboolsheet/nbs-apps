/*
  Service slug -> hero image. Single source of truth, keyed by the slug id in
  i18n `servicesPage.items` (not by index), so reordering services never
  mismatches an image. Filenames preserve the on-disk casing in public/images.
  Swap a value here to replace a service image; no component changes needed.
*/
export const serviceImages: Record<string, string> = {
  'formazione-finanziata': '/images/S1_formazione.webp',
  'assistenza-welfare': '/images/S2_welfare.webp',
  'assistenza-fiscale': '/images/S3_fiscale.webp',
  'dimissioni-telematiche': '/images/S4_dimissioni.webp',
  'sicurezza-lavoro': '/images/S5_sicurezza.webp',
  'conciliazioni': '/images/S6_Conciliazione.webp',
  'contratti-aziendali': '/images/S7_contratti.webp',
  'servizi-patronato': '/images/S8_patronato.webp',
}
