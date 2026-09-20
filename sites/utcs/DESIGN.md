---
name: UTCS
description: Modern, accredited civic identity for an Italian business association — official brand green #3A783B & red #E91C34 on impeccable white #FFFFFF.
colors:
  # OFFICIAL BRAND PALETTE — the three principal colors are normative.
  # OKLCH is canonical (project doctrine); the source-of-truth hex is in the comment.
  background: "oklch(1 0 0)"            # brand white  #FFFFFF
  primary: "oklch(0.516 0.113 144)"    # brand green  #3A783B
  accent: "oklch(0.597 0.230 23.6)"    # brand red    #E91C34
  primary-foreground: "oklch(1 0 0)"   # white on green
  accent-foreground: "oklch(1 0 0)"    # white on red
  primary-soft: "oklch(0.95 0.04 144)" # pale green tint of #3A783B
  accent-soft: "oklch(0.96 0.03 24)"   # pale red tint of #E91C34
  surface: "oklch(0.985 0.003 160)"
  foreground: "oklch(0.18 0.02 160)"
  muted-foreground: "oklch(0.48 0.02 160)"
  secondary: "oklch(0.97 0.005 150)"
  secondary-foreground: "oklch(0.22 0.04 144)"
  destructive: "oklch(0.55 0.22 27)"
  border: "oklch(0.92 0.008 160)"
typography:
  display:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  section-y: "5rem"
  section-y-lg: "7rem"
  gutter: "1rem"
  gutter-lg: "2rem"
  container: "80rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 2rem"
    height: "2.5rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
    padding: "1.75rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "2.25rem"
  pill-eyebrow:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "0.25rem 0.75rem"
  nav-link:
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    padding: "0.5rem 1rem"
---

# Design System: UTCS

## 1. Overview

**Creative North Star: "The Modern Civic Standard"**

UTCS is an accredited Italian business association (CAF, Patronato, APL, formazione) that has to read as *current* without ever reading as *casual*. The visual system is the institutional equivalent of a well-cut suit: impeccable white space, a precise grid, serif headlines that carry weight, and the Italian tricolore deployed as a **seal of authority** rather than as decoration. The green and red are earned marks of national accreditation — used at the edges and accents, never splashed across surfaces.

The system rejects two failure modes explicitly. First, the **dated public-sector / PA look**: cluttered portals, walls of text, labyrinth menus, the "ufficio anni 2000" aesthetic. Second, the **generic SaaS template**: gradient blobs, the hero-metric grid ("+30 anni / 5 servizi / ∞ clienti"), endless identical icon-cards, decorative glassmorphism. UTCS sits between those poles — modern and efficient like a good product, credible and sober like a public institution.

Density is generous, not cramped: large section padding, a single 80rem column, and clear one-thing-per-section rhythm so a non-technical business owner is never lost. Surfaces are calm (white and a near-white `surface`); attention is directed by type scale and the rare appearance of color, not by competing boxes.

**Key Characteristics:**
- Impeccable white canvas; near-white `surface` for sectional rhythm.
- Playfair Display serif headlines paired with Inter for crisp, legible body.
- Tricolore (green primary, red accent) used as a seal — accents, hairlines, soft tints — never as a wash.
- Refined & restrained components: soft shadows on interaction only, generous radii, low-contrast borders.
- Generous spacing, single column, one idea per section.

## 2. Colors

A near-monochrome white-and-ink base, accented by the two Italian national colors used with strict discipline. **The brand is defined by exactly three principal colors:** green `#3A783B`, red `#E91C34`, white `#FFFFFF`.

### Primary
- **Accredited Green** — `#3A783B` (`oklch(0.516 0.113 144)`): The official institutional green of UTCS. Carries primary CTAs ("Diventa associato", "Registrati"), active nav, icons, links, and the green half of the `gradient-italia`. It signals the body's accreditation and is the default voice of action.
- **Soft Green Wash** (`oklch(0.95 0.04 144)` — `primary-soft`): Pale green tint of `#3A783B` for icon chips, dropdown hover rows, and quiet highlight surfaces. The only place green appears as a fill rather than an accent.

### Secondary / Accent
- **Tricolore Red** — `#E91C34` (`oklch(0.597 0.230 23.6)` — `accent`): The official Italian red. Reserved for the smallest, sharpest signals — the live dot on a hero eyebrow, the red half of `gradient-italia`, a single emphasized timeline node. Deliberately rare; its scarcity is what makes it read as a flag and not as an alert.
- **Soft Red Wash** (`oklch(0.96 0.03 24)` — `accent-soft`): Faint red tint of `#E91C34` for occasional accent surfaces.

