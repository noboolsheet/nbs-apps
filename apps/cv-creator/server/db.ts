import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

// Capa de datos (repository). TODA la SQL vive aquí; el resto del server no conoce
// SQLite, así que migrar a Postgres el día que crezca sería reescribir solo este módulo.

// Forma mínima que necesita el almacén: un CV tiene id y se guarda entero como JSON.
export interface StoredResume {
  id: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  active_resume_id: string | null;
  name: string | null;
  avatar: string | null; // data URL (imagen pequeña)
  created_at: string;
}

export interface AnalysisRow {
  id: string;
  user_id: string;
  cv_label: string;
  job_title: string;
  report: string; // JSON del informe
  created_at: number; // epoch ms (para purgar >24h)
}

const DATA_DIR = process.env.DATA_DIR || "./data";
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "cv-creator.db"));
db.pragma("journal_mode = WAL"); // mejor concurrencia lecturas/escrituras
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    active_resume_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cv_label TEXT NOT NULL,
    job_title TEXT NOT NULL,
    report TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_id);
`);

// Migración idempotente: añadir columnas de perfil a `users` si la BD es previa.
const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[]).map(
  (c) => c.name
);
if (!userCols.includes("name")) db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
if (!userCols.includes("avatar")) db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);

// ---- Usuarios ----
const stmtInsertUser = db.prepare(
  `INSERT INTO users (id, email, password_hash, password_salt, active_resume_id, created_at)
   VALUES (@id, @email, @password_hash, @password_salt, NULL, @created_at)`
);
const stmtUserByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const stmtUserById = db.prepare(`SELECT * FROM users WHERE id = ?`);
const stmtSetActive = db.prepare(`UPDATE users SET active_resume_id = ? WHERE id = ?`);

export function createUser(email: string, passwordHash: string, passwordSalt: string): UserRow {
  const id = randomUUID();
  stmtInsertUser.run({
    id,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    password_salt: passwordSalt,
    created_at: new Date().toISOString(),
  });
  return stmtUserById.get(id) as UserRow;
}

export function getUserByEmail(email: string): UserRow | undefined {
  return stmtUserByEmail.get(email.toLowerCase()) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return stmtUserById.get(id) as UserRow | undefined;
}

export function setActiveResume(userId: string, resumeId: string | null): void {
  stmtSetActive.run(resumeId, userId);
}

// ---- Sesiones ----
const stmtInsertSession = db.prepare(
  `INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`
);
const stmtSessionByToken = db.prepare(
  `SELECT * FROM sessions WHERE token = ? AND expires_at > ?`
);
const stmtDeleteSession = db.prepare(`DELETE FROM sessions WHERE token = ?`);
const stmtDeleteExpired = db.prepare(`DELETE FROM sessions WHERE expires_at <= ?`);

export function createSession(userId: string, token: string, expiresAt: number): void {
  stmtInsertSession.run(token, userId, expiresAt);
}

export function getSession(token: string): { token: string; user_id: string; expires_at: number } | undefined {
  return stmtSessionByToken.get(token, Date.now()) as
    | { token: string; user_id: string; expires_at: number }
    | undefined;
}

export function deleteSession(token: string): void {
  stmtDeleteSession.run(token);
}

export function purgeExpiredSessions(): void {
  stmtDeleteExpired.run(Date.now());
}

// ---- CVs ----
const stmtListResumes = db.prepare(
  `SELECT data FROM resumes WHERE user_id = ? ORDER BY updated_at DESC`
);
const stmtUpsertResume = db.prepare(
  `INSERT INTO resumes (id, user_id, data, updated_at)
   VALUES (@id, @user_id, @data, @updated_at)
   ON CONFLICT(id) DO UPDATE SET data = @data, updated_at = @updated_at
   WHERE resumes.user_id = @user_id`
);
const stmtDeleteResume = db.prepare(`DELETE FROM resumes WHERE id = ? AND user_id = ?`);

export function listResumes(userId: string): StoredResume[] {
  const rows = stmtListResumes.all(userId) as { data: string }[];
  return rows.map((r) => JSON.parse(r.data) as StoredResume);
}

// Inserta o actualiza un CV del usuario. El WHERE user_id en el UPDATE impide
// sobrescribir un CV ajeno aunque se pase su id.
export function upsertResume(userId: string, resume: StoredResume): void {
  stmtUpsertResume.run({
    id: resume.id,
    user_id: userId,
    data: JSON.stringify(resume),
    updated_at: resume.updatedAt || new Date().toISOString(),
  });
}

export function deleteResume(userId: string, id: string): void {
  stmtDeleteResume.run(id, userId);
}

// ---- Perfil ----
const stmtUpdateProfile = db.prepare(`UPDATE users SET name = ?, avatar = ? WHERE id = ?`);
const stmtUpdatePassword = db.prepare(
  `UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?`
);

export function updateProfile(userId: string, name: string | null, avatar: string | null): void {
  stmtUpdateProfile.run(name, avatar, userId);
}

export function updatePassword(userId: string, hash: string, salt: string): void {
  stmtUpdatePassword.run(hash, salt, userId);
}

// ---- Análisis CV vs oferta (historial efímero, se purga a las 24h) ----
const ANALYSIS_TTL_MS = 24 * 60 * 60 * 1000;
const stmtInsertAnalysis = db.prepare(
  `INSERT INTO analyses (id, user_id, cv_label, job_title, report, created_at)
   VALUES (@id, @user_id, @cv_label, @job_title, @report, @created_at)`
);
const stmtListAnalyses = db.prepare(
  `SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC`
);
const stmtDeleteAnalysis = db.prepare(`DELETE FROM analyses WHERE id = ? AND user_id = ?`);
const stmtPurgeAnalyses = db.prepare(`DELETE FROM analyses WHERE created_at <= ?`);

export interface StoredAnalysis {
  id: string;
  cvLabel: string;
  jobTitle: string;
  report: unknown;
  createdAt: number;
}

export function createAnalysis(
  userId: string,
  data: { id: string; cvLabel: string; jobTitle: string; report: unknown; createdAt: number }
): void {
  stmtInsertAnalysis.run({
    id: data.id,
    user_id: userId,
    cv_label: data.cvLabel,
    job_title: data.jobTitle,
    report: JSON.stringify(data.report),
    created_at: data.createdAt,
  });
}

export function listAnalyses(userId: string): StoredAnalysis[] {
  const rows = stmtListAnalyses.all(userId) as AnalysisRow[];
  return rows.map((r) => ({
    id: r.id,
    cvLabel: r.cv_label,
    jobTitle: r.job_title,
    report: JSON.parse(r.report),
    createdAt: r.created_at,
  }));
}

export function deleteAnalysis(userId: string, id: string): void {
  stmtDeleteAnalysis.run(id, userId);
}

// Borra los análisis con más de 24h. Se llama al arrancar y en cada nuevo análisis.
export function purgeExpiredAnalyses(): void {
  stmtPurgeAnalyses.run(Date.now() - ANALYSIS_TTL_MS);
}
