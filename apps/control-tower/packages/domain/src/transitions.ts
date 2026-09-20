import { AppError } from '@ct/shared';
import type {
  CapabilityStatus,
  ServiceStatus,
  OpportunityStage,
  OpportunityStatus,
  ProjectStatus,
  TaskStatus,
  DeliverableStatus,
  KnowledgeItemStatus,
  DecisionStatus,
  AssetStatus,
  PortfolioItemStatus,
  ReviewItemStatus,
} from './enums';

/**
 * Máquinas de estado del dominio (doc 2 §7 / doc 5). Mapas `estado → estados permitidos`.
 * `assertTransition` lanza VALIDATION si la transición no está permitida. Quedarse en el mismo
 * estado (no-op) siempre se permite.
 */
export type TransitionMap<T extends string> = Record<T, readonly T[]>;

export function canTransition<T extends string>(
  map: TransitionMap<T>,
  from: T,
  to: T,
): boolean {
  if (from === to) return true;
  return (map[from] ?? []).includes(to);
}

export function assertTransition<T extends string>(
  entity: string,
  map: TransitionMap<T>,
  from: T,
  to: T,
): void {
  if (!canTransition(map, from, to)) {
    throw new AppError({
      code: 'INVALID_TRANSITION',
      kind: 'VALIDATION',
      message: `Transición de ${entity} no permitida: ${from} → ${to}`,
      details: { entity, from, to },
    });
  }
}

export const CAPABILITY_TRANSITIONS: TransitionMap<CapabilityStatus> = {
  PLANNED: ['DEVELOPING', 'RETIRED'],
  DEVELOPING: ['AVAILABLE', 'PLANNED', 'RETIRED'],
  AVAILABLE: ['DEVELOPING', 'RETIRED'],
  RETIRED: ['DEVELOPING'],
};

export const SERVICE_TRANSITIONS: TransitionMap<ServiceStatus> = {
  IDEA: ['DESIGNING', 'RETIRED'],
  DESIGNING: ['READY', 'IDEA', 'RETIRED'],
  READY: ['ACTIVE', 'DESIGNING', 'RETIRED'],
  ACTIVE: ['PAUSED', 'RETIRED'],
  PAUSED: ['ACTIVE', 'RETIRED'],
  RETIRED: ['IDEA'],
};

export function assertCapabilityTransition(from: CapabilityStatus, to: CapabilityStatus): void {
  assertTransition('capability', CAPABILITY_TRANSITIONS, from, to);
}

export function assertServiceTransition(from: ServiceStatus, to: ServiceStatus): void {
  assertTransition('service', SERVICE_TRANSITIONS, from, to);
}

/**
 * Opportunity (ADR-002): pipeline flexible tipo Kanban alineado 1:1 con Twenty (owner 2026-09-02). Entre estados
 * abiertos se puede mover libremente; desde cualquier estado abierto se puede cerrar a LOST/ONBOARDED. `status` es
 * derivado del `stage`.
 *
 * **WON ya NO es terminal** (owner 2026-09-02): vive en la columna «Negociación», junto a NEGOTIATION/CONTRACTING/
 * ON_HOLD, así que una ganada puede volver atrás (un trato que se cae después de darlo por hecho) o avanzar a
 * ONBOARDED. El cierre de verdad son los dos estados de la columna «Cerradas»: ONBOARDED (ganada + onboarding hecho)
 * y LOST (perdida).
 */
// Estados terminales (cierre): ONBOARDED (ganada cerrada) y LOST (perdida). Desde ellos no se reabre.
const OPPORTUNITY_TERMINAL_STAGES = new Set<OpportunityStage>(['LOST', 'ONBOARDED']);

export function isOpportunityStageTerminal(stage: OpportunityStage): boolean {
  return OPPORTUNITY_TERMINAL_STAGES.has(stage);
}

/**
 * Stages de la columna «Cerradas» del Kanban: el cierre GANADO (ONBOARDED, cliente ya incorporado) y el perdido
 * (LOST). Se usan para: auto-archivar a los 7 días y ocultar/congelar sus tareas de preventa. NO incluye WON (una
 * ganada activa se queda en su columna hasta que la incorporación termina y se mueve a ONBOARDED).
 */
