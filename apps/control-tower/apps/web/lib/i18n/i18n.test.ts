import { describe, it, expect } from 'vitest';
import {
  CLIENT_STATUS,
  OPPORTUNITY_STAGE,
  ORGANIZATION_TYPE,
  COMPANY_RELATIONSHIP_ROLE,
  PERSON_RELATIONSHIP_ROLE,
  PREFERRED_LANGUAGE,
  PREFERRED_CONTACT_CHANNEL,
  OPPORTUNITY_SERVICE_TYPE,
  OPPORTUNITY_LEAD_SOURCE,
  OPPORTUNITY_LOST_REASON,
  BILLING_SUBJECT,
  GATE_KEYS,
  GATE_OUTCOME,
  GATE_EVALUATION_STATUS,
  TRANSITION_STATUS,
  ARTIFACT_KIND,
  PROJECT_STATUS,
  PROJECT_TYPE,
  TASK_STATUS,
  DELIVERABLE_STATUS,
  DECISION_STATUS,
  KNOWLEDGE_TYPE,
  KNOWLEDGE_ITEM_STATUS,
  KNOWLEDGE_INBOX_STATUS,
  ASSET_STATUS,
  PORTFOLIO_ITEM_STATUS,
  PORTFOLIO_ITEM_VISIBILITY,
  CAPABILITY_STATUS,
  CAPABILITY_MATURITY,
  SERVICE_STATUS,
  INTEGRATION_STATUS,
  JOB_STATUS,
  OUTBOX_STATUS,
  PRIORITY,
  RESOURCE_STATUS,
  RESOURCE_HOSTING,
  LEARNING_STATUS,
  MEMBER_ROLES,
} from '@ct/domain';
import { dictionaries, LOCALES, t, tPlural, tOptional } from './index';
import { es } from './es';

/** E-10 — garantías estructurales del i18n (lo que hace que añadir un idioma sea seguro). */
describe('i18n', () => {
  it('todos los diccionarios tienen exactamente las mismas claves', () => {
    const base = Object.keys(es).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(dictionaries[locale]).sort(), `locale ${locale}`).toEqual(base);
    }
  });

  it('ninguna clave queda con el valor vacío', () => {
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('cada código de enum del dominio tiene su etiqueta `enum.<CODIGO>`', () => {
    // Las claves `enum.*` se resuelven en RUNTIME (`enumLabel`), así que TypeScript no las protege:
    // si una desaparece, la UI mostraría el código crudo (ACTIVE en vez de «Activo»). Este test lo impide.
    const codes = [
      ...CLIENT_STATUS, ...OPPORTUNITY_STAGE, ...PROJECT_STATUS, ...PROJECT_TYPE, ...TASK_STATUS,
      ...DELIVERABLE_STATUS, ...DECISION_STATUS, ...KNOWLEDGE_TYPE, ...KNOWLEDGE_ITEM_STATUS,
      ...KNOWLEDGE_INBOX_STATUS, ...ASSET_STATUS, ...PORTFOLIO_ITEM_STATUS, ...PORTFOLIO_ITEM_VISIBILITY,
      ...CAPABILITY_STATUS, ...CAPABILITY_MATURITY, ...SERVICE_STATUS, ...INTEGRATION_STATUS,
      ...JOB_STATUS, ...OUTBOX_STATUS, ...PRIORITY, ...RESOURCE_STATUS, ...RESOURCE_HOSTING,
      ...LEARNING_STATUS, ...MEMBER_ROLES,
      // Contrato de datos del CRM de Twenty + motor del SOP CLI 001 (handoff 2026-09-22).
      ...ORGANIZATION_TYPE, ...COMPANY_RELATIONSHIP_ROLE, ...PERSON_RELATIONSHIP_ROLE,
      ...PREFERRED_LANGUAGE, ...PREFERRED_CONTACT_CHANNEL, ...OPPORTUNITY_SERVICE_TYPE,
      ...OPPORTUNITY_LEAD_SOURCE, ...OPPORTUNITY_LOST_REASON, ...BILLING_SUBJECT,
      ...GATE_KEYS, ...GATE_OUTCOME, ...GATE_EVALUATION_STATUS, ...TRANSITION_STATUS, ...ARTIFACT_KIND,
    ];
    const missing = [...new Set(codes)].filter((c) => tOptional(`enum.${c}`) === undefined);
    expect(missing).toEqual([]);
  });

  it('las familias de plural tienen sus dos claves (.one/.other)', () => {
    // `tPlural('base', n)` construye la clave en RUNTIME, así que un grep literal no las ve: sin este test, una
    // limpieza de "claves sin usar" se las llevaría y la UI mostraría la clave cruda.
    const bases = [
      'table.confirmArchive', 'table.confirmRestore', 'table.confirmDelete', 'table.selected',
      'table.filterMatches', 'tasks.countActive', 'tasks.countCompleted',
    ];
    for (const base of bases) {
      for (const form of ['one', 'other']) {
        expect(tOptional(`${base}.${form}`), `${base}.${form}`).toBeDefined();
      }
    }
    expect(tPlural('table.selected', 1)).toBe('1 seleccionado');
    expect(tPlural('table.selected', 3)).toBe('3 seleccionados');
  });

  it('ninguna clave se nombra con la frase española (F-30)', () => {
    // F-30: 61 claves eran el texto español en camelCase, varias cortadas a mitad de palabra
    // (`knowledge.anadeRecursosReutilizablesConElBotonNuev`). Quien traduce lee el VALOR; la CLAVE es lo único
    // que le dice a qué pantalla pertenece, así que tiene que describir el sitio, no repetir la frase.
    // Heurística deliberadamente tonta: si en el nombre aparece una palabra funcional del castellano como
    // segmento camel, o el nombre es larguísimo, es que se generó a partir del texto.
    const STOPWORDS = new Set([
      'de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'con', 'para', 'que', 'por', 'sin',
      'aun', 'hay', 'esta', 'este', 'todo', 'todos', 'mas', 'al', 'su', 'se', 'y',
    ]);
    const offenders: string[] = [];
    for (const key of Object.keys(es)) {
      const local = key.slice(key.indexOf('.') + 1);
      if (key.startsWith('enum.')) continue; // `enum.<CODIGO>` lo dicta el dominio, no se elige aquí
      const segments = local.split(/(?=[A-Z])/).map((s2) => s2.toLowerCase());
      if (segments.some((s2) => STOPWORDS.has(s2))) offenders.push(key);
      else if (local.length > 32) offenders.push(key);
    }
    expect(offenders).toEqual([]);
  });

  it('interpola las variables y deja intacto lo que no reconoce', () => {
    expect(t('enum.ACTIVE')).toBe('Activo');
    // Una clave inexistente se devuelve tal cual: el olvido se ve en pantalla, no rompe el render.
    expect(t('no.existe' as never)).toBe('no.existe');
    expect(tOptional('enum.NO_EXISTE')).toBeUndefined();
  });
});