### Neutral
- **Impeccable White** — `#FFFFFF` (`oklch(1 0 0)` — `background`): The primary canvas and the third principal brand color. Pure, not cream. Whiteness is a deliberate identity choice (crisp, institutional, modern), not a default.
- **Surface** (`oklch(0.985 0.003 160)`): Whisper-cool near-white for alternating sections and cards, giving rhythm without borders or shadows.
- **Ink** (`oklch(0.18 0.02 160)` — `foreground`): Near-black with a faint green undertone. All headings and body text. Also the inverted dark surface (`bg-foreground text-background`) for the contact band and footer.
- **Muted Ink** (`oklch(0.48 0.02 160)` — `muted-foreground`): Secondary text, descriptions, labels. **Verified ≥4.5:1 on white** — this is the floor; never lighten body text past it.
- **Hairline** (`oklch(0.92 0.008 160)` — `border`): Low-contrast borders and dividers on cards, inputs, and the scrolled header.

### Named Rules
**The Official-Palette Rule.** The brand is built on exactly three principal colors and they are non-negotiable: **green `#3A783B`**, **red `#E91C34`**, **white `#FFFFFF`**. Every other token (surface, ink, borders, soft washes) is a neutral or a tint derived from these. Do not introduce a fourth brand hue; do not substitute a different green or red.

**The Tricolore-Is-A-Seal Rule.** Green and red together (`gradient-italia`, paired marks) appear only as a sealing device — a hero CTA band, a 1px top accent bar, a single highlighted card. Never tint a content surface with both. The flag authenticates; it does not wallpaper.

**The Rare-Red Rule.** `accent` (red) is used on ≤5% of any screen — dots, hairlines, one node. If red is filling an area, it is wrong; reach for `primary` or ink instead.

## 3. Typography

**Display Font:** Playfair Display (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, -apple-system, sans-serif fallback)

**Character:** A high-contrast transitional serif against a neutral grotesque sans — a deliberate contrast-axis pairing, not two similar sans. Playfair gives headlines institutional gravitas and an editorial, distinctly Italian elegance; Inter keeps body copy modern, neutral, and ruthlessly legible for a non-technical audience. The serif says "established and serious"; the sans says "and easy to deal with."

### Hierarchy
- **Display** (700, `clamp(2.25rem, 5vw, 3.75rem)`, line-height 1.05, `-0.02em`): Hero and section H1/H2. Ceiling held at ~3.75rem — confident, not shouting. Use `text-wrap: balance`.
- **Headline** (600, `clamp(1.5rem, 3vw, 2rem)`, line-height 1.15): Sub-section headings.
- **Title** (600, 1.25rem): Card titles, FAQ questions, service names. Playfair.
- **Body** (400, 1rem, line-height 1.65): All prose, in Inter. Cap measure at 65–75ch (`max-w-2xl` for lead paragraphs). Use `text-wrap: pretty` on long prose.
- **Label** (500, 0.75rem, `0.1em`, UPPERCASE): Eyebrow pills, metadata captions, nav micro-labels.

### Named Rules
**The Serif-Heading Rule.** Every `h1`–`h4` is Playfair Display with `letter-spacing: -0.02em`. Body and UI text is always Inter. Never set body copy in the serif, and never set a heading in the sans — the contrast is the identity.

## 4. Elevation

