import { AppError } from '@ct/shared';
import type { OpportunityStage } from '../enums';
import { GATE_KEYS, type ArtifactKind, type GateKey } from './gates';

/**
 * Catálogo de criterios de salida del SOP (handoff §11.1 y §11.4).
 *
 * **Los criterios son datos, no código.** El comando de transición nunca sabe *qué* pide la Gate 5;
 * sólo sabe «todos los criterios obligatorios de esta puerta están satisfechos». Así, cuando el SOP
 * cambia, se toca el catálogo y no la máquina.
 *
 * Vive en código (no en tablas) porque es el patrón que ya usa el repo para catálogos
 * (`automations/catalog.ts`, `notion-specs.ts`), porque el documento real del SOP vive en Notion, y
 * porque una tabla exigiría CRUD, seeds y scoping para algo que se desincronizaría del documento.
 *
 * El versionado protege la historia por dos vías: cada evaluación graba su `version`, y cada fila de
 * criterio guarda un snapshot de su etiqueta y obligatoriedad. Reescribir un criterio mañana no
 * reescribe lo que se evaluó hace tres meses.
 */

/**
 * Cómo se aporta la evidencia de un criterio. La mayoría de los «datos operativos» del §11.4
 * (tipo de investigación, resumen, agenda, riesgos, estrategia de precio…) son exactamente esto:
 * evidencia que pide una puerta. Modelarlos como criterios tipados evita una migración por cada
 * documento del SOP que llegue.
 */
export type CriterionInput =
  | 'BOOLEAN'
  | 'TEXT'
  | 'URL'
  | 'DATE'
  | 'DATETIME'
  | 'NUMBER'
  | 'ENUM'
  | 'LIST'
  /** Exige una URL de artefacto registrada del tipo indicado en `artifactKind`. */
  | 'ARTIFACT'
  /** Exige un instante real (§11.3, Gate 6: «PASS más un evento real de envío»), no una casilla. */
  | 'EVENT';

export interface CriterionSpec {
  /** Clave estable, p. ej. `g5.dp001_publicado`. No cambia aunque cambie el texto. */
  key: string;
  /** Cambia SÓLO si cambia el significado del criterio. */
  version: string;
  label: string;
  help?: string;
  /** Los no obligatorios se registran pero no bloquean la transición. */
  mandatory: boolean;
  input: CriterionInput;
  /** Opciones cuando `input` es ENUM. */
  options?: readonly string[];
  /** Tipo de artefacto exigido cuando `input` es ARTIFACT. */
  artifactKind?: ArtifactKind;
  /** Trazabilidad al documento: «CLI 001 §Gate 5, criterio 3». */
  sopRef: string;
}

export interface GateSpec {
  gate: GateKey;
  /** 1..10, el número con el que el SOP y el owner la llaman. */
  number: number;
  title: string;
  documentRef: string;
  /** `PENDING_SOP` = todavía no hay documento; el motor NO deja pasar transiciones por esta puerta. */
  status: 'PENDING_SOP' | 'ACTIVE';
  criteria: readonly CriterionSpec[];
}

export interface SopCatalog {
  key: 'CLI_001';
  /** Se graba en cada evaluación: cambiar el SOP no reescribe la historia. */
  version: string;
  gates: Readonly<Record<GateKey, GateSpec>>;
  /** Qué artefactos corresponden a cada etapa (§11.5). Informativo: lo que obliga es el criterio. */
  artifactsByStage: Readonly<Partial<Record<OpportunityStage, readonly ArtifactKind[]>>>;
}

/** Criterios obligatorios de una puerta. */
export function mandatoryCriteria(catalog: SopCatalog, gate: GateKey): readonly CriterionSpec[] {
  return catalog.gates[gate].criteria.filter((c) => c.mandatory);
}

/** ¿Está la puerta lista para usarse? Sólo si su documento del SOP ya se incorporó. */
export function isGateCatalogReady(catalog: SopCatalog, gate: GateKey): boolean {
  return catalog.gates[gate].status === 'ACTIVE';
}

export function gateNotConfigured(catalog: SopCatalog, gate: GateKey): AppError {
  const spec = catalog.gates[gate];
  return new AppError({
    code: 'SOP_GATE_NOT_CONFIGURED',
    kind: 'CONFLICT',
    message:
      `La puerta ${spec.number} (${spec.title}) todavía no tiene criterios de salida definidos. ` +
      'Falta incorporar su documento del SOP CLI 001.',
    details: { gate, documentRef: spec.documentRef },
  });
}

export function assertGateCatalogReady(catalog: SopCatalog, gate: GateKey): void {
  if (!isGateCatalogReady(catalog, gate)) throw gateNotConfigured(catalog, gate);
}

/**
 * Problemas del propio catálogo. Lo usa un test de regresión: una puerta ACTIVA sin ningún criterio
 * obligatorio dejaría pasar un PASS sin evidencia, que es justo lo que el §11.1 prohíbe.
 */
export function catalogViolations(catalog: SopCatalog): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const gate of GATE_KEYS) {
    const spec = catalog.gates[gate];
    if (spec.gate !== gate) out.push(`${gate}: la spec dice ser ${spec.gate}`);
    if (spec.status === 'ACTIVE' && spec.criteria.every((c) => !c.mandatory)) {
      out.push(`${gate}: está ACTIVE pero no tiene ningún criterio obligatorio`);
    }
    for (const c of spec.criteria) {
      if (seen.has(c.key)) out.push(`criterio duplicado: ${c.key}`);
      seen.add(c.key);
      if (c.input === 'ARTIFACT' && !c.artifactKind) out.push(`${c.key}: input ARTIFACT sin artifactKind`);
      if (c.input === 'ENUM' && !c.options?.length) out.push(`${c.key}: input ENUM sin opciones`);
    }
  }
  // Gate 6: el handoff exige «PASS más un evento real de envío». Sin un criterio EVENT, PROPOSAL_SENT
  // se alcanzaría sin que la propuesta se haya enviado de verdad.
  const g6 = catalog.gates.GATE_6;
  if (g6.status === 'ACTIVE' && !g6.criteria.some((c) => c.input === 'EVENT' && c.mandatory)) {
    out.push('GATE_6: está ACTIVE pero no exige ningún evento real de envío (criterio EVENT obligatorio)');
  }
  return out;
}
