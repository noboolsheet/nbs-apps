# Product

## Register

brand

## Users

Italian workers and pensioners (working-age and retired) looking for concrete help with the everyday tax, pension, and administrative matters a patronato/union actually handles. They arrive in three typical states:

- **Curious prospect**: has heard of U.N.I.L.P. or has been referred by a friend, wants to understand quickly what the union does and whether it can solve their specific problem (730, ISEE, pension review, contract review, etc.).
- **Active seeker**: has a concrete problem right now, needs to find the right service page and a way to reach a human (phone, office, contact form, enrollment PDF).
- **Existing member returning for reference**: needs the office address/hours, a service refresher, or to point a family member at the site.

Context: usually consulting the site from home on a phone or laptop, sometimes a desktop at a help desk. Reading time is short, patience for jargon is low, and the audience skews older than typical web-product users — so legibility, plain language, and unambiguous navigation matter more than novelty.

## Product Purpose

U.N.I.L.P. — *Unione Nazionale Italiana Lavoratori e Pensionati* — is a national Italian union representing workers and pensioners. This is its public marketing and informational site: it exists to explain what U.N.I.L.P. is, what services it offers, who the services are for (different worker categories), how to get in touch, and how to enroll. Available in Italian (default), Spanish, and English to reach the Italian community at home and abroad.

Success looks like: a first-time visitor lands on the home page, immediately understands this is a real, serious organization that helps with concrete labor and pension matters, finds the service that matches their situation in one or two clicks, and either downloads the enrollment PDF or reaches a human — without ever feeling like they walked into a government portal.

## Brand Personality

**Solid, trustworthy, accessible.**

- **Voice**: clear, direct, never patronizing. Speaks to ordinary working people, not to lawyers and not to children. Uses union vocabulary where it's the real word (patronato, CAF, ISEE, 730), explains it in passing when it isn't obvious.
- **Tone**: warm-institutional. The site of an organization that has been doing this work for a long time and is comfortable saying so, but isn't stiff about it. Confident, not self-important.
- **Emotional goal**: in the first five seconds, the visitor should feel *institutional weight* — "this is a real organization, not a hobby project, my problem is taken seriously here." That weight has to come from clarity, structure, and substance, not from heavy-handed formality.

## Anti-references

The single largest reflex to avoid is **stuffy Italian government bureaucracy** — the public-administration / municipal-portal aesthetic. Concretely, do not produce anything that resembles:

- Dense walls of paragraph text with no visual hierarchy.
- Generic institutional blue (`#003366`-ish) as the dominant brand color.
- Stock-photo headers of suited people shaking hands or generic "diverse team in front of a glass building".
- Multi-level dropdown mega-menus with twenty entries.
- Tiny system-font body copy crammed into narrow columns.
- "Servizi al cittadino"-style flat tile grids of identical cards with icons.
- PDF-as-primary-content reflex (downloads everywhere, content only inside the PDF).

Adjacent traps to also avoid:

- **Old-union nostalgia**: pure red banners, militant 70s typography, fist iconography. The union is serious and modern, not a vintage movement poster.
- **Generic corporate-SaaS marketing template**: hero-metric template, gradient blobs, abstract 3D shapes, "trusted by" logo soup, lifestyle laptop shots.
- **Tech-startup minimalism**: dark-mode-by-default, neon accents, monospace headlines. Wrong audience entirely.

## Design Principles

1. **Institutional weight comes from clarity, not formality.** Generous structure, decisive hierarchy, confident typography, plain language. A visitor should feel the seriousness through the *organization* of the page, not through stiffness.
2. **Plain Italian first, plain Spanish/English next.** The site exists in three languages and pensioners are a real part of the audience — sentences are short, jargon is named and explained, and the layout breathes in whichever language is longest. Never let the IT-only copy length be the design's only spec.
3. **Show the services, hide the brochure.** A visitor with a concrete problem should reach the relevant service in one or two clicks. Anti-PDF-portal: the answer lives on the page, the PDF is for enrolling, not for content.
4. **Approachable, not folksy; serious, not bureaucratic.** Warmth lives in the copy and in the human contact paths (phone, office, contact form). The visuals stay calm and confident — no faux-corporate gloss, no municipal grey either.
5. **Older audiences are first-class readers.** Body copy is comfortably large by modern web standards, contrast is strong without being harsh, tap targets are generous, no critical interaction depends on a hover state.

## Accessibility & Inclusion

No formal compliance target was set, so the bar is **best-effort, with the older end of the audience in mind**. Practically:

- Comfortable body type size and line height; avoid sub-14px text anywhere meaningful.
- Strong contrast on text against backgrounds (well above AA where reasonable), but tinted neutrals — never pure black on pure white.
- All critical actions and information reachable without hover (no hover-only menus, no hover-only tooltips for content that matters).
- Respect `prefers-reduced-motion` — motion is decorative here, never load-bearing.
- Keyboard reachable navigation, real focus rings (not removed by reset).
- Multilingual by design: don't let any layout break when Italian copy becomes longer Spanish or English copy.
