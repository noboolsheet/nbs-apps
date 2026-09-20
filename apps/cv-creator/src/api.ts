import { ResumeData, TemplateLanguage } from './types';

// Cliente de la API del servidor. Las cookies de sesión viajan solas al ser
// mismo origen (SPA + API en el mismo host); `credentials: 'same-origin'` lo
// hace explícito. Las respuestas no-OK lanzan con el mensaje del servidor.

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

// Informe devuelto por /api/analyze.
export interface AnalysisReport {
  jobTitle?: string;
  compatibility: number;
  verdict: string;
  summaryAdvice: string;
  textAdvice?: string[];
  missingSkills: string[];
  strengths?: string[];
}

export interface Analysis {
  id: string;
  cvLabel: string;
  jobTitle: string;
  report: AnalysisReport;
  createdAt: number;
}

// Fichero para enviar a /api/analyze o /api/parse-cv.
export interface FilePayload {
  fileBase64?: string;
  mimeType?: string;
  fileName?: string;
  textContent?: string;
}

const jsonHeaders = { 'Content-Type': 'application/json' };

async function parseOrThrow(res: Response): Promise<any> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Se produjo un error. Inténtalo de nuevo.');
  return data;
}

// Devuelve el usuario con sesión activa, o null si no hay sesión.
export async function me(): Promise<AuthUser | null> {
  const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (res.status === 401) return null;
  const data = await parseOrThrow(res);
  return data.user;
}

export async function register(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  return (await parseOrThrow(res)).user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  return (await parseOrThrow(res)).user;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
}

export async function listResumes(): Promise<{ resumes: ResumeData[]; activeId: string | null }> {
  const res = await fetch('/api/resumes', { credentials: 'same-origin' });
  return parseOrThrow(res);
}

export async function saveResume(resume: ResumeData): Promise<void> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(resume.id)}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify(resume),
  });
  await parseOrThrow(res);
}

export async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  await parseOrThrow(res);
}

export async function setActive(activeId: string | null): Promise<void> {
  const res = await fetch('/api/state/active', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ activeId }),
  });
  await parseOrThrow(res);
}

// ---- Perfil ----
export async function updateProfile(name: string, avatar: string | null): Promise<AuthUser> {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ name, avatar }),
  });
  return (await parseOrThrow(res)).user;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await fetch('/api/profile/password', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  await parseOrThrow(res);
}

// ---- Análisis CV vs oferta ----
export async function analyze(body: {
  cvResumeId?: string;
  cvFile?: FilePayload;
  jobFile?: FilePayload;
  jobText?: string;
  cvLabel?: string;
}): Promise<Analysis> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  return parseOrThrow(res);
}

export async function listAnalyses(): Promise<Analysis[]> {
  const res = await fetch('/api/analyses', { credentials: 'same-origin' });
  return (await parseOrThrow(res)).analyses;
}

export async function deleteAnalysis(id: string): Promise<void> {
  const res = await fetch(`/api/analyses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  await parseOrThrow(res);
}

// Subconjunto de campos de texto que devuelve /api/translate-cv (traducidos).
export interface TranslatedFields {
  personalDetails?: { jobTitle?: string; summary?: string };
  experience?: { jobTitle?: string; location?: string; description?: string }[];
  education?: { degree?: string; location?: string; description?: string }[];
  skills?: { name?: string }[];
  languages?: { name?: string }[];
}

// Traduce el CONTENIDO del CV a otro idioma. Devuelve solo los textos traducidos;
// el cliente los superpone sobre el CV original para crear la copia.
export async function translateCv(
  resume: ResumeData,
  targetLanguage: TemplateLanguage
): Promise<TranslatedFields> {
  const res = await fetch('/api/translate-cv', {
    method: 'POST',
    credentials: 'same-origin',
    headers: jsonHeaders,
    body: JSON.stringify({ resume, targetLanguage }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) {
    throw new Error(result.error || 'No se pudo traducir el CV.');
  }
  return result.data;
}
