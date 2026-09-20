import React, { useState, useEffect, useRef } from 'react';
import { ResumeData, TemplateId, TemplateLanguage, ResumeAppearance } from './types';
import { defaultResumeData } from './defaultData';
import { ResumeTemplateSelector, TemplatePreview } from './components/ResumeTemplates';
import { ResumeFormEditor, TabId } from './components/ResumeFormEditor';
import { Dashboard } from './components/Dashboard';
import { SideDrawer, DrawerSection } from './components/SideDrawer';
import { UploadCvModal } from './components/UploadCvModal';
import { AuthScreen } from './components/AuthScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AnalyzeScreen } from './components/AnalyzeScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { NewCvModal } from './components/NewCvModal';
import { TranslateModal } from './components/TranslateModal';
import { BrandMark } from './components/BrandMark';
import { langLabel, langShort } from './languages';
import { ThemePref, Theme, getThemePref, effectiveTheme, setThemePref, applyTheme, watchSystemTheme } from './theme';
import * as api from './api';
import { AuthUser } from './api';
import {
  Sparkles,
  Trash2,
  Save,
  AlertCircle,
  Globe,
  Check,
  Printer,
  ArrowLeft,
  LayoutTemplate,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Languages,
  Loader2
} from 'lucide-react';

type View = 'dashboard' | 'editor' | 'analyze' | 'profile' | 'settings';
// Secciones del rail (estilo Canva): plantilla (incluye idioma de la plantilla) + las
// 5 del formulario. "Idiomas" (con L mayúscula) son las competencias lingüísticas del CV.
type Section = 'template' | TabId;

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'template', label: 'Plantilla', icon: <LayoutTemplate className="w-5 h-5" /> },
  { id: 'personal', label: 'Personales', icon: <User className="w-5 h-5" /> },
  { id: 'experience', label: 'Experiencia', icon: <Briefcase className="w-5 h-5" /> },
  { id: 'education', label: 'Educación', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'skills', label: 'Aptitudes', icon: <Wrench className="w-5 h-5" /> },
  { id: 'languages', label: 'Idiomas', icon: <Languages className="w-5 h-5" /> }
];

// Campos mínimos para considerar un CV "completo" y poder traducirlo sin desperdiciar
// una llamada a la IA. Devuelve la lista de lo que falta (vacía = completo).
const missingForComplete = (r: ResumeData): string[] => {
  const missing: string[] = [];
  if (!r.personalDetails.fullName?.trim()) missing.push('Tu nombre completo');
  if (!r.personalDetails.jobTitle?.trim()) missing.push('Tu puesto o titular profesional');
  if (!r.personalDetails.summary?.trim()) missing.push('El resumen / perfil');
  if (!r.experience.some((e) => e.jobTitle?.trim() && e.company?.trim()))
    missing.push('Al menos una experiencia (puesto y empresa)');
  if (!r.skills.some((s) => s.name?.trim())) missing.push('Al menos una habilidad');
  return missing;
};

