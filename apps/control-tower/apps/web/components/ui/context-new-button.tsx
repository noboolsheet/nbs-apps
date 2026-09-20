import { RecordLink } from './record-link';
import { buttonCls } from './button';
import { t } from '@/lib/i18n';

/**
 * Botón "＋ Nuevo" dentro de la sección de un objeto padre (p. ej. Tareas de un Proyecto).
 * Abre el panel de creación con la relación al padre **fijada y oculta** vía `?rec=<entity>:new&in=<ctxKey>:<parentId>`.
 * `ctxKey` es la clave declarada en `contextCreate` del registro (p. ej. 'project', 'client', 'strategic_area').
 */
export function ContextNewButton({
  entity,
  ctxKey,
  parentId,
  label,
}: {
  entity: string;
  ctxKey: string;
  parentId: string;
  label?: string;
}) {
  return (
    <RecordLink
      entity={entity}
      id="new"
      context={`${ctxKey}:${parentId}`}
      className={`shrink-0 ${buttonCls('primary', 'sm')}`}
    >
      ＋ {label ?? t('common.new')}
    </RecordLink>
  );
}
