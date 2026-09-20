'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { postJson, patchJson } from '@/lib/client';
import { RECORDS, type PanelField } from '@/lib/record-registry';
import { PROVIDER_LABEL } from '@ct/domain';
import { enumLabel } from '@/lib/labels';
import { TaskPanelActions } from '@/components/projects/forms';
import { InboxPanelActions, ReviewItemPanelActions } from '@/components/knowledge/forms';
import { fieldCls } from './input';
import { btnPrimary } from './button';
import { SearchableSelect } from './searchable-select';
import { SourceBadge } from './source-badge';
import { ExternalSourceLink } from './external-source-link';
import { RecordHistory } from './record-history';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

/**
 * Panel lateral (estilo Twenty) para crear/editar los metadatos de cualquier entidad registrada en
 * `record-registry.ts`. Montado una vez en el AppShell y controlado por el search-param `?rec=<entidad>:<id|new>`.
 * - Crear: panel vacío + botón "Crear" (POST de todos los campos) → pasa a edición del nuevo registro.
 * - Editar: carga el registro (GET) y **autoguarda cada campo** (PATCH, con endpoint por-campo si aplica).
 * Cierra con la X, `Escape` o el backdrop (quita el param). Las secciones internas siguen en la ficha completa.
 */
type Values = Record<string, string>;

const inputCls = `w-full disabled:opacity-50 ${fieldCls}`;

function toStr(v: unknown): string {
  return v == null ? '' : String(v);
}
function coerce(f: PanelField, raw: string): unknown {
  if (f.type === 'number') return Number(raw);
  if (f.type === 'boolean') return raw === 'true';
  return raw;
}
function fmtDate(v: unknown): string {
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? toStr(v) : formatDateTime(d);
}

type Source = { provider: string; url: string | null };