export const CLOSED_OPPORTUNITY_STAGES: readonly OpportunityStage[] = ['LOST', 'ONBOARDED'];
export function isOpportunityStageClosed(stage: OpportunityStage): boolean {
  return CLOSED_OPPORTUNITY_STAGES.includes(stage);
}

export function deriveOpportunityStatus(stage: OpportunityStage): OpportunityStatus {
  // WON (ganada, proyecto en marcha) y ONBOARDED (ganada y cerrada) cuentan como GANADAS (status WON).
  if (stage === 'WON' || stage === 'ONBOARDED') return 'WON';
  if (stage === 'LOST') return 'LOST';
  // El resto —incluido ON_HOLD, que es una pausa, no un cierre— sigue abierto.
  return 'OPEN';
}

/**
 * ¿Es válido mover una oportunidad de `from` a `to`? Misma regla que `assertOpportunityStageTransition`, en
 * forma de predicado: lo usa el tablero Kanban (arrastrar y soltar) para elegir el stage destino de una
 * columna sin provocar un error del servidor.
 */
export function canChangeOpportunityStage(from: OpportunityStage, to: OpportunityStage): boolean {
  if (from === to) return true;
  return !isOpportunityStageTerminal(from);
}

export function assertOpportunityStageTransition(
  from: OpportunityStage,
  to: OpportunityStage,
): void {
  if (from === to) return;
  if (isOpportunityStageTerminal(from)) {
    throw new AppError({
      code: 'INVALID_TRANSITION',
      kind: 'VALIDATION',
      message: `La oportunidad ya está cerrada (${from}); no se puede mover a ${to}`,
      details: { entity: 'opportunity', from, to },
    });
  }
  // `from` es un estado abierto → cualquier destino (abierto o terminal) es válido.
}

// Project (Domain Model §5.15; BLOCKED/WAITING auxiliares)
export const PROJECT_TRANSITIONS: TransitionMap<ProjectStatus> = {
  PLANNED: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['BLOCKED', 'WAITING', 'REVIEW', 'CLOSED', 'ARCHIVED'],
  BLOCKED: ['ACTIVE', 'WAITING', 'CLOSED', 'ARCHIVED'],
  WAITING: ['ACTIVE', 'BLOCKED', 'CLOSED', 'ARCHIVED'],
  REVIEW: ['ACTIVE', 'DELIVERED', 'CLOSED', 'ARCHIVED'],
  DELIVERED: ['CLOSED', 'ARCHIVED'],
  // CLOSED es terminal: un proyecto cerrado NO cambia de estado (para modificar, se crea uno nuevo). Para ocultarlo
  // se archiva (soft-delete `archivedAt`), no por estado.
  CLOSED: [],
  ARCHIVED: [],
};

export const TASK_TRANSITIONS: TransitionMap<TaskStatus> = {
  // TODO→DONE permitido: marcar como hecha una tarea directamente (checkbox de la UI).
  TODO: ['IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['TODO', 'BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['TODO', 'IN_PROGRESS', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: ['TODO'],
};

export const DELIVERABLE_TRANSITIONS: TransitionMap<DeliverableStatus> = {
  PLANNED: ['IN_PROGRESS', 'ARCHIVED'],
  IN_PROGRESS: ['PLANNED', 'REVIEW', 'ARCHIVED'],
  REVIEW: ['IN_PROGRESS', 'APPROVED', 'ARCHIVED'],
  APPROVED: ['REVIEW', 'DELIVERED', 'ARCHIVED'],
  DELIVERED: ['ARCHIVED'],
  ARCHIVED: [],
};

export function assertProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  assertTransition('project', PROJECT_TRANSITIONS, from, to);
}
export function assertTaskTransition(from: TaskStatus, to: TaskStatus): void {
  assertTransition('task', TASK_TRANSITIONS, from, to);
}
export function assertDeliverableTransition(from: DeliverableStatus, to: DeliverableStatus): void {
  assertTransition('deliverable', DELIVERABLE_TRANSITIONS, from, to);
}

/** Estados de task que se consideran "activos" (bloquean el cierre de un proyecto). */
export const ACTIVE_TASK_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'BLOCKED'];
export function isTaskActive(status: TaskStatus): boolean {
  return ACTIVE_TASK_STATUSES.includes(status);
}

