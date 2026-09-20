export interface PersonalDetails {
  fullName: string;
  jobTitle: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  placeOfBirth: string;
  currentResidence: string;
  summary: string;
  website?: string;
  linkedin?: string;
}

export interface WorkExperience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string; // e.g. "Current" or "Apr 2026"
  description: string;
}

export interface Education {
  id: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Skill {
  id: string;
  name: string;
  level?: number; // 1 to 5, optional
}

export interface Language {
  id: string;
  name: string;
  level: number; // 1 to 5 (blocks in image)
}

// Apariencia de la tarjeta del CV en el dashboard: un icono con color, o una imagen.
// Permite identificar cada currículum de un vistazo.
export interface ResumeAppearance {
  type: 'icon' | 'image';
  icon?: string; // clave de un icono predefinido (ver appearance.tsx)
  color?: string; // clave de un color predefinido
  image?: string; // data URL (solo cuando type === 'image')
}

export interface ResumeData {
  id: string;
  name: string; // Title for this resume version, e.g. "CV Principal"
  personalDetails: PersonalDetails;
  experience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  languages: Language[];
  updatedAt: string;
  templateLanguage?: TemplateLanguage;
  appearance?: ResumeAppearance;
}

export type TemplateId =
  | 'classic-split'
  | 'modern-minimal'
  | 'executive-chic'
  | 'sidebar-color'
  | 'timeline';
export type TemplateLanguage = 'es' | 'en' | 'it' | 'de' | 'fr' | 'pt';
