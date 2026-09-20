---
name: U.N.I.L.P.
description: A national Italian workers' and pensioners' union presented as a serious editorial publication rather than a government portal.
colors:
  ink-navy: "oklch(0.245 0.085 273)"
  ink-navy-deep: "oklch(0.195 0.082 273)"
  ink-navy-soft: "oklch(0.945 0.020 273)"
  warm-brick: "oklch(0.535 0.115 38)"
  warm-brick-deep: "oklch(0.445 0.125 38)"
  paper-cream: "oklch(0.978 0.012 76)"
  paper-cream-deep: "oklch(0.955 0.015 76)"
  warm-ash: "oklch(0.910 0.013 76)"
  ink-black: "oklch(0.215 0.020 273)"
  ink-quiet: "oklch(0.435 0.025 273)"
  ink-line: "oklch(0.860 0.015 76)"
typography:
  display:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.005em"
  title:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  body-large:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  body:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.04em"
rounded:
  none: "0px"
  sm: "2px"
  md: "4px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  "2xl": "64px"
  "3xl": "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.paper-cream}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "14px 28px"
  button-primary-hover:
    backgroundColor: "{colors.ink-navy-deep}"
    textColor: "{colors.paper-cream}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "14px 28px"
  button-outline-hover:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.paper-cream}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-navy}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.ink-navy-soft}"
    textColor: "{colors.ink-navy}"
  card:
    backgroundColor: "{colors.paper-cream-deep}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.md}"
    padding: "32px"
  input:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-black}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  input-focus:
    backgroundColor: "{colors.paper-cream}"
    textColor: "{colors.ink-black}"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 0"
  nav-link-active:
    backgroundColor: "transparent"
    textColor: "{colors.warm-brick}"
  chip-language:
    backgroundColor: "{colors.paper-cream-deep}"
    textColor: "{colors.ink-black}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 12px"
  chip-language-active:
    backgroundColor: "{colors.ink-navy}"
    textColor: "{colors.paper-cream}"
---

# Design System: U.N.I.L.P.

## 1. Overview

**Creative North Star: "Patronato Editoriale"**

The site is an editorial publication that happens to be a patronato. It carries the institutional weight of an organization that has been protecting workers for decades, but it earns that weight the way a serious cultural publication earns it, through confident typography, generous structure, and decisive sectioning, never through bureaucratic stiffness, generic government blue, or stock-photo handshakes. The visual language is closer to *Mubi*, *Aperture*, *Apartamento*, *Il Post*, or *Internazionale* long-form than to any municipal portal.

The system is **committed** chromatically. One saturated color, a warm indigo-leaning ink navy (`oklch(0.245 0.085 273)`), carries 30 to 60 percent of the surface in the moments that matter: the hero band, the footer plinth, primary calls to action, and major section anchors. Everywhere else, warm tinted neutrals on a paper-cream canvas (`oklch(0.978 0.012 76)`) do the quiet work, so the navy reads as authority when it appears. The single accent, a low-chroma warm brick (`oklch(0.535 0.115 38)`), exists only for rarity moments: link underlines, focus rings, the active language indicator. Typography is editorial. Source Serif 4 carries display and headline weight; Inter disappears under reading. Motion is responsive: state changes plus gentle entrance fades, never theatrical scroll choreography that excludes the older end of the audience.

The system explicitly rejects everything PRODUCT.md anti-references, plus the project's own current visual state. It undoes, rather than extends, the v0/shadcn New York default (`#3b82f6` primary, `bg-gradient-to-r from-blue-900/80` photo overlays, raw Tailwind green CTAs, zinc-on-zinc card grids). If a visitor could mistake the surface for a municipal portal, a militant 70s poster, a corporate-SaaS marketing template, or a tech-startup dashboard, the design is wrong.

**Key Characteristics:**
- Editorial publication first, marketing site second.
- Committed warm ink navy carrying 30 to 60 percent in decisive moments.
- Source Serif 4 display, Inter body, large weight and scale contrast.
- Warm cream surfaces, warm ink text, no `#ffffff` or `#000000` anywhere.
- Flat by default. Depth from tonal layering and confident typography, not shadows.
- Body type comfortable for older readers (17px, 1.6 line-height, 60 to 72ch).
- Multilingual layout discipline. IT, ES, and EN all breathe equally.
- Subtle radii (2 to 8px). Editorial, not friendly-rounded.
- State-change motion. Ease-out-quart, 150 to 450ms. No bounce, no choreography.