export default function App() {
  // Vista activa: el dashboard (lista de CVs) o el editor de un CV concreto.
  const [view, setView] = useState<View>('dashboard');
  // Rail lateral: expandido (iconos+nombres) o colapsado (solo iconos). Siempre visible
  // fuera del editor.
  const [drawerExpanded, setDrawerExpanded] = useState<boolean>(false);
  // Tema: preferencia (claro/oscuro/sistema) + tema efectivo que se aplica al DOM.
  const [themePref, setThemePrefState] = useState<ThemePref>(getThemePref());
  const effTheme: Theme = effectiveTheme(themePref);
  const [, setSysTick] = useState(0); // fuerza re-render cuando el SO cambia de tema
  const changeThemePref = (pref: ThemePref) => {
    setThemePref(pref);
    setThemePrefState(pref);
  };
  const toggleTheme = () => changeThemePref(effTheme === 'dark' ? 'light' : 'dark');
  // Pantalla "Cargar CV" (subida con IA).
  const [uploadOpen, setUploadOpen] = useState<boolean>(false);
  // Modal "Nuevo CV" (elegir idioma).
  const [newCvOpen, setNewCvOpen] = useState<boolean>(false);
  // Modal "Traducir" + estado de la traducción.
  const [translateOpen, setTranslateOpen] = useState<boolean>(false);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  // Sección activa del editor (rail estilo Canva).
  const [activeSection, setActiveSection] = useState<Section>('template');
  // Ancho (px) del panel de opciones; el resto lo ocupa la vista previa. Arrastrable.
  const [optionsWidth, setOptionsWidth] = useState<number>(440);
  const splitRef = useRef<HTMLDivElement>(null);

  // Saved resumes state (local profiles management)
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string>('');
  const [activeResume, setActiveResume] = useState<ResumeData>(defaultResumeData);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('classic-split');

  // Status states
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error';
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-saved confirmation flash
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);

  // Edición inline del título del CV desde la cabecera del editor.
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleDraft, setTitleDraft] = useState<string>('');

  // Autenticación.
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Auto-guardado con debounce: agrupa las ediciones para no hacer un PUT por tecla.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<ResumeData | null>(null);

  // Print Ref
  const resumePrintRef = useRef<HTMLDivElement>(null);

  // 1. Al montar: comprobar sesión; si hay usuario, cargar sus CVs del servidor.
  useEffect(() => {
    (async () => {
      try {
        const user = await api.me();
        if (user) {
          setCurrentUser(user);
          await loadResumes();
        }
      } catch (e) {
        console.error('Error comprobando sesión:', e);
      } finally {
        setAuthLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si la preferencia es 'system', re-aplicar y re-renderizar cuando el SO cambie de tema.
  useEffect(() => {
    if (themePref !== 'system') return;
    return watchSystemTheme(() => {
      applyTheme('system');
      setSysTick((n) => n + 1);
    });
  }, [themePref]);

  // Aplica una lista de CVs (del servidor) al estado local, fijando el CV activo.
  const applyResumeList = (list: ResumeData[], activeId: string | null) => {
    setResumes(list);
    const active = list.find((r) => r.id === activeId) || list[0];
    setActiveResumeId(active?.id || '');
    if (active) setActiveResume(active);
  };

  // Migración suave: si el servidor no tiene CVs pero este navegador guardó algunos
  // en localStorage (versión anterior), subirlos una vez. Se conserva la copia local.
  const migrateLocalResumes = async (): Promise<boolean> => {
    const stored = localStorage.getItem('cv_builder_resumes');
    if (!stored) return false;
    try {
      const parsed = JSON.parse(stored) as ResumeData[];
      if (!parsed?.length) return false;
      for (const r of parsed) await api.saveResume(r);
      const localActive = localStorage.getItem('cv_builder_active_id');
      if (localActive) await api.setActive(localActive).catch(() => {});
      showToast(`Migrados ${parsed.length} CV(s) desde este navegador.`);
      return true;
    } catch {
      return false;
    }
  };

  // Carga los CVs del usuario desde el servidor (con migración si procede).
  const loadResumes = async () => {
    let { resumes: list, activeId } = await api.listResumes();
    if (list.length === 0 && (await migrateLocalResumes())) {
      ({ resumes: list, activeId } = await api.listResumes());
    }
    applyResumeList(list, activeId);
  };

  // Toast auto-desechable; con acción opcional (p. ej. "Deshacer") y ventana más
  // larga. Se cancela el temporizador anterior para que un toast nuevo no lo herede.
  const showToast = (
    text: string,
    type: 'success' | 'error' = 'success',
    action?: { label: string; onClick: () => void }
  ) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage({ text, type, action });
    toastTimer.current = setTimeout(() => setToastMessage(null), action ? 7000 : 4000);
  };

  // Estado local de la lista de CVs (el servidor es la fuente de verdad; se guarda
  // por CV con saveOne/scheduleSave).
  const persistResumes = (list: ResumeData[]) => setResumes(list);

  // Guardado inmediato de un CV en el servidor (crear/duplicar/renombrar/apariencia/importar).
  const saveOne = (resume: ResumeData) =>
    api.saveResume(resume).catch(() => showToast('No se pudo guardar en el servidor.', 'error'));

  // Guardado con debounce (~600 ms) para el auto-guardado del editor.
  const scheduleSave = (resume: ResumeData) => {
    pendingSave.current = resume;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const r = pendingSave.current;
      pendingSave.current = null;
      if (r) {
        api
          .saveResume(r)
          .catch(() => showToast('No se pudo guardar. Se reintentará al siguiente cambio.', 'error'));
      }
    }, 600);
  };

  // Fija el CV activo en el servidor (estado por usuario). Silencioso ante fallo.
  const persistActive = (id: string | null) => api.setActive(id).catch(() => {});

  // Login/registro correcto → cargar los CVs del usuario.
  const handleAuthenticated = async (user: AuthUser) => {
    setCurrentUser(user);
    await loadResumes();
  };

  // Cerrar sesión → limpiar estado y volver a la pantalla de acceso.
  const handleLogout = async () => {
    await api.logout().catch(() => {});
    setCurrentUser(null);
    setResumes([]);
    setActiveResumeId('');
    setView('dashboard');
  };

  // Abrir un CV en el editor.
  const openEditor = (id: string) => {
    const target = resumes.find((r) => r.id === id);
    if (!target) return;
    setActiveResumeId(id);
    setActiveResume(target);
    persistActive(id);
    setActiveSection('template');
    setView('editor');
  };

  // Navegación desde el menú lateral (el drawer permanece abierto, estilo Gemini).
  const handleNavigate = (section: DrawerSection) => setView(section);

  // Perfil actualizado (nombre/avatar) → refrescar el usuario en memoria.
  const handleProfileUpdated = (user: AuthUser) => setCurrentUser(user);

  // Arrastrar el divisor: ajusta el ancho del panel de opciones (y por tanto el de
  // la vista previa) reduciendo uno a medida que crece el otro.
  // Divisor con Pointer Events: funciona con ratón Y táctil (antes solo ratón).
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;

    const onMove = (ev: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const min = 300; // ancho mínimo del panel de opciones
      const max = rect.width - 360; // deja al menos 360px para la vista previa
      const next = Math.max(min, Math.min(ev.clientX - rect.left, max));
      setOptionsWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  // 2. Auto-save active resume changes (estado optimista + guardado con debounce)
  const handleResumeChange = (newData: ResumeData) => {
    // Refrescar la marca de tiempo en cada edición (antes solo se actualizaba
    // al crear/duplicar, así que "última modificación" no reflejaba los cambios).
    const stamped: ResumeData = { ...newData, updatedAt: new Date().toISOString() };
    setActiveResume(stamped);
    setIsAutoSaving(true);

    persistResumes(resumes.map((r) => (r.id === stamped.id ? stamped : r)));
    scheduleSave(stamped);

    setTimeout(() => setIsAutoSaving(false), 800);
  };

  // Create clean blank CV con un idioma fijo → abre el editor para rellenarlo.
  const handleCreateBlankResume = (language: TemplateLanguage = 'es') => {
    const newId = `resume-${Date.now()}`;
    const newResume: ResumeData = {
      id: newId,
      name: `Nuevo Curriculum (${resumes.length + 1})`,
      personalDetails: {
        fullName: '',
        jobTitle: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        placeOfBirth: '',
        currentResidence: '',
        summary: ''
      },
      experience: [],
      education: [],
      skills: [],
      languages: [],
      templateLanguage: language,
      updatedAt: new Date().toISOString()
    };

    persistResumes([...resumes, newResume]);
    setActiveResumeId(newId);
    setActiveResume(newResume);
    saveOne(newResume);
    persistActive(newId);
    setActiveSection('template');
    setNewCvOpen(false);
    setView('editor');
    showToast('¡Creado nuevo CV en blanco!');
  };

  // Abrir la pantalla "Cargar CV" (subida con IA).
  const openUpload = () => {
    setParsingError(null);
    setUploadOpen(true);
  };

  // Duplicate a specific resume (desde el menú de la tarjeta) → permanece en el dashboard.
  const handleDuplicateResume = (id: string) => {
    const src = resumes.find((r) => r.id === id);
    if (!src) return;
    const newId = `resume-dup-${Date.now()}`;
    const duplicate: ResumeData = {
      ...src,
      id: newId,
      name: `${src.name} (Copia)`,
      updatedAt: new Date().toISOString()
    };
    persistResumes([...resumes, duplicate]);
    saveOne(duplicate);
    showToast(`¡Copiado: "${src.name}"!`);
  };

  // Eliminar un CV. Sin diálogo de confirmación: se borra al momento pero se ofrece
  // "Deshacer" en un toast (patrón reversible, mejor que el confirm). Si es el CV
  // activo (o se borra desde el editor), se vuelve al dashboard.
  const handleDeleteResume = (id: string) => {
    const target = resumes.find((r) => r.id === id);
    if (!target) return;

    const remaining = resumes.filter((r) => r.id !== id);
    persistResumes(remaining);
    api.deleteResume(id).catch(() => showToast('No se pudo eliminar en el servidor.', 'error'));

    const wasActive = id === activeResumeId;
    if (wasActive) {
      if (remaining.length > 0) {
        setActiveResumeId(remaining[0].id);
        setActiveResume(remaining[0]);
        persistActive(remaining[0].id);
      } else {
        setActiveResumeId('');
        persistActive(null);
      }
      setView('dashboard');
    }

    // Deshacer: reañade el CV (con sus datos intactos) y lo vuelve a guardar en el server.
    showToast(`"${target.name}" eliminado`, 'success', {
      label: 'Deshacer',
      onClick: () => {
        setResumes((prev) => (prev.some((r) => r.id === target.id) ? prev : [...prev, target]));
        saveOne(target);
        if (wasActive) persistActive(target.id);
        showToast('CV restaurado');
      },
    });
  };

  // Rename a specific resume (desde el menú de la tarjeta).
  const handleRenameResume = (id: string, name: string) => {
    const stamped = new Date().toISOString();
    const list = resumes.map((r) => (r.id === id ? { ...r, name, updatedAt: stamped } : r));
    persistResumes(list);
    const updated = list.find((r) => r.id === id);
    if (updated) {
      saveOne(updated);
      if (id === activeResumeId) setActiveResume(updated);
    }
    showToast('Nombre actualizado');
  };

  // Cambiar la apariencia (icono/color/imagen) de un CV desde el dashboard.
  const handleChangeAppearance = (id: string, appearance: ResumeAppearance) => {
    const stamped = new Date().toISOString();
    const list = resumes.map((r) => (r.id === id ? { ...r, appearance, updatedAt: stamped } : r));
    persistResumes(list);
    const updated = list.find((r) => r.id === id);
    if (updated) {
      saveOne(updated);
      if (id === activeResumeId) setActiveResume(updated);
    }
  };

  // Edición inline del título del CV activo (cabecera del editor).
  const startEditTitle = () => {
    setTitleDraft(activeResume.name);
    setEditingTitle(true);
  };
  const commitTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== activeResume.name) {
      handleRenameResume(activeResumeId, titleDraft.trim());
    }
    setEditingTitle(false);
  };

  // 3. Importación de CV con IA (compartida por el editor y la pantalla "Cargar CV").

  // Construye el payload para /api/parse-cv. El texto plano va como textContent; PDF,
  // imágenes y Word (.doc/.docx) van como base64 + mimeType (el server extrae el texto
  // de los Word). Se envía fileName para que el server detecte el tipo con fiabilidad.
  const buildParsePayload = async (file: File) => {
    const lower = file.name.toLowerCase();
    const isText = file.type.startsWith('text/') || /\.(txt|md|csv)$/.test(lower);
    if (isText) {
      return { textContent: await file.text(), fileName: file.name };
    }
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
    reader.readAsDataURL(file);
    const fileBase64 = await base64Promise;
    return { fileBase64, mimeType: file.type || 'application/pdf', fileName: file.name };
  };

  // Llama a la API y devuelve los datos ya estructurados por la IA (o lanza error).
  const requestParse = async (file: File) => {
    const payload = await buildParsePayload(file);
    const response = await fetch('/api/parse-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'No se pudo procesar el currículum con Inteligencia Artificial.');
    }
    return result.data;
  };

  // Convierte los datos crudos de la IA en un ResumeData completo (con IDs por item).
  const hydrateResume = (
    parsedData: any,
    base: { id: string; name: string; appearance?: ResumeAppearance; templateLanguage?: TemplateLanguage }
  ): ResumeData => ({
    id: base.id,
    name: base.name,
    appearance: base.appearance,
    templateLanguage: base.templateLanguage,
    personalDetails: {
      fullName: parsedData.personalDetails?.fullName || '',
      jobTitle: parsedData.personalDetails?.jobTitle || '',
      phone: parsedData.personalDetails?.phone || '',
      email: parsedData.personalDetails?.email || '',
      dateOfBirth: parsedData.personalDetails?.dateOfBirth || '',
      placeOfBirth: parsedData.personalDetails?.placeOfBirth || '',
      currentResidence: parsedData.personalDetails?.currentResidence || '',
      summary: parsedData.personalDetails?.summary || '',
      website: parsedData.personalDetails?.website || '',
      linkedin: parsedData.personalDetails?.linkedin || ''
    },
    experience: (parsedData.experience || []).map((exp: any, i: number) => ({
      id: `exp-parsed-${i}-${Date.now()}`,
      jobTitle: exp.jobTitle || '',
      company: exp.company || '',
      location: exp.location || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: exp.description || ''
    })),
    education: (parsedData.education || []).map((edu: any, i: number) => ({
      id: `edu-parsed-${i}-${Date.now()}`,
      degree: edu.degree || '',
      school: edu.school || '',
      location: edu.location || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || '',
      description: edu.description || ''
    })),
    skills: (parsedData.skills || []).map((s: any, i: number) => ({
      id: `skill-parsed-${i}-${Date.now()}`,
      name: s.name || '',
      level: s.level || 3
    })),
    languages: (parsedData.languages || []).map((l: any, i: number) => ({
      id: `lang-parsed-${i}-${Date.now()}`,
      name: l.name || '',
      level: l.level || 5
    })),
    updatedAt: new Date().toISOString()
  });

  // "Cargar CV" (dashboard): crea un CV NUEVO adaptando el archivo subido y abre el editor.
  const handleImportCvFile = async (file: File, language: TemplateLanguage = 'es') => {
    setIsParsing(true);
    setParsingError(null);
    try {
      const parsedData = await requestParse(file);
      const newId = `resume-import-${Date.now()}`;
      const importedName = parsedData?.personalDetails?.fullName
        ? `CV de ${parsedData.personalDetails.fullName}`
        : `CV importado (${resumes.length + 1})`;
      const newResume = hydrateResume(parsedData, {
        id: newId,
        name: importedName,
        templateLanguage: language,
      });

      persistResumes([...resumes, newResume]);
      setActiveResumeId(newId);
      setActiveResume(newResume);
      saveOne(newResume);
      persistActive(newId);
      setUploadOpen(false);
      setActiveSection('template');
      setView('editor');
      showToast('¡CV importado y adaptado con éxito! Revisa los campos.');
    } catch (err: any) {
      console.error('Error importing CV:', err);
      setParsingError(err.message || 'Hubo un error al leer el archivo. Inténtalo de nuevo.');
      showToast('Error al importar el archivo', 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // Traducir el CV activo a otro idioma → crea una COPIA (el original no cambia).
  // Superpone solo los textos traducidos sobre el original, preservando ids, niveles,
  // fechas, empresas, escuelas, contacto y apariencia.
  const handleTranslateCv = async (target: TemplateLanguage) => {
    setTranslating(true);
    setTranslateError(null);
    try {
      const t = await api.translateCv(activeResume, target);
      const base = activeResume;
      const newId = `resume-tr-${Date.now()}`;
      const copy: ResumeData = {
        ...base,
        id: newId,
        name: `${base.name} (${langShort(target)})`,
        templateLanguage: target,
        updatedAt: new Date().toISOString(),
        personalDetails: {
          ...base.personalDetails,
          jobTitle: t.personalDetails?.jobTitle ?? base.personalDetails.jobTitle,
          summary: t.personalDetails?.summary ?? base.personalDetails.summary,
        },
        experience: base.experience.map((e, i) => ({
          ...e,
          jobTitle: t.experience?.[i]?.jobTitle ?? e.jobTitle,
          location: t.experience?.[i]?.location ?? e.location,
          description: t.experience?.[i]?.description ?? e.description,
        })),
        education: base.education.map((e, i) => ({
          ...e,
          degree: t.education?.[i]?.degree ?? e.degree,
          location: t.education?.[i]?.location ?? e.location,
          description: t.education?.[i]?.description ?? e.description,
        })),
        skills: base.skills.map((s, i) => ({ ...s, name: t.skills?.[i]?.name ?? s.name })),
        languages: base.languages.map((l, i) => ({ ...l, name: t.languages?.[i]?.name ?? l.name })),
      };

      persistResumes([...resumes, copy]);
      setActiveResumeId(newId);
      setActiveResume(copy);
      saveOne(copy);
      persistActive(newId);
      setTranslateOpen(false);
      setActiveSection('template');
      showToast(`Copia traducida creada (${langLabel(target)})`);
    } catch (err: any) {
      console.error('Error translating CV:', err);
      setTranslateError(err.message || 'No se pudo traducir el CV. Inténtalo de nuevo.');
    } finally {
      setTranslating(false);
    }
  };

  // 4. Open browser's print dialog for high fidelity vector-based PDF or paper printing
  const handlePrint = () => {
    const element = resumePrintRef.current;
    if (!element) {
      showToast('Error: No se encontró el área de diseño del currículum.', 'error');
      return;
    }

    try {
      // 1. Try opening a new popup window to bypass iframe window.print() sandboxing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        // If popup is blocked, fall back to simple window.print()
        console.warn('Popup blocked, falling back to window.print()');
        window.print();
        return;
      }

      // 2. Clone stylesheets and styles from the current document
      let stylesHtml = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach((styleEl) => {
        stylesHtml += styleEl.outerHTML;
      });

      // 3. Document body with specific font and structure
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${activeResume.personalDetails.fullName || activeResume.name || 'Curriculum'}</title>
            ${stylesHtml}
            <style>
              /* Additional print overrides for the standalone window */
              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 210mm !important;
                min-height: 297mm !important;
              }
              #resume-print-area {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                width: 210mm !important;
                min-height: 297mm !important;
                position: relative !important;
                left: 0 !important;
                top: 0 !important;
                transform: none !important;
              }
              /* Hide any elements we don't want */
              .no-print {
                display: none !important;
              }
              /* Force exact printing of background colors */
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body class="bg-surface">
            <div id="resume-print-area">
              ${element.innerHTML}
            </div>
            <script>
              function triggerPrint() {
                setTimeout(() => {
                  window.focus();
                  window.print();
                }, 1000); // 1 second buffer to ensure styles, layout, and Google Fonts are fully loaded
              }
              if (document.readyState === 'complete') {
                triggerPrint();
              } else {
                window.onload = triggerPrint;
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      console.error('Error during printing:', err);
      // Fallback
      try {
        window.print();
      } catch (innerErr) {
        showToast('Error de impresión. Revisa que tu navegador permita ventanas emergentes e inténtalo de nuevo.', 'error');
      }
    }
  };


  // Panel de opciones según la sección activa del rail.
  const renderOptionsPanel = () => {
    if (activeSection === 'template') {
      return (
        <div className="bg-surface rounded-xl border border-line shadow-sm p-5 h-full overflow-y-auto text-left space-y-5">
          {/* Idioma del CV (fijo; se eligió al crear). Para otro idioma → Traducir (copia). */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-brand-500" />
              Idioma del CV
            </span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-surface-2">
              <span className="text-sm font-semibold text-ink">
                {langLabel(activeResume.templateLanguage)}
              </span>
            </div>
            <p className="text-[11px] text-ink-muted mt-1.5">
              Para tener el CV en otro idioma, usa <strong>Traducir</strong> (crea una copia).
            </p>
          </div>

          {/* Plantilla */}
          <div className="pt-4 border-t border-line">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Plantilla</h2>
            <ResumeTemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
          </div>
        </div>
      );
    }

    // Secciones del formulario (personal / experience / education / skills / languages)
    return (
      <ResumeFormEditor
        data={activeResume}
        onChange={handleResumeChange}
        activeTab={activeSection}
      />
    );
  };

  // Mientras comprobamos la sesión, evitar parpadeo.
  if (authLoading) {
    return (
      <div className="h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  // Sin sesión → pantalla de acceso.
  if (!currentUser) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="h-screen bg-canvas flex flex-col font-sans text-ink antialiased overflow-hidden">
      {/* Dynamic Toast Feedback Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-[var(--z-toast)] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border transition-all transform duration-300 translate-y-0 text-xs font-semibold ${
            toastMessage.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-100" />
          )}
          <span>{toastMessage.text}</span>
          {toastMessage.action && (
            <button
              onClick={() => {
                const act = toastMessage.action;
                if (toastTimer.current) clearTimeout(toastTimer.current);
                setToastMessage(null);
                act?.onClick();
              }}
              className="ml-1 pl-2.5 border-l border-white/20 text-amber-300 hover:text-amber-200 font-bold cursor-pointer"
            >
              {toastMessage.action.label}
            </button>
          )}
        </div>
      )}

      {/* Pantalla "Cargar CV" (subida con IA) */}
      {uploadOpen && (
        <UploadCvModal
          onClose={() => setUploadOpen(false)}
          onFile={handleImportCvFile}
          isParsing={isParsing}
          error={parsingError}
        />
      )}

      {/* Modal "Nuevo CV" (elegir idioma) */}
      {newCvOpen && (
        <NewCvModal onClose={() => setNewCvOpen(false)} onCreate={handleCreateBlankResume} />
      )}

      {/* Modal "Traducir" (crea una copia en otro idioma) */}
      {translateOpen && (
        <TranslateModal
          currentLanguage={activeResume.templateLanguage || 'es'}
          missing={missingForComplete(activeResume)}
          translating={translating}
          error={translateError}
          onClose={() => setTranslateOpen(false)}
          onTranslate={handleTranslateCv}
        />
      )}

      {/* Fila: rail lateral (solo fuera del editor) + columna principal */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Rail de navegación (Gemini): siempre visible salvo dentro del editor */}
        {view !== 'editor' && (
          <SideDrawer
            expanded={drawerExpanded}
            onToggle={() => setDrawerExpanded((o) => !o)}
            activeSection={view as DrawerSection}
            onNavigate={handleNavigate}
            userName={currentUser.name}
            userEmail={currentUser.email}
            userAvatar={currentUser.avatar}
            onLogout={handleLogout}
            theme={effTheme}
            onToggleTheme={toggleTheme}
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {view !== 'editor' ? (
            <>
          {/* Cabecera común (dashboard / comparar / perfil): menú + título + acciones */}
          <header className="bg-surface border-b border-line px-6 py-3 sm:py-0 sm:h-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <BrandMark className="w-9 h-9 flex-shrink-0" />
              <div>
                {/* Marca fija: icono + "CV Express" + subtítulo en todas las secciones. */}
                <h1 className="wordmark text-lg text-ink">CV Express</h1>
                <p className="text-xs text-ink-muted font-medium">Crea, edita y exporta tu CV profesional a PDF</p>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {view === 'dashboard' && (
              <Dashboard
                resumes={resumes}
                onOpen={openEditor}
                onDuplicate={handleDuplicateResume}
                onDelete={handleDeleteResume}
                onRename={handleRenameResume}
                onCreateBlank={() => setNewCvOpen(true)}
                onUpload={openUpload}
                onChangeAppearance={handleChangeAppearance}
              />
            )}
            {view === 'analyze' && <AnalyzeScreen resumes={resumes} showToast={showToast} />}
            {view === 'profile' && (
              <ProfileScreen user={currentUser} onUpdated={handleProfileUpdated} showToast={showToast} />
            )}
            {view === 'settings' && (
              <SettingsScreen themePref={themePref} onChangeThemePref={changeThemePref} />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Editor Header: menú + volver + nombre + imprimir/eliminar */}
          <header className="no-print bg-surface border-b border-line z-[var(--z-header)] px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setView('dashboard')}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-ink-muted hover:text-ink transition cursor-pointer flex-shrink-0"
                aria-label="Volver al inicio"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                {editingTitle ? (
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    autoFocus
                    onBlur={commitTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitTitle();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                    className="font-bold text-sm text-ink bg-surface border border-brand-300 rounded-lg px-2 py-0.5 focus:outline-none focus:border-brand-500 w-full max-w-xs"
                  />
                ) : (
                  <button
                    onClick={startEditTitle}
                    className="group flex items-center gap-1.5 min-w-0 cursor-pointer"
                    title="Editar nombre"
                  >
                    <span className="font-bold text-sm text-ink truncate hover:text-brand-600 dark:hover:text-brand-300 transition">{activeResume.name}</span>
                  </button>
                )}
                <p className="text-[11px] text-ink-muted truncate">
                  {activeResume.personalDetails.fullName || 'Editando currículum'}
                </p>
              </div>
              {isAutoSaving && (
                <span className="hidden sm:flex text-[11px] text-brand-600 dark:text-brand-300 font-bold items-center gap-1 animate-pulse flex-shrink-0">
                  <Save className="w-3 h-3" /> Auto-guardado
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setTranslateError(null);
                  setTranslateOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2.5 bg-surface border border-line hover:bg-surface-2 text-ink text-xs font-bold rounded-xl transition cursor-pointer shadow-sm"
                aria-label="Traducir el CV a otro idioma (crea una copia)"
              >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">Traducir</span>
              </button>
              <button
                onClick={handlePrint}
                className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition cursor-pointer shadow-md shadow-brand-100"
                aria-label="Imprimir o guardar como PDF vectorial"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteResume(activeResumeId)}
                className="p-2.5 bg-surface border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl transition cursor-pointer shadow-sm"
                aria-label="Eliminar este currículum"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Editor body: rail (fijo) | panel de opciones (arrastrable) | vista previa */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Rail de secciones (estilo Canva) */}
            <nav className="no-print w-20 flex-shrink-0 bg-surface border-r border-line flex flex-col items-center py-3 gap-1 overflow-y-auto">
              {SECTIONS.map((s) => {
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className={`w-16 flex flex-col items-center gap-1 py-2.5 rounded-xl transition cursor-pointer ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300'
                        : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                    title={s.label}
                  >
                    {s.icon}
                    <span className="text-[10px] font-bold uppercase tracking-wide leading-none text-center">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Área divisible: opciones | divisor | vista previa (se apila en móvil) */}
            <div ref={splitRef} className="editor-split flex-1 min-w-0 flex overflow-hidden">
              {/* Panel de opciones (ancho arrastrable en escritorio) */}
              <div
                className="editor-options no-print flex-shrink-0 h-full overflow-hidden p-4"
                style={{ width: optionsWidth }}
              >
                {renderOptionsPanel()}
              </div>

              {/* Divisor arrastrable (puntero: ratón + táctil) */}
              <div
                onPointerDown={startResize}
                role="separator"
                aria-orientation="vertical"
                aria-label="Ajustar el ancho de la vista previa"
                className="editor-divider no-print w-1.5 flex-shrink-0 cursor-col-resize bg-slate-200 dark:bg-slate-700 hover:bg-brand-400 active:bg-brand-500 transition-colors touch-none"
              />

              {/* Vista previa: escenario neutro que realza el CV (el héroe del producto). */}
              <div className="editor-preview flex-1 min-w-0 h-full overflow-y-auto p-6 sm:p-8 flex justify-center bg-gradient-to-b from-slate-200/70 via-slate-100 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950">
                <div
                  id="resume-print-area"
                  ref={resumePrintRef}
                  className="w-full max-w-[794px] origin-top bg-surface shadow-2xl ring-1 ring-slate-900/5 rounded-md overflow-hidden self-start"
                  style={{ minHeight: '1123px' }}
                >
                  <TemplatePreview data={activeResume} template={selectedTemplate} />
                </div>
              </div>
            </div>
          </div>
        </>
          )}
        </div>
      </div>
    </div>
  );
}
