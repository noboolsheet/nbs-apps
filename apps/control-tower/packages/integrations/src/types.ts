/**
 * Framework de integraciones (doc old_9 §19). Un adapter traduce el sistema externo a DTOs
 * NORMALIZADOS (no expone el esquema del proveedor — ERRATA-010). La resolución de identidad
 * y el upsert al dominio los hace la capa de aplicación, no el adapter.
 */

export type HealthStatus = 'HEALTHY' | 'ERROR' | 'DISCONNECTED';

export interface HealthResult {
  status: HealthStatus;
  message?: string;
}

/** DTOs normalizados que produce el pull de un CRM. `externalId` es la clave de idempotencia. */
export interface NormalizedCompany {
  externalId: string;
  name: string;
  industry?: string;
  websiteUrl?: string;
}
export interface NormalizedPerson {
  externalId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  companyExternalId?: string;
}
export interface NormalizedOpportunity {
  externalId: string;
  name: string;
  stage: string; // ya mapeado al enum de dominio (OPPORTUNITY_STAGE)
  estimatedValue?: number;
  currencyCode?: string;
  expectedCloseDate?: string; // YYYY-MM-DD
  companyExternalId?: string;
}

export interface NormalizedTask {
  externalId: string;
  title: string;
  status: string; // ya mapeado al enum de dominio (TASK_STATUS)
  dueDate?: string; // YYYY-MM-DD
}

export interface CrmPullResult {
  companies: NormalizedCompany[];
  people: NormalizedPerson[];
  opportunities: NormalizedOpportunity[];
  tasks: NormalizedTask[];
}

/** Interfaz común de adapter CRM (doc old_9 §19). */
export interface IntegrationAdapter {
  readonly provider: string;
  healthCheck(): Promise<HealthResult>;
  pull(): Promise<CrmPullResult>;
}

/** Repositorio normalizado (Git/GitHub) → se refleja como Asset (metadata + URLs). */
export interface NormalizedRepo {
  externalId: string;
  name: string;
  description?: string;
  url?: string;
  repositoryUrl?: string;
}
export interface CodePullResult {
  repos: NormalizedRepo[];
}
export interface CodeSourceAdapter {
  readonly provider: string;
  healthCheck(): Promise<HealthResult>;
  pull(): Promise<CodePullResult>;
}

/** Archivo/carpeta normalizado (Google Drive) → se refleja como Document (referencia, no file store). */
export interface NormalizedDriveFile {
  externalId: string;
  name: string;
  mimeType?: string;
  url?: string;
}
export interface DrivePullResult {
  files: NormalizedDriveFile[];
}
export interface DocumentSourceAdapter {
  readonly provider: string;
  healthCheck(): Promise<HealthResult>;
  pull(): Promise<DrivePullResult>;
}

/**
 * Evento de calendario normalizado (Google Calendar) → se cachea como calendar_events (referencia read-only).
 * Con hora: `startAt`/`endAt` (ISO). Día completo: `isAllDay=true` + `startDate` (YYYY-MM-DD, sin hora).
 */
export interface NormalizedCalendarEvent {
  externalId: string;
  calendarId?: string; // calendario de origen (para agregar varios sin colisión de IDs)
  title: string;
  location?: string;
  htmlLink?: string;
  startAt?: string; // ISO 8601 (eventos con hora)
  endAt?: string; // ISO 8601
  isAllDay: boolean;
  startDate?: string; // YYYY-MM-DD (eventos de día completo)
  status?: string; // confirmed | tentative | cancelled
}
export interface CalendarPullResult {
  events: NormalizedCalendarEvent[];
}
export interface CalendarSourceAdapter {
  readonly provider: string;
  healthCheck(): Promise<HealthResult>;
  pull(): Promise<CalendarPullResult>;
}
