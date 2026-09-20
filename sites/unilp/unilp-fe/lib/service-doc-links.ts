import type { Language } from '@/lib/i18n'

/*
  Enlaces a documentos dentro de la descripción de un servicio, keyed por el slug
  de `servicesPage.items` (mismo patrón que service-images.ts). `phrase` es el
  texto exacto dentro de la descripción de cada idioma que debe convertirse en
  enlace al `href`. Si la frase no aparece en la descripción, no se inserta nada.
*/
export const serviceDocLinks: Record<
  string,
  { href: string; phrase: Record<Language, string> }
> = {
  'sicurezza-lavoro': {
    href: '/documents/accordo-stato-regioni-formazione-2025.pdf',
    phrase: {
      it: 'D.Lgs. 81/2008',
      es: 'D.Lgs. 81/2008',
      en: 'Legislative Decree 81/2008',
    },
  },
}
