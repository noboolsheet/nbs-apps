import Link from 'next/link';
import { MessageScreen } from '@/components/ui/message-screen';
import { btnPrimary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * 404 de URL inexistente (F-26). Es una pantalla DISTINTA de `(app)/not-found.tsx`: esta la usa Next
 * cuando la URL no casa con ninguna ruta, y como no está dentro del grupo `(app)` se pinta sin el shell
 * (no hay sección donde situarla). La de dentro del shell es la de las fichas que llaman a `notFound()`.
 *
 * Sin atajo a Archivados: si la URL no existe siquiera como ruta, el registro archivado no es la causa.
 */
export default function NotFound() {
  return (
    <MessageScreen
      title={t('error.notFoundTitle')}
      hint={t('error.notFoundHint')}
      actions={
        <Link href="/" className={btnPrimary}>
          {t('error.backHome')}
        </Link>
      }
    />
  );
}
