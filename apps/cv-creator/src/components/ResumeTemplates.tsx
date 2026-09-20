import React from 'react';
import { ResumeData, TemplateId, TemplateLanguage } from '../types';

interface TemplateProps {
  data: ResumeData;
  scale?: number;
}

export const translations: Record<TemplateLanguage, {
  details: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  placeOfBirth: string;
  currentResidence: string;
  website: string;
  skills: string;
  languages: string;
  profile: string;
  profileProfessional: string;
  profileExecutive: string;
  experience: string;
  experienceProfessional: string;
  education: string;
  educationAcademic: string;
  educationCertifications: string;
  born: string;
  origin: string;
  datos: string;
  yourNameHere: string;
}> = {
  es: {
    details: "DETALLES",
    phone: "TELÉFONO",
    email: "CORREO ELECTRÓNICO",
    dateOfBirth: "FECHA DE NACIMIENTO",
    placeOfBirth: "LUGAR DE NACIMIENTO",
    currentResidence: "RESIDENCIA",
    website: "SITIO WEB",
    skills: "APTITUDES",
    languages: "IDIOMAS",
    profile: "PERFIL",
    profileProfessional: "PERFIL PROFESIONAL",
    profileExecutive: "PERFIL EJECUTIVO",
    experience: "EXPERIENCIA LABORAL",
    experienceProfessional: "TRAYECTORIA PROFESIONAL",
    education: "EDUCACIÓN",
    educationAcademic: "FORMACIÓN ACADÉMICA",
    educationCertifications: "EDUCACIÓN Y CERTIFICACIONES",
    born: "Nacido",
    origin: "Origen",
    datos: "DATOS",
    yourNameHere: "TU NOMBRE AQUÍ"
  },
  en: {
    details: "DETAILS",
    phone: "PHONE",
    email: "EMAIL",
    dateOfBirth: "DATE OF BIRTH",
    placeOfBirth: "PLACE OF BIRTH",
    currentResidence: "RESIDENCE",
    website: "WEBSITE",
    skills: "SKILLS",
    languages: "LANGUAGES",
    profile: "PROFILE",
    profileProfessional: "PROFESSIONAL PROFILE",
    profileExecutive: "EXECUTIVE PROFILE",
    experience: "WORK EXPERIENCE",
    experienceProfessional: "PROFESSIONAL EXPERIENCE",
    education: "EDUCATION",
    educationAcademic: "ACADEMIC BACKGROUND",
    educationCertifications: "EDUCATION & CERTIFICATIONS",
    born: "Born",
    origin: "Origin",
    datos: "INFO",
    yourNameHere: "YOUR NAME HERE"
  },
  it: {
    details: "CONTATTI",
    phone: "TELEFONO",
    email: "EMAIL",
    dateOfBirth: "DATA DI NASCITA",
    placeOfBirth: "LUOGO DI NASCITA",
    currentResidence: "RESIDENZA",
    website: "SITO WEB",
    skills: "COMPETENZE",
    languages: "LINGUE",
    profile: "PROFILO",
    profileProfessional: "PROFILO PROFESSIONALE",
    profileExecutive: "PROFILO ESECUTIVO",
    experience: "ESPERIENZA LAVORATIVA",
    experienceProfessional: "PERCORSO PROFESSIONALE",
    education: "ISTRUZIONE",
    educationAcademic: "FORMAZIONE ACCADEMICA",
    educationCertifications: "ISTRUZIONE E CERTIFICAZIONI",
    born: "Nato il",
    origin: "Origine",
    datos: "DATI",
    yourNameHere: "IL TUO NOME QUI"
  },
  de: {
    details: "KONTAKT",
    phone: "TELEFON",
    email: "E-MAIL",
    dateOfBirth: "GEBURTSDATUM",
    placeOfBirth: "GEBURTSORT",
    currentResidence: "WOHNSITZ",
    website: "WEBSITE",
    skills: "FÄHIGKEITEN",
    languages: "SPRACHEN",
    profile: "PROFIL",
    profileProfessional: "BERUFLICHES PROFIL",
    profileExecutive: "PROFIL FÜR FÜHRUNGSKRÄFTE",
    experience: "BERUFSERFAHRUNG",
    experienceProfessional: "BERUFLICHER WERDEGANG",
    education: "AUSBILDUNG",
    educationAcademic: "AKADEMISCHER WERDEGANG",
    educationCertifications: "AUSBILDUNG & ZERTIFIKATE",
    born: "Geboren",
    origin: "Herkunft",
    datos: "DATEN",
    yourNameHere: "IHR NAME HIER"
  },
  fr: {
    details: "COORDONNÉES",
    phone: "TÉLÉPHONE",
    email: "ADRESSE E-MAIL",
    dateOfBirth: "DATE DE NAISSANCE",
    placeOfBirth: "LIEU DE NAISSANCE",
    currentResidence: "RÉSIDENCE",
    website: "SITE WEB",
    skills: "COMPÉTENCES",
    languages: "LANGUES",
    profile: "PROFIL",
    profileProfessional: "PROFIL PROFESSIONNEL",
    profileExecutive: "PROFIL EXÉCUTIF",
    experience: "EXPÉRIENCE PROFESSIONNELLE",
    experienceProfessional: "PARCOURS PROFESSIONNEL",
    education: "ÉDUCATION",
    educationAcademic: "PARCOURS ACADÉMIQUE",
    educationCertifications: "ÉDUCATION & CERTIFICATIONS",
    born: "Né le",
    origin: "Origine",
    datos: "DONNÉES",
    yourNameHere: "VOTRE NOM ICI"
  },
  pt: {
    details: "DETALHES",
    phone: "TELEFONE",
    email: "E-MAIL",
    dateOfBirth: "DATA DE NASCIMENTO",
    placeOfBirth: "NATURALIDADE",
    currentResidence: "RESIDÊNCIA",
    website: "SÍTIO WEB",
    skills: "APTIDÕES",
    languages: "IDIOMAS",
    profile: "PERFIL",
    profileProfessional: "PERFIL PROFISSIONAL",
    profileExecutive: "PERFIL EXECUTIVO",
    experience: "EXPERIÊNCIA PROFISSIONAL",
    experienceProfessional: "TRAJETÓRIA PROFISSIONAL",
    education: "EDUCAÇÃO",
    educationAcademic: "FORMAÇÃO ACADÉMICA",
    educationCertifications: "EDUCAÇÃO E CERTIFICAÇÕES",
    born: "Nascimento",
    origin: "Origem",
    datos: "DADOS",
    yourNameHere: "SEU NOME AQUI"
  }
};

