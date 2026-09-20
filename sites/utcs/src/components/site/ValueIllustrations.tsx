// Ilustraciones SVG de "I nostri valori" (pagina Chi siamo).
//
// Stile: line-art monoline — solo contorno (niente riempimenti), tratto di
// spessore uniforme con terminazioni arrotondate, geometrico e con carattere.
// Tratto principale nel verde del brand (--primary) con un accento rosso puntuale
// (--accent) per illustrazione. Decorativi → aria-hidden; il titolo testuale
// accanto fornisce il significato.

type IllustrationProps = { className?: string };

// viewBox quadrato: la dimensione la decide il contenitore.
const VIEWBOX = "0 0 96 96";

// Proprietà comuni del tratto monoline.
const STROKE = {
  fill: "none" as const,
  strokeWidth: 3.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const GREEN = "var(--primary)";
const RED = "var(--accent)";

// Democrazia → tre persone (la centrale come accento rosso).
function DemocraziaIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      {/* persona sinistra */}
      <circle cx="24" cy="42" r="7.5" stroke={GREEN} {...STROKE} />
      <path d="M11 68c0-10 6-15 13-15" stroke={GREEN} {...STROKE} />
      {/* persona destra */}
      <circle cx="72" cy="42" r="7.5" stroke={GREEN} {...STROKE} />
      <path d="M85 68c0-10-6-15-13-15" stroke={GREEN} {...STROKE} />
      {/* persona centrale (accento rosso) */}
      <circle cx="48" cy="33" r="9.5" stroke={RED} {...STROKE} />
      <path d="M31 66c0-11 8-17 17-17s17 6 17 17" stroke={RED} {...STROKE} />
    </svg>
  );
}

// Solidarietà → un cuore (rosso).
function SolidarietaIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      <path
        d="M48 79C21 60 21 36 36 34c7-1 11 4 12 9 1-5 5-10 12-9 15 2 15 26-12 45z"
        stroke={RED}
        {...STROKE}
      />
    </svg>
  );
}

// Competenza → medaglia con spunta interna (check in rosso).
function CompetenzaIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      {/* nastri */}
      <path d="M40 16l5 18" stroke={GREEN} {...STROKE} />
      <path d="M56 16l-5 18" stroke={GREEN} {...STROKE} />
      {/* disco */}
      <circle cx="48" cy="55" r="22" stroke={GREEN} {...STROKE} />
      {/* spunta (accento rosso) */}
      <path d="M39 55l6.5 6.5L59 48" stroke={RED} {...STROKE} />
    </svg>
  );
}

// Territorio → solo il pin di localizzazione (verde, punto centrale rosso).
function TerritorioIllustration({ className }: IllustrationProps) {
  return (
    <svg viewBox={VIEWBOX} className={className} aria-hidden="true">
      <path
        d="M48 18c-12 0-21 9-21 21 0 16 21 39 21 39s21-23 21-39c0-12-9-21-21-21z"
        stroke={GREEN}
        {...STROKE}
      />
      <circle cx="48" cy="39" r="7" stroke={RED} {...STROKE} />
    </svg>
  );
}

export const VALUE_ILLUSTRATIONS = {
  democrazia: DemocraziaIllustration,
  solidarieta: SolidarietaIllustration,
  competenza: CompetenzaIllustration,
  territorio: TerritorioIllustration,
} as const;
