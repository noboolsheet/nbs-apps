import { RecordLink } from './record-link';
import { btnPrimary } from './button';
import { t } from '@/lib/i18n';

/**
 * Botón "＋ Nuevo" (arriba a la derecha de una lista). Abre el panel lateral de creación con
 * `?rec=<entity>:new` (preservando la query actual). La creación real ocurre al pulsar "Crear".
 */
export function NewRecordButton({
  entity,
  label,
  preset,
}: {
  entity: string;
  label?: string;
  /** Valor inicial de un campo al crear, `campo:valor`. Lo usa una lista ya acotada (Procesos → tipo PROCESS)
   *  para que el registro nuevo nazca dentro del filtro que estás mirando y no fuera de él. */
  preset?: string;
}) {
  const text = label ?? t('common.new');
  return (
    <RecordLink
      entity={entity}
      id="new"
      preset={preset}
      className={`shrink-0 ${btnPrimary}`}
    >
      ＋ {text}
    </RecordLink>
  );
}
