'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MessageScreen } from '@/components/ui/message-screen';
import { btnPrimary, btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * Error de ruta (F-26): sustituye al «Application error: a server-side exception has occurred» de Next
 * cuando un Server Component lanza. Vive dentro de `(app)`, así que el shell (barra lateral, búsqueda)
 * sigue en pie y el fallo queda acotado al área de contenido.
 *
 * `reset()` reintenta el render del segmento sin recargar la página entera: para un fallo transitorio
 * (la base de datos tardó, una integración devolvió 500) suele bastar.
 *
 * `error.digest` es el ÚNICO dato técnico que se enseña: en producción Next oculta el mensaje real al
 * cliente y deja este hash en los logs del servidor, así que es lo que permite cruzar «lo que vi» con
 * «lo que pasó». Sin él no hay forma de encontrar el fallo en `docker logs`.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // El logger JSON del servidor no llega aquí (esto corre en el navegador); la consola es el único sitio.
    console.error('[control-tower] error de ruta', error);
  }, [error]);

  return (
    <MessageScreen
      tone="danger"
      title={t('error.crashTitle')}
      hint={t('error.crashHint')}
      actions={
        <>
          <button type="button" onClick={reset} className={btnPrimary}>
            {t('error.retry')}
          </button>
          <Link href="/" className={btnSecondary}>
            {t('error.backHome')}
          </Link>
        </>
      }
      footnote={error.digest ? `${t('error.reference')} ${error.digest}` : undefined}
    />
  );
}