/**
 * Estados de proyecto "terminados/cerrados": sus tareas NO aparecen en las vistas de trabajo activo
 * (vista global /tasks ni Home). Decisión del owner (2026-08-29): CLOSED (cerrado) + ARCHIVED (archivado).
 */
export const CLOSED_PROJECT_STATUSES: readonly ProjectStatus[] = ['CLOSED', 'ARCHIVED'];

// Knowledge Item (doc 5 §21): INBOX → DRAFT → REVIEW → APPROVED → ARCHIVED
export const KNOWLEDGE_ITEM_TRANSITIONS: TransitionMap<KnowledgeItemStatus> = {
  INBOX: ['DRAFT', 'ARCHIVED'],
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['REVIEW', 'ARCHIVED'],
  ARCHIVED: [],
};

// Decision (ERRATA-002): editorial DRAFT→REVIEW→APPROVED, histórico APPROVED→SUPERSEDED→ARCHIVED
export const DECISION_TRANSITIONS: TransitionMap<DecisionStatus> = {
  DRAFT: ['REVIEW', 'ARCHIVED'],
  REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
  APPROVED: ['SUPERSEDED', 'ARCHIVED'],
  SUPERSEDED: ['ARCHIVED'],
  ARCHIVED: [],
};

// Asset (doc 5 §24)
export const ASSET_TRANSITIONS: TransitionMap<AssetStatus> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['DEPRECATED', 'ARCHIVED'],
  DEPRECATED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};

export function assertKnowledgeItemTransition(from: KnowledgeItemStatus, to: KnowledgeItemStatus): void {
  assertTransition('knowledge_item', KNOWLEDGE_ITEM_TRANSITIONS, from, to);
}
export function assertDecisionTransition(from: DecisionStatus, to: DecisionStatus): void {
  assertTransition('decision', DECISION_TRANSITIONS, from, to);
}
export function assertAssetTransition(from: AssetStatus, to: AssetStatus): void {
  assertTransition('asset', ASSET_TRANSITIONS, from, to);
}

// Portfolio Item (ADR-001): NOT_ELIGIBLE → CANDIDATE → IN_PREPARATION → PUBLISHED → ARCHIVED
export const PORTFOLIO_ITEM_TRANSITIONS: TransitionMap<PortfolioItemStatus> = {
  NOT_ELIGIBLE: ['CANDIDATE', 'ARCHIVED'],
  CANDIDATE: ['IN_PREPARATION', 'NOT_ELIGIBLE', 'ARCHIVED'],
  IN_PREPARATION: ['PUBLISHED', 'CANDIDATE', 'ARCHIVED'],
  PUBLISHED: ['ARCHIVED', 'IN_PREPARATION'],
  ARCHIVED: [],
};

export function assertPortfolioItemTransition(from: PortfolioItemStatus, to: PortfolioItemStatus): void {
  assertTransition('portfolio_item', PORTFOLIO_ITEM_TRANSITIONS, from, to);
}

/**
 * Review Item («Por revisar»): **REVISADO es terminal**. Marcar algo como revisado es una afirmación sobre
 * lo que ya hiciste —lo leíste y decidiste—, así que deshacerlo reescribiría el pasado: se perdería el
 * `reviewed_at`, el historial diría una cosa y la cola otra, y un recurso ya procesado a la biblioteca
 * volvería a la cola como si nunca se hubiera mirado.
 *
 * El resto de estados sigue siendo libre a propósito (la cola es una bandeja de trabajo, no un flujo
 * rígido): sólo se cierra la puerta de salida de REVIEWED. DISCARDED sí se puede recuperar — descartar es
 * «esto no me interesa», no una afirmación sobre trabajo hecho.
 *
 * Cerrar también REVIEWED → DISCARDED no es celo de más: sin eso, la regla de la purga (un revisado sólo se
 * borra si ya está en la biblioteca, ver `purgeReviewedItems`) tendría una puerta trasera — bastaría
 * descartar un revisado sin procesar para que el barrido se lo llevara. Las dos reglas se sostienen juntas.
 */
export function isReviewItemFrozen(status: ReviewItemStatus): boolean {
  return status === 'REVIEWED';
}
