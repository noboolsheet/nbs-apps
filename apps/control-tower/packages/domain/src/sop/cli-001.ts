import type { GateKey } from './gates';
import type { GateSpec, SopCatalog } from './catalog';

/**
 * SOP «CLI 001 — Adquisición de Clientes y Pre-Onboarding».
 *
 * ⚠ **Este fichero está a la espera de los once documentos de etapa del SOP.** Las diez puertas
 * nacen en `PENDING_SOP` y sin criterios, y el motor RECHAZA toda transición cuya puerta no esté
 * `ACTIVE` (`SOP_GATE_NOT_CONFIGURED`). Se activan **de una en una**, según llega cada documento:
 * basta rellenar sus `criteria`, poner `status: 'ACTIVE'`, subir `version` y añadir las claves de
 * i18n. No hay que tocar la matriz ni el comando de transición.
 *
 * Los títulos y el reparto puerta↔etapa SÍ son firmes: vienen de la tabla del handoff §11.3.
 */

const pending = (gate: GateKey, number: number, title: string): GateSpec => ({
  gate,
  number,
  title,
  documentRef: `SOP CLI 001 — Gate ${number} (${title})`,
  status: 'PENDING_SOP',
  criteria: [],
});

export const CLI_001: SopCatalog = {
  key: 'CLI_001',
  // Sube al incorporar cada documento. Se graba en cada evaluación para no reescribir la historia.
  version: 'CLI001-0.0-pending-sop',
  gates: {
    GATE_1: pending('GATE_1', 1, 'Minimum Opportunity Fit'),
    GATE_2: pending('GATE_2', 2, 'Research Readiness'),
    GATE_3: pending('GATE_3', 3, 'Meeting Readiness'),
    GATE_4: pending('GATE_4', 4, 'Evaluation Readiness'),
    GATE_5: pending('GATE_5', 5, 'Proposal Readiness'),
    GATE_6: pending('GATE_6', 6, 'Send Readiness'),
    GATE_7: pending('GATE_7', 7, 'Response Classification'),
    GATE_8: pending('GATE_8', 8, 'Agreement Readiness'),
    GATE_9: pending('GATE_9', 9, 'Won Readiness'),
    GATE_10: pending('GATE_10', 10, 'Onboarded Readiness'),
  },
  // Artefactos por etapa (§11.5). LEAD y QUALIFIED no tienen informe propio del cliente; lo que se
  // guarda ahí es la carpeta de Drive. CT nunca los crea: sólo guarda la URL que pega el usuario.
  artifactsByStage: {
    RESEARCHING: ['AP_001'],
    MEETING: ['RE_001'],
    EVALUATING: ['DP_001'],
    PREPARING_PROP: ['PC_001'],
    CONTRACTING: ['CONTRACT'],
    WON: ['HO_001'],
    ONBOARDED: ['FINAL_SNAPSHOT'],
  },
};

/**
 * Único punto por el que el motor lee el catálogo. Si algún día el owner quiere editarlo sin
 * desplegar (p. ej. desde `organizations.settings`), se cambia AQUÍ y en ningún otro sitio.
 */
export function resolveSopCatalog(): SopCatalog {
  return CLI_001;
}
