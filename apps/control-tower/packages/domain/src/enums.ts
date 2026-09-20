/**
 * Valores canónicos de los enums del dominio (doc 5 §36: "Los valores canónicos serán definidos
 * en el Domain/Application layer"). Fuente única: la usa `@ct/db` para los CHECK constraints y la
 * capa de aplicación para validación Zod. El dominio NO importa framework/ORM.
 */

// Governance / membership
export const MEMBER_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const; // doc 5 §7

export const CAPABILITY_STATUS = ['PLANNED', 'DEVELOPING', 'AVAILABLE', 'RETIRED'] as const; // §10
export const CAPABILITY_MATURITY = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const; // §10
export const SERVICE_STATUS = ['IDEA', 'DESIGNING', 'READY', 'ACTIVE', 'PAUSED', 'RETIRED'] as const; // §11

// CRM (ADR-002): pipeline de dominio; `status` derivado OPEN/WON/LOST. 13 estados alineados **1:1 con Twenty**
// (owner 2026-09-02): el pull/push traduce por identidad, así que el enum de CT es el de Twenty en su mismo orden.
// El Kanban los agrupa en 4 columnas (Calificación de leads · Propuesta · Negociación · Cerradas) — ver
// `apps/web/app/(app)/crm/opportunities/page.tsx`. Terminales: LOST y ONBOARDED (WON sigue siendo movible).
export const OPPORTUNITY_STAGE = [
  'LEAD',
  'QUALIFIED',
  'RESEARCHING',
  'MEETING',
  'EVALUATING',
  'PREPARING_PROP',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'CONTRACTING',
  'WON',
  'LOST',
  'ON_HOLD',
  'ONBOARDED',
] as const;
export const OPPORTUNITY_STATUS = ['OPEN', 'WON', 'LOST'] as const;

// Operations
export const PROJECT_STATUS = [
  'PLANNED',
  'ACTIVE',
  'BLOCKED',
  'WAITING',
  'REVIEW',
  'DELIVERED',
  'CLOSED',
  'ARCHIVED',
] as const; // Domain Model §5.15
/** Tipo de proyecto (ADR-005). INTERNAL = propio · CLIENT = de un cliente (exige client) · LAB = experimento. */
export const PROJECT_TYPE = ['INTERNAL', 'CLIENT', 'LAB'] as const; // Domain Model §5.15 (A-1)
export const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'] as const; // §18
export const DELIVERABLE_STATUS = [
  'PLANNED',
  'IN_PROGRESS',
  'REVIEW',
  'APPROVED',
  'DELIVERED',
  'ARCHIVED',
] as const; // §19

// Knowledge
export const DECISION_STATUS = ['DRAFT', 'REVIEW', 'APPROVED', 'SUPERSEDED', 'ARCHIVED'] as const; // §20 / ERRATA-002
export const KNOWLEDGE_TYPE = [
  'NOTE',
  'LESSON',
  'INSIGHT',
  'PROCESS',
  'PATTERN',
  'RESEARCH',
  'REFERENCE',
] as const; // §21
export const KNOWLEDGE_ITEM_STATUS = ['INBOX', 'DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED'] as const; // §21
export const KNOWLEDGE_INBOX_STATUS = ['NEW', 'PROCESSING', 'PROCESSED', 'DISCARDED'] as const; // §22
export const ASSET_STATUS = ['DRAFT', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'] as const; // §24

// Portfolio (ADR-001)
export const PORTFOLIO_ITEM_STATUS = [
  'NOT_ELIGIBLE',
  'CANDIDATE',
  'IN_PREPARATION',
  'PUBLISHED',
  'ARCHIVED',
] as const;
export const PORTFOLIO_ITEM_VISIBILITY = ['INTERNAL', 'PRIVATE', 'PUBLISHABLE'] as const;

// Infrastructure
export const INTEGRATION_STATUS = ['CONFIGURED', 'ACTIVE', 'ERROR', 'DISABLED'] as const; // §26
/** F-16 — resultado de una ejecución de sync. WARNINGS = terminó, pero saltó registros (resiliencia F-13). */
export const SYNC_RUN_STATUS = ['COMPLETED', 'COMPLETED_WITH_WARNINGS', 'FAILED'] as const;
// Pagos (sección Pagos). Dirección del dinero y estado de cobro/pago.
/** IN = me lo deben a mí (cobro) · OUT = lo debo yo (pago). */
export const PAYMENT_DIRECTION = ['IN', 'OUT'] as const;
export const PAYMENT_STATUS = ['PENDING', 'PAID'] as const;

/** F-24 — qué log rotado contiene un lote archivado: procesos (`jobs`) o bandeja de salida (`outbox_events`). */
export const LOG_ARCHIVE_KIND = ['JOBS', 'OUTBOX'] as const;
export const AUTOMATION_STATUS = ['DRAFT', 'ACTIVE', 'PAUSED', 'ERROR', 'ARCHIVED'] as const; // §27
export const JOB_STATUS = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const; // §29
/**
 * §28 + `DISCARDED` (2026-09-01): un envío que falló y el owner marca como **ya no necesario** (p. ej. el dato se
 * corrigió a mano en el sistema externo). Se distingue de FAILED —que es "pendiente de resolver"— para que deje de
 * salir en los avisos y de bloquear el pull de esa entidad, sin borrar el registro de que ocurrió.
 */
export const OUTBOX_STATUS = ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DISCARDED'] as const;

// Priority — conjunto convencional (no enumerado en doc 5; se valida en la app)
export const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

// Lifecycle genérico (doc 5 §1.4) para status no enumerados
export const LIFECYCLE_STATUS = ['ACTIVE', 'ARCHIVED'] as const;
/** Estado del cliente, SÓLO visible en CT (no se sincroniza a Twenty): activo / inactivo. */
export const CLIENT_STATUS = ['ACTIVE', 'INACTIVE'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];
export type CapabilityStatus = (typeof CAPABILITY_STATUS)[number];
export type CapabilityMaturity = (typeof CAPABILITY_MATURITY)[number];
export type ServiceStatus = (typeof SERVICE_STATUS)[number];
export type OpportunityStage = (typeof OPPORTUNITY_STAGE)[number];
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];
export type ProjectStatus = (typeof PROJECT_STATUS)[number];
export type ProjectType = (typeof PROJECT_TYPE)[number];
export type TaskStatus = (typeof TASK_STATUS)[number];
export type DeliverableStatus = (typeof DELIVERABLE_STATUS)[number];
export type DecisionStatus = (typeof DECISION_STATUS)[number];
export type KnowledgeType = (typeof KNOWLEDGE_TYPE)[number];
export type KnowledgeItemStatus = (typeof KNOWLEDGE_ITEM_STATUS)[number];
export type KnowledgeInboxStatus = (typeof KNOWLEDGE_INBOX_STATUS)[number];
export type AssetStatus = (typeof ASSET_STATUS)[number];
export type PortfolioItemStatus = (typeof PORTFOLIO_ITEM_STATUS)[number];
export type Priority = (typeof PRIORITY)[number];