## 2. Colors: The Patronato Editoriale Palette

A committed warm-ink-navy on a warm-paper canvas, with one rare brick accent. Every value is OKLCH because hue precision and warm tinting matter to this system. Hex approximations live in the sidecar for tooling that needs them.

### Primary
- **Warm Ink Navy** (`oklch(0.245 0.085 273)`): the institutional voice. Owns the hero band, the footer plinth, primary CTAs, and major section anchors. Indigo-leaning, deliberately warmer and deeper than `#003366` government blue and `#3b82f6` Tailwind blue.
- **Warm Ink Navy Deep** (`oklch(0.195 0.082 273)`): hover and pressed state for the navy on interactive elements.
- **Warm Ink Navy Soft** (`oklch(0.945 0.020 273)`): the rare tinted background that signals selection (active nav, current language pill background on cream surfaces, focused-but-not-yet-typed input field).

### Secondary (single accent)
- **Warm Brick** (`oklch(0.535 0.115 38)`): the rarity accent. Reserved for link underlines on hover, focus rings on critical actions, and the active state indicator on tiny chrome elements. Never more than five percent of any visible surface.
- **Warm Brick Deep** (`oklch(0.445 0.125 38)`): the brick at pressed state, used only where Warm Brick already appears.

### Neutral
- **Paper Cream** (`oklch(0.978 0.012 76)`): the main page surface. Warm off-white, tinted toward the brand hue. Never `#ffffff`.
- **Paper Cream Deep** (`oklch(0.955 0.015 76)`): the alternating-band surface and card-on-cream tonal lift. Differentiates sections without using shadows.
- **Warm Ash** (`oklch(0.910 0.013 76)`): the quiet utility surface for input fields against cream, for legal-page sidebars, and for footer-internal panels.
- **Ink Line** (`oklch(0.860 0.015 76)`): the only border color. Used for dividers, input strokes, and table rules. No grays.
- **Ink Black** (`oklch(0.215 0.020 273)`): body copy on cream surfaces. Near-black, tinted toward the brand hue. Never `#000000`.
- **Ink Quiet** (`oklch(0.435 0.025 273)`): secondary copy, captions, metadata, helper text.

### Named Rules

**The Navy Is The Voice Rule.** Warm Ink Navy is the institutional voice. Wherever it appears, the site is *speaking*. Hero band, footer plinth, primary buttons, major section anchors. Decorative navy is forbidden. Do not tint cards, dividers, hover backgrounds, or icons with the navy at low opacity to "echo" the brand; that is the SaaS-template reflex.

**The Brick Is For Rarity Rule.** Warm Brick is for moments that need to feel decisive: the underline that appears on a link the moment you hover it, the focus ring on the contact-form Submit button, the small dot beside the currently active language. Five percent of any surface, maximum. Brick as a section background, brick on body type, brick as a "warning" color: all forbidden.

**The Warm-Neutral Rule.** Every neutral is tinted toward the brand hue. Pure white (`#ffffff`) and pure black (`#000000`) are forbidden everywhere, including body copy, surfaces, borders, and icons.

**The Anti-Bureaucratic-Blue Rule.** The brand navy must be distinguishable at a glance from `#003366` government blue and `#3b82f6` Tailwind blue. If a visitor could mistake it for a municipal portal, the value is wrong. Re-tone warmer (higher hue), deeper (lower lightness), or both.

## 3. Typography: The Editorial Pairing

**Display Font:** Source Serif 4 (with `'Source Serif Pro', Georgia, serif` fallbacks).
**Body Font:** Inter (with `system-ui, sans-serif` fallbacks).
**Label/Mono Font:** Geist Mono. Used sparingly: legal page metadata, code references in service descriptions (`730`, `ISEE`, postal codes), nothing decorative.

**Character:** Source Serif 4 has real terminals, real stroke contrast, and confident Italian, Spanish, and English diacritics. It carries display weight typographically, the way a quality periodical's masthead does. Inter disappears under reading and behaves correctly when copy expands from Italian into longer Spanish or English. The pairing is editorial first, never decorative.

### Hierarchy

