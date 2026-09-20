import React from 'react';
import { ResumeAppearance } from '../types';
import {
  FileText,
  Briefcase,
  GraduationCap,
  Code2,
  Palette,
  Rocket,
  Star,
  Heart,
  Award,
  Stethoscope,
  Scale,
  Wrench,
  Camera,
  Music,
  Globe,
  Building2
} from 'lucide-react';

// Iconos predefinidos para identificar cada CV. La clave se guarda en ResumeData.
export const ICON_OPTIONS: { key: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'file', Icon: FileText },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'graduation', Icon: GraduationCap },
  { key: 'code', Icon: Code2 },
  { key: 'palette', Icon: Palette },
  { key: 'rocket', Icon: Rocket },
  { key: 'star', Icon: Star },
  { key: 'heart', Icon: Heart },
  { key: 'award', Icon: Award },
  { key: 'health', Icon: Stethoscope },
  { key: 'law', Icon: Scale },
  { key: 'wrench', Icon: Wrench },
  { key: 'camera', Icon: Camera },
  { key: 'music', Icon: Music },
  { key: 'globe', Icon: Globe },
  { key: 'company', Icon: Building2 }
];

// Colores predefinidos (fondo suave + icono saturado).
export const COLOR_OPTIONS: { key: string; bg: string; fg: string }[] = [
  { key: 'indigo', bg: 'bg-brand-50', fg: 'text-brand-600' },
  { key: 'blue', bg: 'bg-blue-50', fg: 'text-blue-600' },
  { key: 'sky', bg: 'bg-sky-50', fg: 'text-sky-600' },
  { key: 'emerald', bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  { key: 'teal', bg: 'bg-teal-50', fg: 'text-teal-600' },
  { key: 'amber', bg: 'bg-amber-50', fg: 'text-amber-600' },
  { key: 'orange', bg: 'bg-orange-50', fg: 'text-orange-600' },
  { key: 'rose', bg: 'bg-rose-50', fg: 'text-rose-600' },
  { key: 'violet', bg: 'bg-violet-50', fg: 'text-violet-600' },
  { key: 'slate', bg: 'bg-slate-100', fg: 'text-ink-muted' }
];

export const DEFAULT_ICON = 'file';
export const DEFAULT_COLOR = 'indigo';

const iconFor = (key?: string) =>
  ICON_OPTIONS.find((o) => o.key === key)?.Icon ?? FileText;
const colorFor = (key?: string) =>
  COLOR_OPTIONS.find((o) => o.key === key) ?? COLOR_OPTIONS[0];

// Badge que renderiza la apariencia de un CV (icono con color o imagen).
export const AppearanceBadge: React.FC<{
  appearance?: ResumeAppearance;
  className?: string;
  iconClassName?: string;
}> = ({ appearance, className = 'w-11 h-11 rounded-xl', iconClassName = 'w-5 h-5' }) => {
  if (appearance?.type === 'image' && appearance.image) {
    return (
      <img
        src={appearance.image}
        alt=""
        className={`${className} object-cover`}
      />
    );
  }
  const Icon = iconFor(appearance?.icon);
  const color = colorFor(appearance?.color);
  return (
    <div className={`${className} ${color.bg} ${color.fg} flex items-center justify-center`}>
      <Icon className={iconClassName} />
    </div>
  );
};