// Fase 8 (E-5) — activos por cliente/proyecto. STATUS y HOSTING cerrados; el TIPO es extensible (etiqueta libre).
export const RESOURCE_STATUS = ['ACTIVE', 'IN_PROGRESS', 'PAUSED', 'RETIRED'] as const;
export const RESOURCE_HOSTING = ['OWN', 'CLIENT', 'THIRD_PARTY'] as const;
/** Tipos SUGERIDOS (no enforced): el usuario puede escribir una etiqueta nueva. */
export const RESOURCE_TYPE_SUGGESTIONS = ['ACCESS', 'ACCOUNT', 'HOSTED_APP', 'INFRASTRUCTURE', 'DOMAIN', 'OTHER'] as const;
export type SyncRunStatus = (typeof SYNC_RUN_STATUS)[number];
export type LogArchiveKind = (typeof LOG_ARCHIVE_KIND)[number];
export type PaymentDirection = (typeof PAYMENT_DIRECTION)[number];
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];
export type ResourceStatus = (typeof RESOURCE_STATUS)[number];
export type ResourceHosting = (typeof RESOURCE_HOSTING)[number];

// Learning Path + sector de conocimiento. STATUS cerrado; SECTOR y KIND son etiquetas libres (extensibles).
export const LEARNING_STATUS = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'] as const;

// Cola de revisión ("Por revisar"): artículos, vídeos, libros… que quieres leer/ver más adelante.
export const REVIEW_ITEM_STATUS = ['TO_REVIEW', 'REVIEWING', 'REVIEWED', 'DISCARDED'] as const;
/** Formato del recurso. Lista curada y ampliable (columna varchar sin CHECK, como los tipos sugeridos). */
export const REVIEW_ITEM_KIND_SUGGESTIONS = ['ARTICLE', 'VIDEO', 'BOOK', 'PODCAST', 'COURSE', 'THREAD', 'OTHER'] as const;
export type LearningStatus = (typeof LEARNING_STATUS)[number];
export type ReviewItemStatus = (typeof REVIEW_ITEM_STATUS)[number];
/** Sugerencias de "tipo" de item de learning (no enforced): el usuario puede escribir una etiqueta nueva. */
export const LEARNING_KIND_SUGGESTIONS = ['COURSE', 'SKILL', 'TOPIC', 'ROADMAP', 'SINGLE RESOURCE'] as const;
/** Sectores SUGERIDOS, compartidos por la Library (knowledge_items.sector) y el Learning Path. Etiqueta libre. */
export const SECTOR_SUGGESTIONS = [
  'Programación',
  'IA',
  'Agentes autónomos',
  'Marketing',
  'Social Media',
  'Ventas',
  'Producto',
  'Diseño',
  'Finanzas',
  'Otro',
] as const;