- **Display** (Source Serif 4, weight 400, `clamp(2.5rem, 6vw, 4.5rem)`, line-height 1.05, letter-spacing -0.01em): hero headlines and major section openers. The display is where most of the institutional weight is earned. Never bold, never italic.
- **Headline** (Source Serif 4, weight 400, `clamp(2rem, 4vw, 3rem)`, line-height 1.15, letter-spacing -0.005em): page openers below the hero, primary section titles.
- **Title** (Inter, weight 500, 1.5rem, line-height 1.3): card titles, service titles, sub-section headings. The point at which type returns to the sans.
- **Body Large** (Inter, weight 400, 1.25rem, line-height 1.55): introductions, ledes, the first paragraph of a service page.
- **Body** (Inter, weight 400, 1.0625rem (17px), line-height 1.6, max 60 to 72ch): the main reading surface, notably larger than the modern-web default because pensioners read here.
- **Label** (Inter, weight 500, 0.875rem (14px), letter-spacing 0.04em): nav items, form labels, meta lines, button text. Uppercase optional, only on button labels and small chrome.

### Named Rules

**The Body-Is-Read Rule.** Body text starts at 17px, line-height 1.6 or higher, line length capped 60 to 72ch. Smaller body text is forbidden anywhere a visitor is meant to actually read. Helper text and captions may drop to 14px Ink Quiet; nothing meant for reading drops below.

**The Display-Is-Serif Rule.** The Display and Headline roles are Source Serif 4. The Title role and below are Inter. The boundary is not a suggestion. Promoting Inter to a 4rem hero headline is forbidden; the institutional weight comes from the serif, not from sans-bold-uppercase.

**The Multilingual-Breathing Rule.** No layout passes review if it only works in Italian. The same component must breathe correctly when Italian copy expands into the longer Spanish or English form. No truncation, no awkward two-word wraps, no broken hierarchy at the longest language. Design against Spanish, test in Italian.

**The No-Gradient-Type Rule.** Type is solid color, always. `background-clip: text` combined with a gradient is forbidden, including on hero headlines and section openers.

## 4. Elevation: Flat-Plinth

Depth comes from tonal layering and typographic confidence, not from shadows. The navy plinth (hero band, footer) sits on the cream page and that contrast alone carries hierarchy. Alternating sections shift Paper Cream against Paper Cream Deep for rhythm. Cards are flat, distinguished from their surroundings by the same tonal shift, never by `box-shadow`.

Shadows appear in exactly two contexts: small floating chrome (the language dropdown, the mobile menu drawer) and the focus ring on critical interactive elements. Nothing at rest casts a shadow.

### Shadow Vocabulary

- **floating-sm** (`box-shadow: 0 2px 6px oklch(0.245 0.085 273 / 0.10), 0 1px 2px oklch(0.245 0.085 273 / 0.06)`): the language dropdown, the small popover. Tinted with the brand navy at low alpha, never black.
- **floating-md** (`box-shadow: 0 8px 24px oklch(0.245 0.085 273 / 0.12), 0 2px 4px oklch(0.245 0.085 273 / 0.06)`): the mobile menu drawer when it slides in.
- **focus-ring** (`box-shadow: 0 0 0 3px oklch(0.535 0.115 38 / 0.35)`): the warm-brick glow around the focused interactive element. Visible only on `:focus-visible`.

### Named Rules

**The Flat-Plinth Rule.** Cards, sections, and content surfaces are flat at rest. They are differentiated from their surroundings by tonal shift (Paper Cream Deep against Paper Cream) or by sitting on top of the navy plinth, not by `box-shadow`. A card with `shadow-sm` or `shadow-md` at rest is a violation.

**The No-Glassmorphism Rule.** Backdrop blur, frosted-glass cards, and translucent navy overlays laid *over a photo to make text legible on top of it* are forbidden. The canonical example to remove is text sitting on a photograph dimmed by `bg-gradient-to-r from-blue-900/80 via-blue-900/60`. This does not forbid the sanctioned "Navy Plinth with editorial image" variant (§5), where the image sits *beside* the copy and a navy gradient fuses it into the plinth: there, text never overlaps the photo, so the gradient blends rather than rescues legibility.

## 5. Components

### Buttons

A small system: primary (filled navy), outline (navy stroke on cream), ghost (navy text only). All three share padding rhythm, label typography, and a 2px corner. No 3D, no gradient, no oversized icon.