export function RecordPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const spStr = sp.toString();
  const rec = sp.get('rec'); // "<entidad>:<id|new>"

  const [entity, rawId] = rec ? rec.split(':') : [undefined, undefined];
  const spec = entity ? RECORDS[entity] : undefined;
  const isNew = rawId === 'new';
  const id = isNew ? undefined : rawId;

  // Creación contextual desde la sección de un padre: ?rec=<e>:new&in=<ctxKey>:<parentId>
  const inParam = sp.get('in');
  const [ctxKey, parentId] = inParam ? inParam.split(':') : [undefined, undefined];
  const ctxCfg = isNew && spec && ctxKey ? spec.contextCreate?.[ctxKey] : undefined;

  // Valor inicial de un campo al crear: ?set=<campo>:<valor>. Lo pone la lista que ya está filtrada (Procesos
  // (SOP) → `knowledgeType:PROCESS`), para que lo que creas desde ahí nazca dentro del filtro que estás viendo.
  const setParam = sp.get('set');
  const presetIdx = setParam ? setParam.indexOf(':') : -1;
  const presetField = presetIdx > 0 ? setParam!.slice(0, presetIdx) : undefined;
  const presetValue = presetIdx > 0 ? setParam!.slice(presetIdx + 1) : undefined;

  const [values, setValues] = useState<Values>({});
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [lockedMeta, setLockedMeta] = useState<{ locked: boolean; reason?: string }>({ locked: false });
  const [relOptions, setRelOptions] = useState<Record<string, { value: string; label: string; dep: string | null }[]>>({});
  const [suggestOptions, setSuggestOptions] = useState<Record<string, string[]>>({});
  const [derived, setDerived] = useState<Record<string, string>>({}); // valores solo-lectura heredados del padre
  const [loading, setLoading] = useState(false);
  const [busyField, setBusyField] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cerrar/navegar preservando el resto de la query (p. ej. el filtro ?status= de la lista).
  const withoutRec = useCallback(() => {
    const p = new URLSearchParams(spStr);
    p.delete('rec');
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [spStr, pathname]);
  const withRec = useCallback(
    (value: string) => {
      const p = new URLSearchParams(spStr);
      p.set('rec', value);
      return `${pathname}?${p.toString()}`;
    },
    [spStr, pathname],
  );
  // `scroll: false`: cerrar el panel no debe devolver la página al principio (se abrió sin moverla).
  const close = useCallback(() => router.push(withoutRec(), { scroll: false }), [router, withoutRec]);

  useEffect(() => {
    if (!rec) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rec, close]);

  // Accesibilidad del diálogo: al abrir, guarda el foco previo y lo lleva al panel; al cerrar, lo restaura.
  const asideRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!rec) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const id = window.setTimeout(() => asideRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      restoreFocusRef.current?.focus?.();
    };
  }, [rec]);

  // Focus-trap: mantiene el Tab dentro del panel mientras está abierto.
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab' || !asideRef.current) return;
    const focusables = Array.from(
      asideRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Cargar el registro (edición) o vaciar (creación).
  useEffect(() => {
    if (!spec) return;
    setError(null);
    if (isNew || !id) {
      // Creación: precarga los valores por defecto declarados (p. ej. estado 'TODO' en una tarea nueva).
      const init: Values = {};
      for (const f of spec.fields) if (f.defaultValue != null) init[f.name] = f.defaultValue;
      // El preset de la URL gana al `defaultValue` del registro: es una intención explícita de quien abrió el panel.
      if (presetField && presetValue != null && spec.fields.some((f) => f.name === presetField)) {
        init[presetField] = presetValue;
      }
      setValues(init);
      setRaw(null);
      setSource(null);
      setLockedMeta({ locked: false });
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(spec.itemPath(id))
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const record = (spec.pick ? spec.pick(json.data) : json.data) as Record<string, unknown> | undefined;
        const v: Values = {};
        for (const f of spec.fields) v[f.name] = toStr(record?.[f.name]);
        setValues(v);
        setRaw(record ?? null);
        setSource((json.meta?.source as Source | undefined) ?? null);
        setLockedMeta({ locked: json.meta?.readOnly === true, reason: json.meta?.readOnlyReason as string | undefined });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spec, id, isNew, rec, presetField, presetValue]);

  // Cargar opciones de los campos de relación (GET de lista existente).
  useEffect(() => {
    if (!spec) return;
    const sources = [...new Set(spec.fields.filter((f) => f.relation).map((f) => f.relation!.source))];
    if (sources.length === 0) return;
    let cancelled = false;
    Promise.all(
      sources.map(async (src) => {
        const field = spec.fields.find((f) => f.relation?.source === src)!;
        const labelFields = field.relation!.labelFields;
        try {
          const json = (await (await fetch(src)).json()) as { data?: Record<string, unknown>[] };
          const dep = field.relation!.dependsOn;
          const opts = (json.data ?? []).map((row) => ({
            value: String(row.id),
            label: labelFields.map((k) => row[k]).filter(Boolean).join(' ').trim() || String(row.id),
            // Clave por la que se acota la lista (p. ej. el cliente al que pertenece el contacto).
            dep: dep ? (row[dep.rowKey] == null ? null : String(row[dep.rowKey])) : null,
          }));
          return [src, opts] as const;
        } catch {
          return [src, []] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setRelOptions(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  // Cargar sugerencias de campos de texto libre (datalist), p. ej. el sector.
  useEffect(() => {
    if (!spec) return;
    const sources = [...new Set(spec.fields.filter((f) => f.suggest).map((f) => f.suggest!))];
    if (sources.length === 0) return;
    let cancelled = false;
    Promise.all(
      sources.map(async (src) => {
        try {
          const json = (await (await fetch(src)).json()) as { data?: string[] };
          return [src, json.data ?? []] as const;
        } catch {
          return [src, []] as const;
        }
      }),
    ).then((entries) => {
      if (!cancelled) setSuggestOptions(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [spec]);

  // Valores DERIVADOS (solo lectura) del registro padre — p. ej. la oportunidad de la tarea desde el proyecto.
  // Se recalcula en vivo (GET del padre) al abrir/cambiar, así refleja siempre la oportunidad ACTUAL del proyecto.
  useEffect(() => {
    if (!spec) return;
    const derivedFields = spec.fields.filter((f) => f.derivedFrom);
    if (derivedFields.length === 0) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const f of derivedFields) {
        const df = f.derivedFrom!;
        const parentSpec = RECORDS[df.entity];
        // id del padre: en creación contextual = parentId (si el contexto es esa entidad); en edición = FK propia.
        const parentIdVal = isNew ? (ctxKey === df.entity ? parentId : undefined) : toStr(raw?.[df.idField]) || undefined;
        if (parentIdVal && parentSpec) {
          try {
            const json = (await (await fetch(parentSpec.itemPath(parentIdVal))).json()) as { data?: unknown };
            const parent = (parentSpec.pick ? parentSpec.pick(json.data) : json.data) as Record<string, unknown> | undefined;
            next[f.name] = toStr(parent?.[df.valueField]);
          } catch {
            next[f.name] = '';
          }
        } else {
          // Sin padre: cae al valor propio del registro (p. ej. una tarea de preventa con su propia oportunidad).
          next[f.name] = isNew ? '' : toStr(raw?.[f.name]);
        }
      }
      if (!cancelled) setDerived(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [spec, isNew, ctxKey, parentId, raw, rec]);

  if (!rec || !spec) return null;

  function setVal(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  // ¿El campo está oculto según los valores actuales? (p. ej. proyecto personal oculta cliente/oportunidad/
  // servicio; tarea con proyecto/oportunidad/tarea-padre oculta "personal"). Se incluye la relación al padre
  // fijada por creación contextual, para que el predicado la vea aunque no esté en `values`.
  function isHidden(f: PanelField): boolean {
    if (!f.hidden) return false;
    const ev: Values = { ...values };
    if (ctxCfg && parentId) ev[ctxCfg.presetField] = parentId;
    return f.hidden(ev);
  }

  async function commitField(f: PanelField, value: string) {
    if (isNew || !id || f.readOnly || f.derivedFrom || f.context) return;
    // Dirty-check: si el valor no cambió respecto al cargado, no hacemos PATCH ni refresh (evita escrituras
    // redundantes al tabular por los campos sin editarlos).
    if (value === toStr(raw?.[f.name])) return;
    setBusyField(f.name);
    setError(null);
    const endpoint = f.commitPath ? f.commitPath(id) : spec!.itemPath(id);
    const key = f.commitKey ?? f.name;
    const res = await patchJson(endpoint, { [key]: value === '' ? null : coerce(f, value) });
    setBusyField(null);
    if (res.error) setError(res.error.message);
    else router.refresh();
  }

  /** ¿Esta entidad se puede crear desde el panel? (a nivel de lista o dentro de su padre). */
  const canCreate = !!((ctxCfg?.createPath && parentId) || spec?.createPath);

  async function create() {
    const usingOverride = !!(ctxCfg?.createPath && parentId);
    const createPath = usingOverride ? ctxCfg!.createPath!(parentId!) : spec!.createPath;
    if (!createPath) return;
    setCreating(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    for (const f of spec!.fields) {
      if (ctxCfg && f.name === ctxCfg.presetField) continue; // lo fija el contexto (padre)
      if (f.derivedFrom || f.context) continue; // heredado/solo lectura → no se guarda en este registro
      if (isHidden(f)) continue; // oculto por otro campo (p. ej. proyecto personal) → no se envía
      const raw = values[f.name] ?? '';
      if (raw !== '') payload[f.name] = coerce(f, raw);
    }
    // Relación al padre: en rutas anidadas la impone el endpoint; en las raíz va en el body.
    if (ctxCfg && parentId && !usingOverride) payload[ctxCfg.presetField] = parentId;
    const res = await postJson<{ id: string }>(createPath, payload);
    setCreating(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.refresh();
    // Creación contextual (desde la sección de un padre): se vuelve al padre → cerrar el panel.
    // Creación normal (a nivel de lista): pasar a edición del nuevo registro (autoguardado por campo).
    const contextual = !!(ctxCfg && parentId);
    if (!contextual && res.data?.id) router.push(withRec(`${spec!.entity}:${res.data.id}`), { scroll: false });
    else close();
  }

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/20" onClick={close} />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? `${t('common.new')} · ${spec.label}` : spec.label}
        tabIndex={-1}
        onKeyDown={trapTab}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-xl outline-none"
      >
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="truncate text-sm font-semibold">{isNew ? `${t('common.new')} · ${spec.label}` : spec.label}</h2>
            {/* La ficha completa solo para entidades con secciones internas. Una SUBTAREA (task con
                parentTaskId) es panel-only: no ofrece ficha ni, por tanto, sub-subtareas. */}
            {!isNew && id && spec.detailPath && !raw?.parentTaskId && (
              <Link href={spec.detailPath(id)} className="shrink-0 text-xs text-blue-600 underline dark:text-blue-400">
                {t('panel.openFullRecord')}
              </Link>
            )}
          </div>
          <button type="button" onClick={close} aria-label={t('common.close')} className="shrink-0 rounded p-1 text-fg-muted hover:bg-neutral-soft">
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-fg-muted">{t('common.loading')}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {lockedMeta.locked && (
                <div className="rounded border border-warning-border bg-warning-soft px-3 py-2 text-xs text-warning-soft-fg">
                  🔒 {lockedMeta.reason ?? t('panel.readOnly')}
                </div>
              )}
              {spec.fields
                .filter((f) => !(ctxCfg && f.name === ctxCfg.presetField) && !isHidden(f) && !f.context)
                .map((f) => {
                // Bloqueo por procedencia: si el registro vino de un proveedor que posee este campo, es de solo lectura.
                const ownedByProvider = !isNew && !!source && !!f.ownedBy?.includes(source.provider);
                const locked = !!f.readOnly || ownedByProvider || lockedMeta.locked;
                // Nota: los campos heredados (`derivedFrom`/`context`) se filtran arriba y se muestran en "Contexto".
                return (
                <div key={f.name} className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-muted">
                    {f.label}
                    {f.required && ' *'}
                    {ownedByProvider && <span className="ml-1 text-fg-subtle">🔒</span>}
                  </span>
                  <FieldControl
                    field={f}
                    value={values[f.name] ?? ''}
                    options={f.relation ? relatedOptions(f, relOptions, values) : undefined}
                    suggestions={f.suggest ? suggestOptions[f.suggest] ?? [] : undefined}
                    disabled={busyField === f.name || locked}
                    onChange={(v) => setVal(f.name, v)}
                    onCommit={isNew || locked ? undefined : (v) => void commitField(f, v)}
                  />
                  {ownedByProvider && source && (
                    <span className="text-xs text-fg-subtle">
                      {t('panel.ownedByProvider', { provider: PROVIDER_LABEL[source.provider] ?? source.provider })}
                    </span>
                  )}
                </div>
                );
              })}
              {error && <p className="text-sm text-danger">{error}</p>}
              {isNew && !canCreate ? (
                // Entidad que NO se crea desde aquí (p. ej. opportunity: nace en Twenty). Sin esto el botón «Crear»
                // se quedaba sin hacer nada al pulsarlo, que es la peor forma de decir que no se puede.
                <p className="text-sm text-fg-muted">{t('panel.notCreatableHere')}</p>
              ) : isNew ? (
                <button
                  type="button"
                  onClick={() => void create()}
                  disabled={creating}
                  className={`mt-1 self-start ${btnPrimary}`}
                >
                  {creating ? t('panel.creating') : t('common.create')}
                </button>
              ) : (
                <p className="text-xs text-fg-subtle">{t('ui.losCambiosSeGuardanAutomaticamente')}</p>
              )}

              {/* Botones de fecha específicos de tarea/subtarea (Reprogramar + Pasar a hoy). */}
              {spec.entity === 'task' && !isNew && id && (
                <TaskPanelActions id={id} dueDate={toStr(raw?.dueDate) || null} />
              )}

              {/* Captura: Procesar/Descartar si no está resuelta; Eliminar siempre (también en solo lectura). */}
              {spec.entity === 'knowledge_inbox' && !isNew && id && (
                <InboxPanelActions id={id} resolved={lockedMeta.locked} onDone={() => { router.refresh(); close(); }} />
              )}

              {/* «Por revisar»: pasar a la biblioteca (sólo si está revisado) o enlace a lo ya guardado. */}
              {spec.entity === 'review_item' && !isNew && id && (
                <ReviewItemPanelActions
                  id={id}
                  status={toStr(raw?.status)}
                  knowledgeItemId={toStr(raw?.knowledgeItemId) || null}
                  onDone={() => {
                    router.refresh();
                    close();
                  }}
                />
              )}

              {/*
                Enlace al registro en su sistema de origen (la página de Notion, la ficha de Twenty…), en su propia
                línea ANTES de «Contexto» (owner 2026-09-02). Estaba enterrado dentro del bloque de contexto, que es
                donde se mira la procedencia, no donde se salta a leer el documento — y en la biblioteca ese salto es
                justo lo que se quiere hacer: el cuerpo del SOP vive en Notion, no en CT.
              */}
              {!isNew && spec.source && source?.url && (
                <p className="mt-1">
                  <ExternalSourceLink
                    url={source.url}
                    label={t('panel.openInProvider', { provider: PROVIDER_LABEL[source.provider] ?? source.provider })}
                  />
                </p>
              )}

              {!isNew && (raw || source) && (
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('field.context')}</span>
                  {/* Campos heredados de solo lectura (p. ej. Proyecto/Oportunidad de una tarea): solo si tienen valor. */}
                  {spec.fields
                    .filter((f) => f.context)
                    .map((f) => {
                      const val = f.derivedFrom ? derived[f.name] ?? '' : values[f.name] ?? '';
                      if (!val) return null;
                      const label = f.relation
                        ? relOptions[f.relation.source]?.find((o) => o.value === val)?.label ?? val
                        : f.type === 'select'
                          ? enumLabel(val)
                          : val;
                      return (
                        <ContextRow key={f.name} label={f.label}>
                          {label}
                        </ContextRow>
                      );
                    })}
                  {/* Sólo la procedencia: el enlace ya está arriba, y repetirlo aquí daba dos enlaces al mismo sitio. */}
                  {spec.source && source && (
                    <ContextRow label={t('field.sourceType')}>
                      <SourceBadge source={source.provider} />
                    </ContextRow>
                  )}
                  {raw?.createdAt != null && <ContextRow label={t('crm.creado')}>{fmtDate(raw.createdAt)}</ContextRow>}
                  {raw?.updatedAt != null && <ContextRow label={t('crm.actualizado')}>{fmtDate(raw.updatedAt)}</ContextRow>}
                </div>
              )}
              {/* F-4: historial campo a campo del registro (se carga al desplegarlo). */}
              {!isNew && id && (
                <RecordHistory
                  entity={spec.entity}
                  id={id}
                  labels={Object.fromEntries(spec.fields.map((f) => [f.name, f.label]))}
                />
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/**
 * Opciones de un campo de relación, acotadas por `dependsOn` cuando toca: si ya se eligió el cliente, sólo se
 * ofrecen sus contactos. La opción YA GUARDADA se conserva aunque no encaje en el filtro — si no, un contacto
 * asignado antes de cambiar de cliente desaparecería del desplegable y parecería que se ha borrado.
 */
function relatedOptions(
  field: PanelField,
  all: Record<string, { value: string; label: string; dep: string | null }[]>,
  values: Values,
): { value: string; label: string }[] {
  const opts = all[field.relation!.source] ?? [];
  const dep = field.relation!.dependsOn;
  if (!dep) return opts;
  const parent = values[dep.field];
  if (!parent) return opts; // sin cliente elegido, se ofrecen todos
  const current = values[field.name];
  return opts.filter((o) => o.dep === parent || o.value === current);
}

function ContextRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="text-right text-fg">{children}</span>
    </div>
  );
}

function FieldControl({
  field,
  value,
  options,
  suggestions,
  disabled,
  onChange,
  onCommit,
}: {
  field: PanelField;
  value: string;
  options?: { value: string; label: string }[];
  suggestions?: string[];
  disabled: boolean;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${inputCls} min-h-20`}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select
        className={inputCls}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          onCommit?.(e.target.value);
        }}
      >
        <option value="">—</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {enumLabel(o)}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === 'relation') {
    return (
      <SearchableSelect
        value={value}
        onChange={(v) => {
          onChange(v);
          onCommit?.(v);
        }}
        options={options ?? []}
        emptyLabel="—"
        block
        disabled={disabled}
      />
    );
  }
  if (field.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={value === 'true'}
          disabled={disabled}
          onChange={(e) => {
            const v = String(e.target.checked);
            onChange(v);
            onCommit?.(v);
          }}
        />
        {/* Etiqueta fija: el título del campo ("Tarea/Proyecto personal") ya indica el sentido; marcado = sí. */}
        <span className="text-fg-muted">{t('common.yes')}</span>
      </label>
    );
  }
  // Campo de texto libre con SUGERENCIAS (p. ej. "Sector"): combobox con buscador + entrada de valor nuevo.
  // Sustituye al <datalist> nativo (que no mostraba opciones al hacer clic sin teclear).
  if (field.suggest) {
    return (
      <SearchableSelect
        value={value}
        onChange={(v) => {
          onChange(v);
          onCommit?.(v);
        }}
        options={(suggestions ?? []).map((s) => ({ value: s, label: s }))}
        emptyLabel="—"
        allowCustom
        block
        disabled={disabled}
      />
    );
  }
  return (
    <input
      className={inputCls}
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
    />
  );
}
