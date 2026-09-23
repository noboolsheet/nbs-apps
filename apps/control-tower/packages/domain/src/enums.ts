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

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de datos del CRM de Twenty (handoff 2026-09-22, §3.1 · §4.1 · §5.1).
//
// Twenty es el DUEÑO de estos valores: CT los proyecta en solo lectura y los valida contra estas
// listas blancas antes de guardarlos. Un valor que no esté aquí NO se sustituye por `OTHER` ni por
// ningún default — se registra como incidencia de reconciliación (el handoff lo prohíbe
// explícitamente, y es la lección del fallback a LEAD del addendum de ADR-002).
// ─────────────────────────────────────────────────────────────────────────────

/** Clasificación de la organización (Company). `Annual Revenue` está DESACTIVADO en Twenty: no se lee. */
export const ORGANIZATION_TYPE = [
  'BUSINESS',
  'SCHOOL_EDUCATION',
  'PUBLIC_BODY',
  'NONPROFIT_ASSOCIATION',
  'FREELANCER_PROFESSIONAL',
  'OTHER',
] as const;

/**
 * Roles de relación. Son MULTI-select: se preservan todos, nunca se reducen a uno (handoff §10).
 * Company y Person tienen listas DISTINTAS a propósito: una persona puede ser `INDIVIDUAL_CLIENT`
 * (y eso es lo que clasifica una oportunidad como individual), una empresa es `COMMERCIAL_ACCOUNT`.
 */
export const COMPANY_RELATIONSHIP_ROLE = [
  'COMMERCIAL_ACCOUNT',
  'PARTNER',
  'SUPPLIER',
  'COLLABORATOR',
  'REFERRAL_SOURCE',
  'OTHER',
] as const;
export const PERSON_RELATIONSHIP_ROLE = [
  'INDIVIDUAL_CLIENT',
  'PARTNER',
  'SUPPLIER',
  'COLLABORATOR',
  'REFERRAL_SOURCE',
  'OTHER',
] as const;

/** Idioma preferido de comunicación. Alimenta la generación de mensajes sin cambiar el valor guardado. */
export const PREFERRED_LANGUAGE = ['IT', 'ES', 'EN', 'OTHER'] as const;

/** Canal preferido. Sólo guía la elección cuando `doNotContact` es falso (handoff §10). */
export const PREFERRED_CONTACT_CHANNEL = ['EMAIL', 'PHONE', 'WHATSAPP', 'LINKEDIN', 'OTHER'] as const;

/** Categoría de servicio esperada. La posee Twenty: la evaluación de CT NO la sobrescribe (§11.4). */
export const OPPORTUNITY_SERVICE_TYPE = ['TRAINING', 'CONSULTING', 'CUSTOM_PRODUCT', 'HYBRID', 'TBD'] as const;

/** Cómo se originó la oportunidad. Campo nuevo: NO se reutiliza `opportunities.source` (texto libre sin CHECK). */
export const OPPORTUNITY_LEAD_SOURCE = [
  'REFERRAL',
  'INBOUND_WEB',
  'SOCIAL_MEDIA',
  'LINKEDIN',
  'EVENT',
  'OUTBOUND',
  'PARTNER',
  'REPEAT_CLIENT',
  'PLATFORM',
  'OTHER',
] as const;

/**
 * Motivo de pérdida. **Solo lectura en CT**: lo rellena el usuario en Twenty y CT lo observa. Es
 * requisito para pasar a LOST y CT nunca lo escribe ni lo infiere (handoff §6.3 y §11.1).
 */
export const OPPORTUNITY_LOST_REASON = [
  'NOT_A_FIT',
  'NO_ACTUAL_NEED',
  'OUTSIDE_CAPABILITIES',
  'NO_BUDGET',
  'PRICE',
  'TIMING',
  'NO_INTEREST',
  'NO_RESPONSE',
  'COMPETITOR',
  'DUPLICATE',
  'INVALID',
  'OTHER',
] as const;

/**
 * A quién se factura una oportunidad (handoff §2.2 y §7.1). Se DERIVA, nunca se almacena: sus dos
 * insumos (la Company de la oportunidad y los roles del Point of Contact) los posee Twenty, y
 * persistir la conclusión crearía un tercer valor sin dueño que CT no podría corregir.
 * `UNDETERMINED` es lo que sustituye a inventar una Company de relleno, que el handoff prohíbe.
 */
export const BILLING_SUBJECT = ['ORGANIZATION', 'INDIVIDUAL', 'UNDETERMINED'] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPE)[number];
export type CompanyRelationshipRole = (typeof COMPANY_RELATIONSHIP_ROLE)[number];
export type PersonRelationshipRole = (typeof PERSON_RELATIONSHIP_ROLE)[number];
export type PreferredLanguage = (typeof PREFERRED_LANGUAGE)[number];
export type PreferredContactChannel = (typeof PREFERRED_CONTACT_CHANNEL)[number];
export type OpportunityServiceType = (typeof OPPORTUNITY_SERVICE_TYPE)[number];
export type OpportunityLeadSource = (typeof OPPORTUNITY_LEAD_SOURCE)[number];
export type OpportunityLostReason = (typeof OPPORTUNITY_LOST_REASON)[number];
export type BillingSubject = (typeof BILLING_SUBJECT)[number];