- **Shape:** subtle 2px corners (`{rounded.sm}`). Never pill-shaped. Never sharp-square (gives municipal-portal energy).
- **Label:** Inter 500 0.875rem with letter-spacing 0.04em. Uppercase is acceptable on primary CTAs, optional on others.
- **Primary:** Warm Ink Navy fill, Paper Cream text. Padding 14px / 28px. Hover deepens to Warm Ink Navy Deep with a 1px translate-y lift over 200ms ease-out-quart.
- **Outline:** transparent fill, 1px Warm Ink Navy border, Warm Ink Navy text. Padding 14px / 28px. Hover fills with Warm Ink Navy, text flips to Paper Cream.
- **Ghost:** transparent fill, Warm Ink Navy text. Padding 10px / 16px. Hover background to Warm Ink Navy Soft.
- **Focus:** all variants show the warm-brick focus ring on `:focus-visible`. The default browser ring is suppressed.

### Cards

Used sparingly. Most sections are content on the page, not floating tiles.

- **Corner Style:** 4px (`{rounded.md}`). Subtle, never friendly-rounded.
- **Background:** Paper Cream Deep, sitting on a Paper Cream page. Tonal lift, not shadow.
- **Border:** none at rest. A 1px Ink Line border appears on hover for interactive cards, never on static ones.
- **Padding:** 32px (24px on mobile). Generous.
- **Internal hierarchy:** Title (Inter 500 1.5rem) at the top, optional Ink Quiet label above it, Body below. No icon-and-heading icon-grid template.

### Inputs

- **Style:** Warm Ash background on cream surface, 1px Ink Line border, 2px corner, Inter body type at 17px.
- **Padding:** 12px / 16px.
- **Focus:** border deepens to Warm Ink Navy, background lifts to Paper Cream, warm-brick focus ring appears at 3px. Transition 200ms ease-out-quart.
- **Error:** border switches to Warm Brick, error message in Warm Brick 14px Inter 500 below the field.
- **Label:** Inter 500 14px, sits above the input, Ink Black, 8px gap. Required-indicator is a single Warm Brick asterisk.

### Navigation

- **Style:** horizontal list of label-typography links in Ink Black on Paper Cream header.
- **Active state:** a 2px Warm Brick underline beneath the current route, no fill change. Inactive items are Ink Black with no underline.
- **Hover:** the Warm Brick underline fades in over 200ms ease-out (a simple opacity transition, instant under `prefers-reduced-motion`). Color does not change on hover. Hover is decoration; underline is the signal.
- **Mobile:** the menu slides in as a Paper Cream drawer from the right, with floating-md shadow, full-screen on small viewports. Each link is a 56px-tap-target row.
- **No mega-menus.** No multi-level dropdown menus. If a section has sub-pages, the visitor finds them on the section landing page, not in a hover menu.

### Language Switcher

A small Ghost-button-shaped chip in the header with a Globe icon and current language. Tapping reveals a Paper Cream popover with floating-sm shadow listing the three languages. The active language is rendered with Warm Ink Navy background and Paper Cream text (chip-language-active). Inactive languages are Paper Cream Deep background and Ink Black text. No flag icons.

### Section Anchors

A site-wide pattern, not a one-off component. Every primary section on the home page and on `/i-nostri-servizi/*` opens with: a small Label (Inter 500 14px 0.04em letter-spacing) in Warm Brick, a Headline (Source Serif 4) below it in Ink Black, and an optional Body Large lede. The Label is the editorial section marker, the small typographic signal that this is a publication, not a portal.

### The Navy Plinth (signature)

The hero band on the home page and the footer share the same treatment: a saturated Warm Ink Navy surface, Paper Cream text, generous vertical padding (96px desktop / 64px mobile), no photograph background. The hero is type-led: a Display-size headline in Paper Cream, a Body Large lede in Paper Cream at 80% opacity, two buttons (primary on cream surface flips: primary on navy is Paper Cream fill / Warm Ink Navy text; outline keeps cream stroke). No photo, no gradient, no overlay. The plinth IS the moment.

This replaces the current `<HeroCarousel>` photo-with-gradient pattern outright.

