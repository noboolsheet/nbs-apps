# Sistema de tema — tokens semánticos + primitivas UI

Fuente única del color y la forma de la UI. **Para cambiar un color en toda la app, se edita en un solo sitio.**

## Cómo cambiar un color (lo importante)
Edita el token en **`apps/web/app/globals.css`** (bloque `:root` para claro; `@media (prefers-color-scheme: dark)` y
`:root[data-theme="dark"]` para oscuro). Se propaga a todo lo que use su utilidad. Ejemplos:
- Color de acción primaria (botones): `--primary` / `--primary-fg`.
- Enlaces: `--link`. Peligro: `--danger`. Aviso: `--warning`. Éxito: `--success`. Acento: `--accent`.
- Superficies: `--surface`, `--surface-muted`, `--field` (inputs). Bordes: `--line`, `--line-strong`. Texto: `--fg`,
  `--fg-muted`, `--fg-subtle`.
- Badges (pares fondo+texto): `--success-soft(-fg)`, `--warning-soft(-fg)`, `--danger-soft(-fg)`, `--neutral-soft(-fg)`,
  `--accent-soft(-fg)`. Los usa `components/ui/status-tone.ts` (StatusBadge, HealthBadge) y `source-badge.tsx`.
- **Estados «cerrados sin más que hacer»** (un pago pagado, un recurso revisado): par `--info-soft(-fg)` (azul), tono
  `blue` de `status-tone`.
- **Foco de teclado**: `--ring` (color del anillo de `:focus-visible`). **Fila seleccionada** en tablas: `--row-selected`.

Los tokens se exponen como utilidades Tailwind vía `@theme inline` → `bg-surface`, `text-fg`, `text-muted`(=`text-fg-muted`),
`border-line`, `bg-primary`, `text-primary-fg`, `text-link`, `text-danger`, `bg-success-soft`, etc. **La misma clase vale
claro y oscuro** (el token se voltea solo), así que en clases nuevas **no hace falta escribir `dark:`**.

## Primitivas (forma) — `apps/web/components/ui/`
- **`button.tsx`**: `<Button variant="primary|secondary|surface|ghost|danger" size="sm|md">` (`surface` = fondo propio
  + borde + sombra, para botones **dentro de una Card** del mismo color, donde el borde solo no basta) y las cadenas `btnPrimary`/
  `btnSecondary`/`btnGhost`/`btnDanger` + `buttonCls(variant,size)` (para `<button>`/`<RecordLink>` existentes).
- **`input.tsx`**: `<Input>/<Textarea>/<Select>` y `fieldCls` (estilo de campo, sin ancho; añade `w-full` donde toque).
- **`card.tsx`**: `<Card>` (contenedor con borde/superficie por token).
- **`text-link.tsx`**: `<TextLink>` + `linkCls`.

Para un botón/campo nuevo: usa la primitiva o su cadena. **No** vuelvas a copiar `rounded bg-neutral-900 …`.

## Secciones plegables
`components/ui/collapsible-section.tsx` (`<details>/<summary>` nativos, sin JavaScript ni estado en React) para las
listas largas: contador junto al título y `defaultOpen` cuando hay algo que atender. Se usa en Automatización.

## Foco de teclado (accesibilidad)
`globals.css` define una **red de seguridad** con especificidad 0:
`:where(a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1'])):focus-visible` pinta
`outline: 2px solid var(--ring)` con `outline-offset: 2px`. Cubre **todo** lo interactivo (incluido lo que se escriba
en el futuro) y cualquier componente puede sobreescribirlo con una utilidad Tailwind. Se excluye `tabindex="-1"`
porque son los contenedores de diálogo (panel lateral, drawer, ⌘K) que reciben foco por programa al abrirse: no deben
pintar anillo. Las primitivas `Button` y `fieldCls` declaran además su
`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring` explícito.

**Regla:** en un control nuevo no hace falta añadir nada; si le pones un fondo que tape el anillo, usa la utilidad
`focus-visible:outline-ring` con el offset que corresponda, nunca `outline-none` a secas.

## Modo oscuro
Automático por `prefers-color-scheme` (como el SO). Los tokens ya son **toggle-ready**: para añadir un selector manual,
basta poner `data-theme="dark"|"light"` en `<html>` (gana al del sistema); los overrides ya están en el CSS.

## Estado de la migración
- [x] **Fundación + primitivas** (`Button`/`Input`/`Card`/`TextLink`) + refactor de badges.
- [x] **Páginas `app/(app)/**` + chrome de componentes**: color crudo `neutral-*`/`dark:` migrado a tokens (de ~592 a 0
  usos crudos, salvo el bloque de código de `markdown` —fondo oscuro intencional— y los overlays `bg-black/*`).
- [x] **Rojos/ámbar sueltos** unificados a `text-danger`/`text-warning` y a callouts con `border-danger-border`/
  `border-warning-border` + `bg-*-soft` (0 rojos/ámbar crudos).
- [x] **Últimos 4 colores crudos eliminados (2026-09-01)**: los checkboxes (`data-table.tsx`, `record-panel.tsx`) usan
  `accent-primary` y la fila seleccionada `bg-row-selected` (antes `accent-neutral-900 dark:accent-neutral-100` y
  `bg-blue-50/60 dark:bg-blue-950/20`). Ahora sí: **0 colores crudos** fuera de `markdown` y los overlays `bg-black/*`.

- [x] **Tipografía**: `next/font` (Inter, auto-hospedada) expone el token `--font-sans`, que consume `body` en
  `globals.css` (con el system stack de fallback). Cambiar de fuente = editar `app/layout.tsx`.
- [x] **`<Card>`** adoptado en las tarjetas/tiles genuinas (metric-card, tiles de automation/health). Los `<li>` de
  fila y los wrappers de tabla/modales se dejan (Card es un `<div>`; no son "cards"). `cardCls` disponible para `<Link>`/`<li>`.

### Pendiente (opcional)
- [ ] Selector de tema claro/oscuro/sistema (los tokens ya lo soportan vía `data-theme`).

## Regla al añadir UI nueva
1) Colores → utilidades de token (`bg-surface`/`text-fg`/`text-primary-fg`/`text-danger`…), sin `dark:`.
2) Botones/campos → primitivas de `components/ui/{button,input,card,text-link}`.
3) Estado/salud/fuente → `StatusBadge`/`HealthBadge`/`SourceBadge` (ya centralizados en `status-tone.ts`).
