import React, { useState } from 'react';
import { ResumeData, WorkExperience, Education, Skill, Language } from '../types';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

export type TabId = 'personal' | 'experience' | 'education' | 'skills' | 'languages';

interface ResumeFormEditorProps {
  data: ResumeData;
  onChange: (newData: ResumeData) => void;
  // Sección activa, controlada desde el rail lateral (estilo Canva) en App.
  activeTab: TabId;
}

export const ResumeFormEditor: React.FC<ResumeFormEditorProps> = ({
  data,
  onChange,
  activeTab
}) => {
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);
  const [expandedEduId, setExpandedEduId] = useState<string | null>(null);

  // Reordenar por arrastre (genérico para todas las listas; solo una sección se ve
  // a la vez, así que un único par de índices basta).
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDndStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };
  const onDndOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null) return;
    if (overIndex !== index) setOverIndex(index);
  };
  const onDndEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };
  // Aplica el reorden de la lista al soltar sobre el índice destino.
  function applyReorder<T>(list: T[], target: number, apply: (r: T[]) => void) {
    if (dragIndex === null || dragIndex === target) {
      onDndEnd();
      return;
    }
    const r = [...list];
    const [moved] = r.splice(dragIndex, 1);
    r.splice(target, 0, moved);
    apply(r);
    onDndEnd();
  }

  // Mueve un elemento una posición (arriba/abajo). Alternativa al arrastre que
  // funciona con táctil Y teclado (el drag HTML5 no soporta táctil).
  function move<T>(list: T[], index: number, dir: -1 | 1, apply: (r: T[]) => void) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const r = [...list];
    [r[index], r[target]] = [r[target], r[index]];
    apply(r);
  }
  function moveButtons<T>(list: T[], index: number, apply: (r: T[]) => void) {
    return (
      <div className="flex flex-col -my-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => move(list, index, -1, apply)}
          disabled={index === 0}
          aria-label="Subir"
          className="p-1 text-ink-muted enabled:hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => move(list, index, 1, apply)}
          disabled={index === list.length - 1}
          aria-label="Bajar"
          className="p-1 text-ink-muted enabled:hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Helper updates
  const updatePersonal = (field: keyof typeof data.personalDetails, value: string) => {
    onChange({
      ...data,
      personalDetails: {
        ...data.personalDetails,
        [field]: value
      }
    });
  };

  // Experience Handlers
  const addExperience = () => {
    const newId = `exp-${Date.now()}`;
    const newExp: WorkExperience = {
      id: newId,
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    onChange({
      ...data,
      experience: [newExp, ...data.experience]
    });
    setExpandedExpId(newId);
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: string) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    });
  };

  const removeExperience = (id: string) => {
    onChange({
      ...data,
      experience: data.experience.filter((exp) => exp.id !== id)
    });
  };

  // Education Handlers
  const addEducation = () => {
    const newId = `edu-${Date.now()}`;
    const newEdu: Education = {
      id: newId,
      degree: '',
      school: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    onChange({
      ...data,
      education: [newEdu, ...data.education]
    });
    setExpandedEduId(newId);
  };

  const updateEducation = (id: string, field: keyof Education, value: string) => {
    onChange({
      ...data,
      education: data.education.map((edu) =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    });
  };

  const removeEducation = (id: string) => {
    onChange({
      ...data,
      education: data.education.filter((edu) => edu.id !== id)
    });
  };

  // Skill Handlers
  const [newSkillName, setNewSkillName] = useState('');

  const addSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim()
    };
    onChange({
      ...data,
      skills: [...data.skills, newSkill]
    });
    setNewSkillName('');
  };

  const removeSkill = (id: string) => {
    onChange({
      ...data,
      skills: data.skills.filter((s) => s.id !== id)
    });
  };

  // Language Handlers
  const [newLangName, setNewLangName] = useState('');
  const [newLangLevel, setNewLangLevel] = useState<number>(5);

  const addLanguage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLangName.trim()) return;
    const newLang: Language = {
      id: `lang-${Date.now()}`,
      name: newLangName.trim(),
      level: newLangLevel
    };
    onChange({
      ...data,
      languages: [...data.languages, newLang]
    });
    setNewLangName('');
    setNewLangLevel(5);
  };

  const removeLanguage = (id: string) => {
    onChange({
      ...data,
      languages: data.languages.filter((l) => l.id !== id)
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm flex flex-col h-full overflow-hidden text-left">
      {/* La navegación entre secciones la controla el rail lateral (App). Aquí solo
          se renderiza el contenido de la sección activa. */}
      <div className="p-5 flex-grow overflow-y-auto space-y-5">
        {/* PERSONAL DETAILS TAB */}
        {activeTab === 'personal' && (
          <div className="space-y-4">
            {/* Standard Form Inputs. items-end alinea los recuadros al fondo de cada
                fila para que no se desalineen cuando un título ocupa más líneas que
                el de al lado (varía según la longitud del texto / el idioma). */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={data.personalDetails.fullName}
                  aria-label="Nombre completo" onChange={(e) => updatePersonal('fullName', e.target.value)}
                  placeholder="Maria Fernanda Artigas Herold"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Título Profesional / Cargo
                </label>
                <input
                  type="text"
                  value={data.personalDetails.jobTitle}
                  aria-label="Título profesional o cargo" onChange={(e) => updatePersonal('jobTitle', e.target.value)}
                  placeholder="Junior Software Development, AI-first"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={data.personalDetails.phone}
                  aria-label="Teléfono" onChange={(e) => updatePersonal('phone', e.target.value)}
                  placeholder="+39 351 6337160"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={data.personalDetails.email}
                  aria-label="Correo electrónico" onChange={(e) => updatePersonal('email', e.target.value)}
                  placeholder="mfaherold1998@gmail.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="text"
                  value={data.personalDetails.dateOfBirth}
                  aria-label="Fecha de nacimiento" onChange={(e) => updatePersonal('dateOfBirth', e.target.value)}
                  placeholder="12/19/1998"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Lugar de Nacimiento
                </label>
                <input
                  type="text"
                  value={data.personalDetails.placeOfBirth}
                  aria-label="Lugar de nacimiento" onChange={(e) => updatePersonal('placeOfBirth', e.target.value)}
                  placeholder="Cuba"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Residencia Actual
                </label>
                <input
                  type="text"
                  value={data.personalDetails.currentResidence}
                  aria-label="Residencia actual" onChange={(e) => updatePersonal('currentResidence', e.target.value)}
                  placeholder="Cosenza, Italy"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Sitio Web / Portfolio (Opcional)
                </label>
                <input
                  type="text"
                  value={data.personalDetails.website || ''}
                  aria-label="Sitio web o portafolio" onChange={(e) => updatePersonal('website', e.target.value)}
                  placeholder="https://myportfolio.com"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  LinkedIn URL (Opcional)
                </label>
                <input
                  type="text"
                  value={data.personalDetails.linkedin || ''}
                  aria-label="URL de LinkedIn" onChange={(e) => updatePersonal('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/maria"
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">
                  Perfil / Resumen Profesional
                </label>
                <textarea
                  value={data.personalDetails.summary}
                  aria-label="Perfil o resumen profesional" onChange={(e) => updatePersonal('summary', e.target.value)}
                  rows={4}
                  placeholder="Cuéntanos sobre ti, tus habilidades y objetivos..."
                  className="w-full px-3.5 py-2 rounded-lg border border-line text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none leading-relaxed"
                />
                {/* Andamiaje para primerizos: qué hace un buen resumen. */}
                <p className="mt-1.5 text-[11px] text-ink-muted leading-relaxed">
                  2–3 frases: tu rol, tus años de experiencia y 2 logros o fortalezas. Ej.:{' '}
                  <span className="text-ink-muted italic">
                    «Diseñadora UX con 4 años creando productos digitales; mejoré la conversión un 30 % y
                    lideré el rediseño de la app principal.»
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* WORK EXPERIENCE TAB */}
        {activeTab === 'experience' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Historial de Experiencia
              </span>
              <button
                onClick={addExperience}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Cargo
              </button>
            </div>

            {data.experience.length === 0 ? (
              <div className="text-center py-8 bg-surface-2 rounded-xl border border-dashed border-line text-ink-muted text-xs">
                No has agregado ninguna experiencia todavía. Haz clic en "Agregar Cargo".
              </div>
            ) : (
              <div className="space-y-3">
                {data.experience.map((exp, index) => {
                  const isExpanded = expandedExpId === exp.id;
                  const isDragging = dragIndex === index;
                  const isOver = overIndex === index;

                  return (
                    <div
                      key={exp.id}
                      draggable={true}
                      onDragStart={(e) => onDndStart(e, index)}
                      onDragOver={(e) => onDndOver(e, index)}
                      onDragEnd={onDndEnd}
                      onDrop={(e) => {
                        e.preventDefault();
                        applyReorder(data.experience, index, (r) => onChange({ ...data, experience: r }));
                      }}
                      className={`border rounded-xl bg-surface overflow-hidden shadow-sm transition-all duration-200 ${
                        isDragging ? 'opacity-40 border-brand-400 bg-surface-2 border-dashed scale-[0.98]' : 'border-line'
                      } ${
                        isOver && !isDragging ? 'border-t-4 border-t-brand-600 bg-brand-50/20 dark:bg-brand-900/40 shadow-md' : ''
                      }`}
                    >
                      {/* Accordion Trigger */}
                      <div
                        onClick={() => setExpandedExpId(isExpanded ? null : exp.id)}
                        className="flex justify-between items-center px-3 py-3 bg-surface-2/50 cursor-pointer hover:bg-surface-2 select-none gap-2"
                      >
                        <div className="flex items-center gap-1.5 truncate flex-grow">
                          {moveButtons(data.experience, index, (r) => onChange({ ...data, experience: r }))}
                          <div
                            title="Arrastra para reordenar esta experiencia laboral"
                            className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded transition hidden sm:block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4 flex-shrink-0" />
                          </div>

                          <div className="truncate text-left">
                            <span className="font-bold text-xs text-ink">
                              {exp.jobTitle || `Cargo #${data.experience.length - index}`}
                            </span>
                            {exp.company && (
                              <span className="text-ink-muted text-xs ml-1 font-medium">
                                en {exp.company}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeExperience(exp.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            aria-label="Eliminar esta experiencia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-line grid grid-cols-2 gap-3 bg-surface items-end">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Puesto / Título
                            </label>
                            <input
                              type="text"
                              value={exp.jobTitle}
                              aria-label="Puesto" onChange={(e) => updateExperience(exp.id, 'jobTitle', e.target.value)}
                              placeholder="Ej: Computer Technician"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Empresa
                            </label>
                            <input
                              type="text"
                              value={exp.company}
                              aria-label="Empresa" onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                              placeholder="Ej: UAI-UTCS"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Ubicación
                            </label>
                            <input
                              type="text"
                              value={exp.location}
                              aria-label="Ubicación de la experiencia" onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                              placeholder="Ej: Cosenza, Italy"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 items-end">
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                                Inicio
                              </label>
                              <input
                                type="text"
                                value={exp.startDate}
                                aria-label="Fecha de inicio de la experiencia" onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                placeholder="Ej: Apr 2026"
                                className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                                Fin
                              </label>
                              <input
                                type="text"
                                value={exp.endDate}
                                aria-label="Fecha de fin de la experiencia" onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                placeholder="Ej: Current o Mar 2026"
                                className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Descripción de funciones y logros
                            </label>
                            <textarea
                              value={exp.description}
                              aria-label="Descripción de la experiencia" onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                              rows={4}
                              placeholder="Creación y mantenimiento de servicios web..."
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === 'education' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-line">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Historial Académico
              </span>
              <button
                onClick={addEducation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Estudio
              </button>
            </div>

            {data.education.length === 0 ? (
              <div className="text-center py-8 bg-surface-2 rounded-xl border border-dashed border-line text-ink-muted text-xs">
                No has agregado ninguna formación todavía. Haz clic en "Agregar Estudio".
              </div>
            ) : (
              <div className="space-y-3">
                {data.education.map((edu, index) => {
                  const isExpanded = expandedEduId === edu.id;
                  const isDragging = dragIndex === index;
                  const isOver = overIndex === index;
                  return (
                    <div
                      key={edu.id}
                      draggable={true}
                      onDragStart={(e) => onDndStart(e, index)}
                      onDragOver={(e) => onDndOver(e, index)}
                      onDragEnd={onDndEnd}
                      onDrop={(e) => {
                        e.preventDefault();
                        applyReorder(data.education, index, (r) => onChange({ ...data, education: r }));
                      }}
                      className={`border rounded-xl bg-surface overflow-hidden shadow-sm transition-all duration-200 ${
                        isDragging ? 'opacity-40 border-brand-400 bg-surface-2 border-dashed scale-[0.98]' : 'border-line'
                      } ${isOver && !isDragging ? 'border-t-4 border-t-brand-600 bg-brand-50/20 dark:bg-brand-900/40 shadow-md' : ''}`}
                    >
                      {/* Accordion Trigger */}
                      <div
                        onClick={() => setExpandedEduId(isExpanded ? null : edu.id)}
                        className="flex justify-between items-center px-3 py-3 bg-surface-2/50 cursor-pointer hover:bg-surface-2 select-none gap-2"
                      >
                        <div className="flex items-center gap-1.5 truncate flex-grow">
                          {moveButtons(data.education, index, (r) => onChange({ ...data, education: r }))}
                          <div
                            title="Arrastra para reordenar este estudio"
                            className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/40 rounded transition hidden sm:block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4 flex-shrink-0" />
                          </div>
                          <div className="truncate text-left">
                            <span className="font-bold text-xs text-ink">
                              {edu.degree || `Estudio #${data.education.length - index}`}
                            </span>
                            {edu.school && (
                              <span className="text-ink-muted text-xs ml-1 font-medium">
                                en {edu.school}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeEducation(edu.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            aria-label="Eliminar este estudio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-line grid grid-cols-2 gap-3 bg-surface items-end">
                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Grado / Carrera obtenido
                            </label>
                            <input
                              type="text"
                              value={edu.degree}
                              aria-label="Título de estudios" onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                              placeholder="Ej: Laurea Magistrale, Computer Science"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Centro Educativo / Universidad
                            </label>
                            <input
                              type="text"
                              value={edu.school}
                              aria-label="Centro educativo o universidad" onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                              placeholder="Ej: Università della Calabria"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Ubicación
                            </label>
                            <input
                              type="text"
                              value={edu.location}
                              aria-label="Ubicación del estudio" onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                              placeholder="Ej: Cosenza, Italy"
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 items-end">
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                                Inicio
                              </label>
                              <input
                                type="text"
                                value={edu.startDate}
                                aria-label="Fecha de inicio del estudio" onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                placeholder="Ej: Oct 2022"
                                className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                                Fin
                              </label>
                              <input
                                type="text"
                                value={edu.endDate}
                                aria-label="Fecha de fin del estudio" onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                placeholder="Ej: Apr 2026"
                                className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                              />
                            </div>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                              Detalles adicionales / Cursos notables
                            </label>
                            <textarea
                              value={edu.description}
                              aria-label="Detalles del estudio" onChange={(e) => updateEducation(edu.id, 'description', e.target.value)}
                              rows={3}
                              placeholder="Asignaturas relevantes, proyectos de fin de carrera, honores..."
                              className="w-full px-3 py-1.5 rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500 resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-line">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Aptitudes y Habilidades
              </span>
            </div>

            {/* Quick Skill Form */}
            <form onSubmit={addSkill} className="flex gap-2 items-end bg-surface-2 p-3 rounded-xl border border-slate-150">
              <div className="flex-grow">
                <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                  Nueva Aptitud / Habilidad
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  aria-label="Nueva aptitud o habilidad" onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Ej: Programación en Python, Problem Solving, Trabajo en Equipo..."
                  className="w-full px-3 py-1.5 bg-surface rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition cursor-pointer h-[30px] flex items-center justify-center"
              >
                Agregar
              </button>
            </form>

            {/* Skill list */}
            {data.skills.length === 0 ? (
              <div className="text-center py-6 text-ink-muted text-xs">
                No has agregado ninguna aptitud aún. Completa el formulario de arriba para agregar habilidades.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.skills.map((skill, index) => {
                  const isDragging = dragIndex === index;
                  const isOver = overIndex === index;
                  return (
                    <div
                      key={skill.id}
                      draggable={true}
                      onDragStart={(e) => onDndStart(e, index)}
                      onDragOver={(e) => onDndOver(e, index)}
                      onDragEnd={onDndEnd}
                      onDrop={(e) => {
                        e.preventDefault();
                        applyReorder(data.skills, index, (r) => onChange({ ...data, skills: r }));
                      }}
                      className={`flex justify-between items-center bg-surface p-2.5 rounded-lg border shadow-sm transition-all duration-200 ${
                        isDragging ? 'opacity-40 border-brand-400 border-dashed scale-[0.98]' : 'border-line'
                      } ${isOver && !isDragging ? 'border-t-4 border-t-brand-600 bg-brand-50/20 dark:bg-brand-900/40' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {moveButtons(data.skills, index, (r) => onChange({ ...data, skills: r }))}
                        <div
                          title="Arrastra para reordenar"
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hidden sm:block"
                        >
                          <GripVertical className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <span className="font-semibold text-xs text-ink truncate">{skill.name}</span>
                      </div>
                      <button
                        onClick={() => removeSkill(skill.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LANGUAGES TAB */}
        {activeTab === 'languages' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-line">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Idiomas y Competencias
              </span>
            </div>

            {/* Quick Language Form */}
            <form onSubmit={addLanguage} className="flex gap-2 items-end bg-surface-2 p-3 rounded-xl border border-slate-150">
              <div className="flex-grow">
                <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                  Idioma
                </label>
                <input
                  type="text"
                  value={newLangName}
                  aria-label="Idioma" onChange={(e) => setNewLangName(e.target.value)}
                  placeholder="Ej: Español, Inglés, Italiano..."
                  className="w-full px-3 py-1.5 bg-surface rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-bold uppercase text-ink-muted mb-1">
                  Dominio
                </label>
                <select
                  value={newLangLevel}
                  aria-label="Nivel de dominio del idioma" onChange={(e) => setNewLangLevel(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-surface rounded-lg border border-line text-xs focus:ring-1 focus:ring-brand-500"
                >
                  <option value={1}>1 - Básico</option>
                  <option value={2}>2 - Elemental</option>
                  <option value={3}>3 - Intermedio</option>
                  <option value={4}>4 - Avanzado</option>
                  <option value={5}>5 - Nativo</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 transition cursor-pointer"
              >
                Agregar
              </button>
            </form>

            {/* Language list */}
            {data.languages.length === 0 ? (
              <div className="text-center py-6 text-ink-muted text-xs">
                No has agregado ningún idioma aún. Completa el formulario de arriba.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.languages.map((lang, index) => {
                  const isDragging = dragIndex === index;
                  const isOver = overIndex === index;
                  return (
                    <div
                      key={lang.id}
                      draggable={true}
                      onDragStart={(e) => onDndStart(e, index)}
                      onDragOver={(e) => onDndOver(e, index)}
                      onDragEnd={onDndEnd}
                      onDrop={(e) => {
                        e.preventDefault();
                        applyReorder(data.languages, index, (r) => onChange({ ...data, languages: r }));
                      }}
                      className={`flex justify-between items-center bg-surface p-2.5 rounded-lg border shadow-sm transition-all duration-200 ${
                        isDragging ? 'opacity-40 border-brand-400 border-dashed scale-[0.98]' : 'border-line'
                      } ${isOver && !isDragging ? 'border-t-4 border-t-brand-600 bg-brand-50/20 dark:bg-brand-900/40' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {moveButtons(data.languages, index, (r) => onChange({ ...data, languages: r }))}
                        <div
                          title="Arrastra para reordenar"
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 hidden sm:block"
                        >
                          <GripVertical className="w-4 h-4 flex-shrink-0" />
                        </div>
                        <span className="font-semibold text-xs text-ink">{lang.name}</span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < lang.level ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeLanguage(lang.id)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
