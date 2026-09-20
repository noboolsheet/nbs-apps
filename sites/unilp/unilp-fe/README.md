# UNILP

Sitio web estático informativo de **U.N.I.L.P. - Unione Nazionale Italiana Lavoratori e Pensionati**.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19
- TypeScript con `strict` activado
- Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com/) (componentes basados en Radix)
- [next-themes](https://github.com/pacocoursey/next-themes) para dark mode
- Sistema i18n custom (Context + objeto tipado en `lib/i18n.ts`)
- pnpm como package manager
- Export estático (`output: 'export'`) servido por **Nginx** en Docker, detrás de **Caddy** como reverse-proxy. `@vercel/analytics` se usa solo para la analítica, no para el despliegue.

## Comandos

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Servidor de desarrollo en http://localhost:3000
pnpm optimize-images  # Convertir image-sources/ → public/images/*.webp
pnpm build            # Build de producción (corre optimize-images vía `prebuild`)
pnpm start            # Servir el build
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
```

## Estructura

```
app/                    # Rutas (App Router)
  layout.tsx            # Root layout: fuentes, ThemeProvider, metadata
  page.tsx              # Home
  chi-siamo/            # Quiénes somos
  i-nostri-servizi/     # Servicios (detalle por servicio)
  i-nostri-lavoratori/  # Categorías de trabajadores
  modulo-iscrizione/    # Descarga del PDF de inscripción
  contatti/             # Formulario de contacto (POST a /api/contact → unilp-be)
  privacy/              # Política de privacidad
  cookies/              # Política de cookies
  note-legali/          # Note legali
components/
  ui/                   # Componentes shadcn (no editar a mano)
  translation-provider  # Context de i18n con localStorage
  theme-provider        # Wrapper de next-themes
  theme-toggle          # Botón sun/moon
  legal-page            # Renderer reutilizable para Privacy/Cookies/Note Legali
  header, footer, ...   # Layout y secciones del sitio
lib/
  i18n.ts               # Todas las traducciones (IT/ES/EN)
  service-images.ts     # Mapa slug → imagen (.webp) de cada servicio
  service-doc-links.ts  # Mapa slug → documento enlazado dentro de la descripción
  utils.ts              # Helpers (cn)
scripts/
  optimize-images.mjs   # Convierte image-sources/ a public/images/*.webp (sharp)
image-sources/          # Originales pesados PNG/JPG (NO se despliegan); ver su README
public/
  documents/            # PDFs (módulo de inscripción, accordo stato-regioni)
  images/               # .webp optimizados + logos (.png/.jpeg)
```

## Sistema de internacionalización

Todos los textos del sitio están en `lib/i18n.ts`, organizados por namespace (`nav`, `hero`, `servicesPage`, `legal.privacy`, etc.). Los componentes consumen las traducciones vía `useTranslation()`:

```tsx
import { useTranslation } from '@/components/translation-provider'

export function MyComponent() {
  const { t, language, setLanguage } = useTranslation()
  return <h1>{t.hero.headline}</h1>
}
```

### Idiomas soportados

`it` (default), `es`, `en`. Definidos en `languages` dentro de `lib/i18n.ts`.

### Cómo agregar una clave nueva

1. Abrir `lib/i18n.ts`.
2. Agregar la clave dentro del namespace correspondiente en **los tres idiomas** (`it`, `es`, `en`). La forma del objeto debe ser idéntica entre idiomas; TypeScript tipa `t` a partir de `translations.it`, así que un campo faltante en `es`/`en` no compila como error pero da en runtime `undefined`.
3. Usar la clave desde el componente: `t.namespace.miClave`.

### Cómo agregar un idioma nuevo

1. Agregarlo a `languages` en `lib/i18n.ts`.
2. Duplicar el bloque `translations.it` con la misma forma y traducir cada valor.
3. Verificar que el selector del header lo muestre (lo hace automáticamente).

### Persistencia y detección

El idioma se guarda en `localStorage` bajo la clave `unilp-lang`. Si no hay valor guardado, el provider intenta detectar el idioma del navegador (`navigator.language`); si tampoco matchea, cae a `it`.

El `<html lang>` y `document.title` se sincronizan automáticamente con el idioma activo desde `components/translation-provider.tsx`.

## Dark mode

Implementado con `next-themes` (`attribute="class"`, `defaultTheme="system"`). Las variables CSS están en `app/globals.css` bajo `:root` y `.dark`. El toggle vive en `components/theme-toggle.tsx` y se renderiza dentro del header.

## Optimización de imágenes

Las fotos del sitio se sirven como **WebP** para que carguen rápido. Los originales
pesados (PNG/JPG) viven en `image-sources/` (fuera de `public/`, así no se despliegan)
y `scripts/optimize-images.mjs` los convierte a `public/images/*.webp`.

El script corre solo antes de cada build (`prebuild`) y también a mano con
`pnpm optimize-images`; es idempotente (solo regenera lo que cambió). Para reemplazar
o agregar imágenes, ver **[`image-sources/README.md`](./image-sources/README.md)**.

> Las páginas referencian las imágenes como `/images/<nombre>.webp`
> (ver `lib/service-images.ts`). Los logos quedan como `.png/.jpeg` en `public/images/`.

## Formulario de contacto

El formulario (`app/contatti/contatti-client.tsx`) valida con Zod y hace `POST` a
`${API_BASE}/contact`, donde `API_BASE` es `/api` por defecto. En prod/nonprod **Caddy**
enruta `/api` al backend separado **`unilp-be/`** (Express + Nodemailer), por lo que
la llamada es same-origin. En desarrollo, apunta a un backend local con la variable
`NEXT_PUBLIC_API_BASE_URL`. Los secretos SMTP viven en `unilp-be/.env` (no trackeado);
ver el README de ese repo.

## Notas

- No hay tests ni pipeline CI configurados. ESLint sí está activo.
