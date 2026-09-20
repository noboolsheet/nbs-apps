/**
 * Slugify determinista para `slug` de services/clients/projects (doc 5 UNIQUE(org, slug)).
 * ASCII, minúsculas, guiones. La unicidad por organización la garantiza la DB + la app.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // quita diacríticos combinados
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