// Helper to render rating bars (like the blocks in the image)
export const RatingBars: React.FC<{ value: number; max?: number }> = ({ value, max = 5 }) => {
  return (
    <div className="flex gap-1 mt-1.5 h-3 items-center">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{ width: '24px', height: '10px' }}
          className={`transition-all duration-300 rounded-[1px] ${
            i < value ? 'bg-[#0f172a]' : 'bg-[#e2e8f0]'
          }`}
        />
      ))}
    </div>
  );
};

// 1. Classic Split Template (Matching user's uploaded images closely!)
export const ClassicSplitTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalDetails, experience, education, skills, languages } = data;
  const lang = data.templateLanguage || 'es';
  const t = translations[lang] || translations.es;

  return (
    <div className="bg-white text-[#1e293b] font-sans p-10 min-h-[1123px] relative flex flex-col shadow-sm text-left select-none">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-semibold tracking-wide text-[#0f172a] uppercase leading-tight font-serif">
          {personalDetails.fullName || t.yourNameHere}
        </h1>
        {personalDetails.jobTitle && (
          <p className="text-lg text-slate-500 mt-1 font-medium italic">
            {personalDetails.jobTitle}
          </p>
        )}
        <div className="w-full h-[1.5px] bg-slate-300 mt-4 mb-2" />
      </div>

      {/* Main Grid Split */}
      <div className="grid grid-cols-12 gap-8 flex-grow">
        {/* Left Column (35%) */}
        <div className="col-span-4 border-r border-slate-200 pr-6 flex flex-col gap-6 pdf-column">
          {/* Details */}
          <div className="pdf-block">
            <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-3">
              {t.details}
            </h2>
            <div className="flex flex-col gap-3 text-xs">
              {personalDetails.phone && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.phone}</div>
                  <div className="text-slate-600 break-words">{personalDetails.phone}</div>
                </div>
              )}
              {personalDetails.email && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.email}</div>
                  <div className="text-slate-600 break-words">{personalDetails.email}</div>
                </div>
              )}
              {personalDetails.dateOfBirth && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.dateOfBirth}</div>
                  <div className="text-slate-600">{personalDetails.dateOfBirth}</div>
                </div>
              )}
              {personalDetails.placeOfBirth && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.placeOfBirth}</div>
                  <div className="text-slate-600">{personalDetails.placeOfBirth}</div>
                </div>
              )}
              {personalDetails.currentResidence && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.currentResidence}</div>
                  <div className="text-slate-600">{personalDetails.currentResidence}</div>
                </div>
              )}
              {personalDetails.website && (
                <div>
                  <div className="font-bold text-[#0f172a] uppercase tracking-wider mb-0.5">{t.website}</div>
                  <div className="text-slate-600 break-all">{personalDetails.website}</div>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills && skills.length > 0 && (
            <div className="pdf-block">
              <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-3">
                {t.skills}
              </h2>
              <ul className="flex flex-col gap-2 text-xs text-slate-700 list-none pl-0">
                {skills.map((skill) => (
                  <li key={skill.id} className="border-b border-slate-100 pb-1.5 flex items-start gap-1.5">
                    <span className="text-[#0f172a] font-bold">•</span>
                    <span className="font-medium text-slate-800 leading-tight">{skill.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Languages */}
          {languages && languages.length > 0 && (
            <div className="pdf-block">
              <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-3">
                {t.languages}
              </h2>
              <div className="flex flex-col gap-4 text-xs text-slate-700">
                {languages.map((lang) => (
                  <div key={lang.id} className="pdf-block pb-2">
                    <div className="font-medium text-slate-800 leading-normal">{lang.name}</div>
                    <RatingBars value={lang.level} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (65%) */}
        <div className="col-span-8 flex flex-col gap-6 pl-2 pdf-column">
          {/* Summary / Profile */}
          {personalDetails.summary && (
            <div className="pdf-block">
              <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-3">
                {t.profile}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                {personalDetails.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experience && experience.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-1 pdf-block">
                {t.experience}
              </h2>
              <div className="flex flex-col gap-4">
                {experience.map((exp) => (
                  <div key={exp.id} className="text-xs pdf-block">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-[#0f172a]">
                        {exp.jobTitle}, <span className="font-medium text-slate-600">{exp.company}</span>
                      </h3>
                      <span className="text-slate-500 whitespace-nowrap text-right font-medium">
                        {exp.location}
                      </span>
                    </div>
                    <div className="text-slate-500 font-medium mb-1.5">
                      {exp.startDate} - {exp.endDate}
                    </div>
                    <p className="text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education && education.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-bold tracking-widest text-[#0f172a] uppercase border-b-2 border-[#0f172a] pb-1 mb-1 pdf-block">
                {t.education}
              </h2>
              <div className="flex flex-col gap-4">
                {education.map((edu) => (
                  <div key={edu.id} className="text-xs pdf-block">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-sm text-[#0f172a]">
                        {edu.school}, <span className="font-medium text-slate-600">{edu.degree}</span>
                      </h3>
                      <span className="text-slate-500 whitespace-nowrap text-right font-medium">
                        {edu.location}
                      </span>
                    </div>
                    <div className="text-slate-500 font-medium mb-1.5">
                      {edu.startDate} - {edu.endDate}
                    </div>
                    {edu.description && (
                      <p className="text-slate-600 leading-relaxed text-justify whitespace-pre-line">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. Modern Minimalist Template
export const ModernMinimalTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalDetails, experience, education, skills, languages } = data;
  const lang = data.templateLanguage || 'es';
  const t = translations[lang] || translations.es;

  return (
    <div className="bg-white text-[#334155] font-sans p-10 min-h-[1123px] relative flex flex-col shadow-sm text-left select-none">
      {/* Header Centered */}
      <div className="text-center mb-8 border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0f172a] uppercase leading-tight">
          {personalDetails.fullName || t.yourNameHere}
        </h1>
        {personalDetails.jobTitle && (
          <p className="text-sm font-bold tracking-widest text-indigo-600 uppercase mt-1">
            {personalDetails.jobTitle}
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-3 max-w-xl mx-auto font-medium">
          {personalDetails.phone && <span>📞 {personalDetails.phone}</span>}
          {personalDetails.email && <span>✉️ {personalDetails.email}</span>}
          {personalDetails.currentResidence && <span>📍 {personalDetails.currentResidence}</span>}
          {personalDetails.website && <span>🌐 {personalDetails.website}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-6 pdf-column">
        {/* Profile */}
        {personalDetails.summary && (
          <div className="pdf-block">
            <h2 className="text-xs font-extrabold tracking-widest text-[#0f172a] uppercase border-b border-slate-200 pb-1.5 mb-2.5">
              {t.profileProfessional}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line pl-4">
              {personalDetails.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold tracking-widest text-[#0f172a] uppercase border-b border-slate-200 pb-1.5 mb-1 pdf-block">
              {t.experience}
            </h2>
            <div className="flex flex-col gap-4 pl-4 border-l border-slate-100 ml-1">
              {experience.map((exp) => (
                <div key={exp.id} className="text-xs relative pdf-block">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-600" />
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#0f172a]">{exp.jobTitle}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="font-semibold text-slate-600">{exp.company}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{exp.location}</span>
                  </div>
                  <div className="text-indigo-600 font-bold mb-1 text-[11px]">
                    {exp.startDate} – {exp.endDate}
                  </div>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-extrabold tracking-widest text-[#0f172a] uppercase border-b border-slate-200 pb-1.5 mb-1 pdf-block">
              {t.educationAcademic}
            </h2>
            <div className="flex flex-col gap-4 pl-4 border-l border-slate-100 ml-1">
              {education.map((edu) => (
                <div key={edu.id} className="text-xs relative pdf-block">
                  <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-600" />
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-bold text-sm text-[#0f172a]">{edu.degree}</span>
                      <span className="text-slate-400 mx-2">|</span>
                      <span className="font-semibold text-slate-600">{edu.school}</span>
                    </div>
                    <span className="text-slate-400 font-medium">{edu.location}</span>
                  </div>
                  <div className="text-indigo-600 font-bold mb-1 text-[11px]">
                    {edu.startDate} – {edu.endDate}
                  </div>
                  {edu.description && (
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                      {edu.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Grid for Skills & Languages */}
        <div className="grid grid-cols-2 gap-8 mt-2 pdf-block">
          {/* Skills */}
          {skills && skills.length > 0 && (
            <div>
              <h2 className="text-xs font-extrabold tracking-widest text-[#0f172a] uppercase border-b border-slate-200 pb-1.5 mb-3">
                {t.skills}
              </h2>
              <div className="flex flex-wrap gap-1.5 pl-4">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages && languages.length > 0 && (
            <div>
              <h2 className="text-xs font-extrabold tracking-widest text-[#0f172a] uppercase border-b border-slate-200 pb-1.5 mb-3">
                {t.languages}
              </h2>
              <div className="flex flex-col gap-2 pl-4 text-xs">
                {languages.map((lang) => (
                  <div key={lang.id} className="flex justify-between items-center pr-4">
                    <span className="font-semibold text-slate-700">{lang.name}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2.5 h-2.5 rounded-full ${
                            idx < lang.level ? 'bg-indigo-600' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. Executive Chic Template (Header with colored band, premium structure)
export const ExecutiveChicTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalDetails, experience, education, skills, languages } = data;
  const lang = data.templateLanguage || 'es';
  const t = translations[lang] || translations.es;

  return (
    <div className="bg-[#fafaf9] text-[#292524] font-sans min-h-[1123px] relative flex flex-col shadow-sm text-left select-none">
      {/* Heavy Header Band */}
      <div className="bg-[#1c1917] text-[#fafaf9] px-10 py-8 flex flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-wider uppercase font-serif">
          {personalDetails.fullName || t.yourNameHere}
        </h1>
        {personalDetails.jobTitle && (
          <p className="text-sm font-semibold tracking-widest text-[#d6d3d1] uppercase mt-1">
            {personalDetails.jobTitle}
          </p>
        )}

        {/* Contact Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] text-[#a8a29e] mt-4 pt-4 border-t border-[#44403c]">
          {personalDetails.phone && <div><span className="font-bold text-[#fafaf9]">T:</span> {personalDetails.phone}</div>}
          {personalDetails.email && <div><span className="font-bold text-[#fafaf9]">E:</span> {personalDetails.email}</div>}
          {personalDetails.currentResidence && <div><span className="font-bold text-[#fafaf9]">L:</span> {personalDetails.currentResidence}</div>}
          {personalDetails.website && <div className="truncate"><span className="font-bold text-[#fafaf9]">W:</span> {personalDetails.website}</div>}
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="px-10 py-8 grid grid-cols-12 gap-8 flex-grow">
        {/* Left main area (70%) */}
        <div className="col-span-8 flex flex-col gap-6 pdf-column">
          {/* Summary */}
          {personalDetails.summary && (
            <div className="pdf-block">
              <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-3 font-serif">
                {t.profileExecutive}
              </h2>
              <p className="text-xs text-[#44403c] leading-relaxed text-justify whitespace-pre-line">
                {personalDetails.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {experience && experience.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-1 font-serif pdf-block">
                {t.experienceProfessional}
              </h2>
              <div className="flex flex-col gap-4">
                {experience.map((exp) => (
                  <div key={exp.id} className="text-xs pdf-block">
                    <div className="flex justify-between items-start font-bold text-sm text-[#1c1917] mb-1">
                      <span>{exp.jobTitle} – <span className="font-normal text-[#57534e]">{exp.company}</span></span>
                      <span className="text-xs font-semibold text-[#78716c]">{exp.location}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[#a8a29e] uppercase mb-1.5 tracking-wider">
                      {exp.startDate} – {exp.endDate}
                    </div>
                    <p className="text-[#44403c] leading-relaxed text-justify whitespace-pre-line">
                      {exp.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education && education.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-1 font-serif pdf-block">
                {t.educationCertifications}
              </h2>
              <div className="flex flex-col gap-4">
                {education.map((edu) => (
                  <div key={edu.id} className="text-xs pdf-block">
                    <div className="flex justify-between items-start font-bold text-sm text-[#1c1917] mb-1">
                      <span>{edu.degree} – <span className="font-normal text-[#57534e]">{edu.school}</span></span>
                      <span className="text-xs font-semibold text-[#78716c]">{edu.location}</span>
                    </div>
                    <div className="text-[11px] font-bold text-[#a8a29e] uppercase mb-1.5 tracking-wider">
                      {edu.startDate} – {edu.endDate}
                    </div>
                    {edu.description && (
                      <p className="text-[#44403c] leading-relaxed text-justify whitespace-pre-line">
                        {edu.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar area (30%) */}
        <div className="col-span-4 flex flex-col gap-6 pl-4 border-l border-[#e7e5e4] pdf-column">
          {/* Metadata details */}
          <div className="text-xs text-[#57534e] pdf-block">
            <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-3 font-serif">
              {t.datos}
            </h2>
            <div className="flex flex-col gap-2.5">
              {personalDetails.dateOfBirth && (
                <div>
                  <div className="font-bold text-[#1c1917] text-[11px] tracking-wider uppercase">{t.born}</div>
                  <div>{personalDetails.dateOfBirth}</div>
                </div>
              )}
              {personalDetails.placeOfBirth && (
                <div>
                  <div className="font-bold text-[#1c1917] text-[11px] tracking-wider uppercase">{t.origin}</div>
                  <div>{personalDetails.placeOfBirth}</div>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills && skills.length > 0 && (
            <div className="pdf-block">
              <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-3 font-serif">
                {t.skills}
              </h2>
              <div className="flex flex-col gap-2 text-xs">
                {skills.map((skill) => (
                  <div key={skill.id} className="pb-1.5 border-b border-[#e7e5e4] last:border-0 flex items-start gap-1.5 pdf-block">
                    <span className="text-[#1c1917] font-bold">•</span>
                    <span className="font-medium text-[#1c1917] leading-tight">{skill.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {languages && languages.length > 0 && (
            <div className="pdf-block">
              <h2 className="text-xs font-extrabold tracking-widest text-[#1c1917] uppercase border-b border-[#d6d3d1] pb-1.5 mb-3 font-serif">
                {t.languages}
              </h2>
              <div className="flex flex-col gap-4 text-xs">
                {languages.map((lang) => (
                  <div key={lang.id} className="pdf-block pb-2">
                    <div className="font-semibold text-[#1c1917] leading-normal">{lang.name}</div>
                    <div className="flex gap-1 mt-1.5 h-3 items-center">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div
                          key={idx}
                          style={{ height: '6px' }}
                          className={`w-full ${
                            idx < lang.level ? 'bg-[#1c1917]' : 'bg-[#e7e5e4]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. Sidebar Color Template — barra lateral de color con contacto, aptitudes e idiomas.
export const SidebarColorTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalDetails, experience, education, skills, languages } = data;
  const lang = data.templateLanguage || 'es';
  const t = translations[lang] || translations.es;

  const sidebarHeading = 'text-[11px] font-bold tracking-widest uppercase text-indigo-200 border-b border-indigo-400/40 pb-1 mb-2';
  const mainHeading = 'text-sm font-bold tracking-widest text-[#312e81] uppercase border-b-2 border-indigo-600 pb-1 mb-3';

  return (
    <div className="bg-white text-[#1e293b] font-sans min-h-[1123px] relative flex shadow-sm text-left select-none">
      {/* Left colored sidebar */}
      <div className="w-[34%] bg-[#312e81] text-white p-7 flex flex-col gap-6 pdf-column">
        <div>
          <h1 className="text-2xl font-bold leading-tight uppercase font-serif">
            {personalDetails.fullName || t.yourNameHere}
          </h1>
          {personalDetails.jobTitle && (
            <p className="text-xs text-indigo-200 mt-1 font-medium tracking-wide">{personalDetails.jobTitle}</p>
          )}
        </div>

        {/* Contact */}
        <div className="pdf-block">
          <h2 className={sidebarHeading}>{t.details}</h2>
          <div className="flex flex-col gap-2 text-[11px] text-indigo-50">
            {personalDetails.phone && <div className="break-words">{personalDetails.phone}</div>}
            {personalDetails.email && <div className="break-words">{personalDetails.email}</div>}
            {personalDetails.currentResidence && <div>{personalDetails.currentResidence}</div>}
            {personalDetails.dateOfBirth && (
              <div><span className="text-indigo-300">{t.born}:</span> {personalDetails.dateOfBirth}</div>
            )}
            {personalDetails.placeOfBirth && (
              <div><span className="text-indigo-300">{t.origin}:</span> {personalDetails.placeOfBirth}</div>
            )}
            {personalDetails.website && <div className="break-all">{personalDetails.website}</div>}
            {personalDetails.linkedin && <div className="break-all">{personalDetails.linkedin}</div>}
          </div>
        </div>

        {/* Skills */}
        {skills && skills.length > 0 && (
          <div className="pdf-block">
            <h2 className={sidebarHeading}>{t.skills}</h2>
            <ul className="flex flex-col gap-1.5 text-[11px] list-none pl-0">
              {skills.map((skill) => (
                <li key={skill.id} className="flex items-start gap-1.5">
                  <span className="text-indigo-300 font-bold">•</span>
                  <span className="text-indigo-50 leading-tight">{skill.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Languages */}
        {languages && languages.length > 0 && (
          <div className="pdf-block">
            <h2 className={sidebarHeading}>{t.languages}</h2>
            <div className="flex flex-col gap-2.5 text-[11px]">
              {languages.map((l) => (
                <div key={l.id}>
                  <div className="text-indigo-50 leading-normal">{l.name}</div>
                  <div className="flex gap-1 mt-1 h-2 items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        style={{ height: '5px' }}
                        className={`w-full rounded-[1px] ${i < l.level ? 'bg-indigo-300' : 'bg-indigo-400/30'}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right main column */}
      <div className="flex-1 p-8 flex flex-col gap-6 pdf-column">
        {personalDetails.summary && (
          <div className="pdf-block">
            <h2 className={mainHeading}>{t.profile}</h2>
            <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line">
              {personalDetails.summary}
            </p>
          </div>
        )}

        {experience && experience.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className={`${mainHeading} pdf-block`}>{t.experience}</h2>
            <div className="flex flex-col gap-4">
              {experience.map((exp) => (
                <div key={exp.id} className="text-xs pdf-block">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-bold text-sm text-[#312e81]">{exp.jobTitle}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {exp.startDate} – {exp.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">
                    {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                  </div>
                  <p className="text-slate-600 leading-relaxed text-justify whitespace-pre-line">{exp.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {education && education.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className={`${mainHeading} pdf-block`}>{t.education}</h2>
            <div className="flex flex-col gap-4">
              {education.map((edu) => (
                <div key={edu.id} className="text-xs pdf-block">
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="font-bold text-sm text-[#312e81]">{edu.degree}</span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {edu.startDate} – {edu.endDate}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">
                    {edu.school}{edu.location ? ` · ${edu.location}` : ''}
                  </div>
                  {edu.description && (
                    <p className="text-slate-600 leading-relaxed text-justify whitespace-pre-line">{edu.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. Timeline Template — una columna, cabecera centrada y línea de tiempo por item.
export const TimelineTemplate: React.FC<TemplateProps> = ({ data }) => {
  const { personalDetails, experience, education, skills, languages } = data;
  const lang = data.templateLanguage || 'es';
  const t = translations[lang] || translations.es;

  const contactBits = [
    personalDetails.phone,
    personalDetails.email,
    personalDetails.currentResidence,
    personalDetails.website,
  ].filter(Boolean);

  const heading = 'text-sm font-bold tracking-widest text-indigo-700 uppercase mb-4 text-center';

  const TimelineItem: React.FC<{
    title: string;
    subtitle: string;
    dates: string;
    description?: string;
  }> = ({ title, subtitle, dates, description }) => (
    <div className="relative pl-6 pb-5 pdf-block">
      <div className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
      <div className="absolute left-[4.5px] top-4 bottom-0 w-[1.5px] bg-indigo-100" />
      <div className="flex justify-between items-baseline gap-2">
        <span className="font-bold text-sm text-slate-800">{title}</span>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{dates}</span>
      </div>
      <div className="text-[11px] font-semibold text-indigo-600 mb-1">{subtitle}</div>
      {description && (
        <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line">{description}</p>
      )}
    </div>
  );

  return (
    <div className="bg-white text-[#1e293b] font-sans p-10 min-h-[1123px] flex flex-col gap-6 shadow-sm text-left select-none">
      {/* Centered header */}
      <div className="text-center pb-5 border-b border-slate-200">
        <h1 className="text-3xl font-bold tracking-wide text-slate-900 uppercase font-serif">
          {personalDetails.fullName || t.yourNameHere}
        </h1>
        {personalDetails.jobTitle && (
          <p className="text-sm text-indigo-600 mt-1 font-semibold tracking-wide">{personalDetails.jobTitle}</p>
        )}
        {contactBits.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-2 flex flex-wrap justify-center gap-x-2 gap-y-0.5">
            {contactBits.map((c, i) => (
              <span key={i}>
                {c}
                {i < contactBits.length - 1 && <span className="text-slate-300 ml-2">·</span>}
              </span>
            ))}
          </p>
        )}
      </div>

      {personalDetails.summary && (
        <div className="pdf-block">
          <h2 className={heading}>{t.profile}</h2>
          <p className="text-xs text-slate-600 leading-relaxed text-justify whitespace-pre-line max-w-2xl mx-auto">
            {personalDetails.summary}
          </p>
        </div>
      )}

      {experience && experience.length > 0 && (
        <div className="pdf-column">
          <h2 className={`${heading} pdf-block`}>{t.experience}</h2>
          <div className="flex flex-col">
            {experience.map((exp) => (
              <TimelineItem
                key={exp.id}
                title={exp.jobTitle}
                subtitle={`${exp.company}${exp.location ? ` · ${exp.location}` : ''}`}
                dates={`${exp.startDate} – ${exp.endDate}`}
                description={exp.description}
              />
            ))}
          </div>
        </div>
      )}

      {education && education.length > 0 && (
        <div className="pdf-column">
          <h2 className={`${heading} pdf-block`}>{t.education}</h2>
          <div className="flex flex-col">
            {education.map((edu) => (
              <TimelineItem
                key={edu.id}
                title={edu.degree}
                subtitle={`${edu.school}${edu.location ? ` · ${edu.location}` : ''}`}
                dates={`${edu.startDate} – ${edu.endDate}`}
                description={edu.description}
              />
            ))}
          </div>
        </div>
      )}

      {/* Skills + Languages, dos columnas */}
      {((skills && skills.length > 0) || (languages && languages.length > 0)) && (
        <div className="grid grid-cols-2 gap-8">
          {skills && skills.length > 0 && (
            <div className="pdf-block">
              <h2 className={heading}>{t.skills}</h2>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {skills.map((s) => (
                  <span key={s.id} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {languages && languages.length > 0 && (
            <div className="pdf-block">
              <h2 className={heading}>{t.languages}</h2>
              <div className="flex flex-col gap-2.5">
                {languages.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">{l.name}</span>
                    <RatingBars value={l.level} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ResumeTemplateSelector: React.FC<{
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
}> = ({ selected, onChange }) => {
  const options: { id: TemplateId; name: string; desc: string }[] = [
    {
      id: 'classic-split',
      name: 'Elegante Dividido',
      desc: 'Formato clásico con panel lateral para aptitudes e idiomas. Muy legible.',
    },
    {
      id: 'modern-minimal',
      name: 'Mínimo Moderno',
      desc: 'Diseño limpio con acentos sutiles de color y cabecera centrada.',
    },
    {
      id: 'executive-chic',
      name: 'Cabecera Ejecutiva',
      desc: 'Estilo corporativo refinado con banda superior de contraste.',
    },
    {
      id: 'sidebar-color',
      name: 'Barra Lateral',
      desc: 'Barra lateral de color con contacto, aptitudes e idiomas destacados.',
    },
    {
      id: 'timeline',
      name: 'Línea de Tiempo',
      desc: 'Una columna centrada con línea de tiempo en experiencia y educación.',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`p-3 rounded-lg border text-left transition-all duration-200 cursor-pointer ${
            selected === opt.id
              ? 'border-indigo-600 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-500'
              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="font-bold text-xs text-slate-800 uppercase tracking-wider">{opt.name}</div>
          <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{opt.desc}</div>
        </button>
      ))}
    </div>
  );
};

// Vista previa memoizada: selecciona la plantilla activa. React.memo evita re-renderizar
// el CV completo en re-renders ajenos a los datos (arrastre del divisor, toasts, drawer).
export const TemplatePreview = React.memo(function TemplatePreview({
  data,
  template,
}: {
  data: ResumeData;
  template: TemplateId;
}) {
  switch (template) {
    case 'classic-split':
      return <ClassicSplitTemplate data={data} />;
    case 'modern-minimal':
      return <ModernMinimalTemplate data={data} />;
    case 'executive-chic':
      return <ExecutiveChicTemplate data={data} />;
    case 'sidebar-color':
      return <SidebarColorTemplate data={data} />;
    case 'timeline':
      return <TimelineTemplate data={data} />;
    default:
      return <ClassicSplitTemplate data={data} />;
  }
});
