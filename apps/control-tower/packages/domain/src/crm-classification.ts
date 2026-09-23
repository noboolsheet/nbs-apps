import type { BillingSubject } from './enums';

/**
 * Clasificación de una oportunidad en ORGANIZACIÓN o INDIVIDUAL (handoff §2.2).
 *
 * Regla del contrato:
 *  - **Organización**: la oportunidad tiene Company. Los datos de facturación de la Company mandan.
 *  - **Individual**: NO tiene Company y el Point of Contact lleva `INDIVIDUAL_CLIENT` entre sus roles
 *    de relación. Los datos de facturación de la Person mandan.
 *
 * Dos prohibiciones explícitas del handoff que esta función existe para hacer cumplir:
 *  1. **Nunca crear una Company de relleno** para un cliente individual. Por eso hay un tercer valor,
 *     `UNDETERMINED`: lo que falta es información en Twenty, y decirlo es mejor que inventarla.
 *  2. **Nunca duplicar** los datos de facturación de una entidad en la otra.
 *
 * Se DERIVA, no se almacena. Los dos insumos los posee Twenty; guardar la conclusión crearía un
 * tercer valor que se quedaría viejo respecto a sus propios insumos y que CT no tendría forma
 * legítima de corregir (CT no escribe en el CRM).
 *
 * Función pura, sin IO: la resolución contra la base de datos vive en la capa de aplicación.
 */

/** Por qué salió esa clasificación. Cada motivo tiene una acción concreta distinta en la interfaz. */
export type ClassificationReason =
  /** Hay Company: el sujeto es la Company, independientemente de lo que diga el Point of Contact. */
  | 'COMPANY_PRESENT'
  /** Sin Company y el Point of Contact es cliente individual. */
  | 'NO_COMPANY_POC_INDIVIDUAL'
  /** Sin Company y sin Point of Contact: no se sabe a quién se factura. */
  | 'NO_COMPANY_NO_POC'
  /** Sin Company y el Point of Contact NO tiene el rol: falta marcarlo en Twenty. */
  | 'NO_COMPANY_POC_NOT_INDIVIDUAL';

export interface ClassificationInput {
  /** ¿La oportunidad tiene Company enlazada? */
  hasCompany: boolean;
  /** ¿Tiene Point of Contact? (una oportunidad puede no tenerlo todavía) */
  hasPointOfContact: boolean;
  /** Roles de relación del Point of Contact, completos. Multi-select: nunca reducidos a uno. */
  pointOfContactRoles: readonly string[];
}

export interface Classification {
  subject: BillingSubject;
  reason: ClassificationReason;
}

/** El rol que convierte a una persona en sujeto de facturación por sí misma. */
export const INDIVIDUAL_CLIENT_ROLE = 'INDIVIDUAL_CLIENT';

export function classifyBillingSubject(input: ClassificationInput): Classification {
  // La Company gana siempre: si existe, es la entidad legal a la que se factura, tenga el contacto
  // los roles que tenga (una persona puede ser cliente individual en OTRA oportunidad suya).
  if (input.hasCompany) return { subject: 'ORGANIZATION', reason: 'COMPANY_PRESENT' };

  if (!input.hasPointOfContact) return { subject: 'UNDETERMINED', reason: 'NO_COMPANY_NO_POC' };

  return input.pointOfContactRoles.includes(INDIVIDUAL_CLIENT_ROLE)
    ? { subject: 'INDIVIDUAL', reason: 'NO_COMPANY_POC_INDIVIDUAL' }
    : { subject: 'UNDETERMINED', reason: 'NO_COMPANY_POC_NOT_INDIVIDUAL' };
}

/** ¿De qué entidad hay que leer los datos de facturación? `null` si todavía no se puede saber. */
export function billingPartyEntity(subject: BillingSubject): 'CLIENT' | 'CONTACT' | null {
  if (subject === 'ORGANIZATION') return 'CLIENT';
  if (subject === 'INDIVIDUAL') return 'CONTACT';
  return null;
}