**Navy Plinth with editorial image (sanctioned variant).** The home hero may carry a photograph *beside* the copy, never behind it. The plinth stays type-led: the Display headline and lede sit on solid Warm Ink Navy at full contrast, and the image occupies its own region. On desktop the image bleeds to the right edge of the section (roughly the right 55%), with the copy constrained to the left so the two never overlap; on mobile the image stacks below the CTAs as a support band. Two layers fuse the image into the plinth: a Warm Ink Navy `mix-blend-multiply` tint (~0.45) that pulls the photo toward the brand hue so it reads editorial rather than stock, and a Warm Ink Navy gradient that fades the image into the navy along the seam nearest the copy (left-to-right on desktop, top-down on mobile). The gradient exists to *blend the image into the plinth*, not to darken a photo so text becomes readable on top of it: that distinction is what separates this from the banned text-over-photo overlay (see §4). No `#000` in the tint or gradient; the navy token does the work. If the source photograph reads as generic stock, the multiply tint is doing real work, but a clean licensed image is always preferable.

## 6. Do's and Don'ts

### Do:
- **Do** use Warm Ink Navy (`oklch(0.245 0.085 273)`) as the committed voice: own the hero plinth, the footer plinth, primary CTAs, and major section anchors with it.
- **Do** keep body type at 17px Inter 400 with line-height 1.6 and line length 60 to 72ch, comfortable for older readers.
- **Do** lead with Source Serif 4 display headlines that earn institutional weight typographically.
- **Do** tint every neutral toward the brand hue: Paper Cream (`oklch(0.978 0.012 76)`) not white, Ink Black (`oklch(0.215 0.020 273)`) not black, Warm Ash not slate.
- **Do** design every section against the longest language (typically Spanish or English), not the default Italian.
- **Do** use subtle 2 to 8px radii. Editorial, never friendly-rounded.
- **Do** keep depth flat: let tonal shifts (Paper Cream Deep against Paper Cream) and confident type carry hierarchy.
- **Do** put the answer on the page. The PDF is for enrolling, not for content.
- **Do** open every primary section with a Warm Brick Label, a Source Serif 4 Headline, and an optional Body Large lede.
- **Do** show the active route as a 2px Warm Brick underline. Color does not change on hover.

### Don't:
- **Don't** use the project's current visual state as a reference. No `#3b82f6` Tailwind blue as primary. No `bg-gradient-to-r from-blue-900/80` photo overlays. No raw Tailwind `bg-green-600` CTAs. No zinc-on-zinc shadcn New York card grids. This spec exists explicitly to replace those.
- **Don't** use the generic-institutional-blue family (`#003366`, `#1e3a8a`, cyan-leaning blues). The brand navy is warmer, deeper, and indigo-leaning, distinguishable at a glance from any municipal portal.
- **Don't** evoke militant 70s union nostalgia. No flat-red banners, no fist iconography, no chunky bold sans over red. The union is serious and modern, not a vintage poster.
- **Don't** apply the corporate-SaaS marketing template: no hero-metric ("250k+ members, since 1981"), no gradient blobs, no abstract 3D shapes, no "trusted by" logo soup, no lifestyle laptop photography.
- **Don't** use tech-startup minimalism. No dark mode by default, no neon accents on near-black, no monospace headlines. Wrong audience entirely.
- **Don't** wrap everything in a card. Most sections are content on the page, not floating tiles. Nested cards are always wrong.
- **Don't** use `#ffffff` or `#000000` anywhere in the system.
- **Don't** use `background-clip: text` with a gradient. Type is solid color, always.
- **Don't** rely on hover-only interactions for anything critical: no hover-only menus, no hover-only tooltips that carry meaning.
- **Don't** auto-advance the hero carousel. If a carousel exists, it must be user-driven, respect `prefers-reduced-motion`, and never carry information that doesn't appear elsewhere on the page. The signature pattern is the type-led navy plinth, not a photo carousel.
- **Don't** use `box-shadow` to indicate that a card is a card. Cards are flat. Shadows are reserved for floating chrome (dropdown, drawer) and focus rings.
- **Don't** ship a layout that only works in Italian. Spanish and English are first-class languages of this site.
- **Don't** use Warm Brick on anything larger than a 5% surface. No brick section backgrounds, no brick body copy, no brick "warning" panels.
- **Don't** promote Inter to display sizes. The Display and Headline roles are Source Serif 4. Bold-sans-uppercase as a hero solution is forbidden.