A predominantly flat system that layers with tone (`background` vs `surface`) and hairline borders. Shadows are soft, warm-neutral, and reserved for **interaction and floating layers** — they are a response to state, not a resting decoration. Two named shadow tokens carry the whole system.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px oklch(0.18 0.02 160 / 0.04), 0 4px 16px oklch(0.18 0.02 160 / 0.06)` — `--shadow-soft`): The scrolled sticky header, open accordion panels, the small timeline cards. Barely-there lift.
- **Elegant** (`box-shadow: 0 10px 30px -12px oklch(0.46 0.13 150 / 0.25)` — `--shadow-elegant`): A green-tinted lift for hover on service/partner cards and for floating dropdown menus. The green tint ties elevation back to the brand.

### Named Rules
**The Flat-At-Rest Rule.** Cards and surfaces are flat by default, separated by `surface` tone and `border` hairlines. The `shadow-elegant` lift appears only on `:hover` or for genuinely floating layers (dropdown, sticky header). A card that is shadowed while idle is over-dressed.

## 5. Components

Components are **refined & restrained**: crisp but quiet, generous radii, low-contrast borders, motion limited to color and a small lift.

### Buttons
- **Shape:** Gently rounded (`rounded-md`, 6px). Pills (`rounded-full`) only for eyebrow chips, never for buttons.
- **Primary:** `bg-primary` / `primary-foreground`, resting `shadow`, `h-9 px-4` (default) or `h-10 px-8` (lg). Carries the single most important action per view.
- **Hover / Focus:** Hover darkens to `bg-primary/90` via `transition-colors` only. Focus shows a 1px `ring` in `primary`. No transform on buttons.
- **Outline:** `border-input` on `background`, `shadow-sm`; hover fills `accent` surface. The standard secondary action.
- **Ghost / Link:** Ghost = transparent, hover `accent` tint (icon buttons, mobile menu trigger). Link = `primary` text with underline-on-hover.
- **On-image variant:** Over hero photography, buttons invert to `bg-background text-foreground` (solid) and `bg-background/10 backdrop-blur-md` (outline) — the one sanctioned use of backdrop-blur.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16px). The signature container radius.
- **Background:** `surface` on white sections, `background` (white) on `surface` sections — always one tonal step from the band behind it.
- **Shadow Strategy:** Flat at rest; `shadow-elegant` (green-tinted) on hover. Some partner cards add `hover:-translate-y-1` for a subtle lift.
- **Border:** 1px `border` hairline; hover may shift to `border-primary/40`.
- **Internal Padding:** `p-7` (1.75rem) for feature cards, `p-6` for stat/timeline cards.

### Inputs / Fields
- **Style:** 1px `input` border on `background`, `rounded-md` (6px), `h-9`. Inter, `text-sm`.
- **Focus:** 1px `ring` in `primary`; calm border shift, no glow.
- **Error:** `destructive` border + helper text; placeholder must still hit 4.5:1 (use muted ink, not light gray).

### Navigation
- **Header:** Sticky, `z-50`. Translucent `bg-background/60 backdrop-blur-md` at top, condensing to `bg-background/85 backdrop-blur-xl` + hairline + `shadow-soft` once scrolled (300ms transition). Logo lockup left, centered nav, phone + "Registrati" CTA right.
- **Links:** Inter `text-sm font-medium`, `text-foreground/80`; hover and active → `primary`. Active state is color only, no underline.
- **Servizi dropdown:** Floating panel, `rounded-xl`, `bg-popover`, `shadow-elegant`, rows hover to `primary-soft`. Rendered in normal flow (hover-intent) — keep it out of `overflow-hidden` ancestors.
- **Mobile:** Full-height right `Sheet` (88vw / 380px), grouped link list, CTA pinned at the bottom.

### Eyebrow Pill (signature)
A bordered `rounded-full` chip — `border`, `bg-surface`/`bg-background`, `text-xs font-medium uppercase tracking-widest text-primary`, often with a 1.5px `primary` (or `accent` on hero) dot. This is the project's section-labeling device. **It is deliberate brand voice here, but it is one step from the AI "eyebrow on every section" tell** — see Don'ts.

## 6. Do's and Don'ts

### Do:
- **Do** build everything on the three official brand colors: green **`#3A783B`**, red **`#E91C34`**, white **`#FFFFFF`**. These are the only brand hues; all other tokens are neutrals or tints of them.
- **Do** keep the canvas impeccable white (`#FFFFFF` / `oklch(1 0 0)`) with `surface` (`oklch(0.985 0.003 160)`) for sectional rhythm. Whiteness is the identity — never drift to cream/sand/beige.
- **Do** set every heading in Playfair Display at `-0.02em` and every body/UI string in Inter. The serif-vs-sans contrast is the brand.
- **Do** treat green + red as a seal: accents, the 1px `gradient-italia` top bar, one hero band. Use `primary` for action, `accent` (red) on ≤5% of a screen.
- **Do** keep body and muted text at or above 4.5:1 (`muted-foreground` is the floor on white). Honor WCAG 2.1 AA — visible focus rings, full keyboard nav, `prefers-reduced-motion` on the hero carousel and every reveal.
- **Do** keep components flat at rest; bring in the green-tinted `shadow-elegant` only on hover or for floating layers.
- **Do** keep one clear action per section, pointing toward "Diventa associato" / "Contattaci" — clarity before elegance.

### Don't:
- **Don't** reproduce the **dated public-sector / PA** look: no walls of text, no labyrinth menus, no cluttered "ufficio anni 2000" density. Generous spacing, one idea per section.
- **Don't** drift into the **generic SaaS template**: no gradient blobs as decoration, no hero-metric grid ("+30 anni / 5 servizi / ∞"), no endless identical icon-cards, no decorative glassmorphism (the only blur is the header and on-image buttons).
- **Don't** let the eyebrow pill become an "eyebrow on every section" reflex. It is a deliberate device — vary the cadence; not every section needs a kicker.
- **Don't** wash surfaces in green or red, and never combine both as a content-area background. The tricolore authenticates; it does not wallpaper.
- **Don't** add `border-left`/`border-right` colored stripes, gradient text (`background-clip: text`), or any nested cards. Use full hairline borders, solid color, and tonal surfaces instead.
- **Don't** lighten body text "for elegance." Light gray on white is the single biggest legibility failure; stay at the `muted-foreground` floor or darker.
