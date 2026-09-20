/**
 * Avatar circular estilo cuenta de Google: muestra la foto de perfil si existe, o las iniciales derivadas del
 * nombre (asignadas automáticamente) sobre un color de fondo estable (hash del nombre). Reutilizable en el header
 * (menú de usuario) y en Ajustes. Sin dependencias: iniciales y color se calculan aquí.
 */

/** Iniciales a partir del nombre: 1ª letra de las dos primeras palabras (o 2 primeras letras si es una sola). */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Paleta de fondos para iniciales (tonos "soft" fijos, legibles en claro y oscuro con texto blanco).
const BG_PALETTE = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#2563eb'];

/** Color de fondo estable para un nombre (mismo nombre → mismo color). */
function bgFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BG_PALETTE[hash % BG_PALETTE.length]!;
}

const SIZE_PX: Record<'sm' | 'md' | 'lg', number> = { sm: 28, md: 36, lg: 96 };

export function Avatar({
  name,
  image,
  size = 'md',
  className = '',
}: {
  name: string;
  image?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const px = SIZE_PX[size];
  const fontSize = size === 'lg' ? 32 : size === 'md' ? 14 : 11;
  const common = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`;

  if (image) {
    return (
      // La foto es un data URL subido por la usuaria (no un asset remoto): <img> simple, sin next/image.
      <img
        src={image}
        alt={name}
        width={px}
        height={px}
        className={`${common} object-cover`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      aria-label={name}
      className={`${common} select-none font-semibold text-white`}
      style={{ width: px, height: px, fontSize, backgroundColor: bgFor(name) }}
    >
      {initialsFrom(name)}
    </span>
  );
}
