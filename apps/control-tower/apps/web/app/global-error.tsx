'use client';

import { useEffect } from 'react';
import './globals.css';
import { MessageScreen } from '@/components/ui/message-screen';
import { btnPrimary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * Último recurso (F-26): se monta cuando falla el **layout raíz**, así que sustituye al documento entero
 * y tiene que traer sus propios `<html>`/`<body>` y su hoja de estilos — nada de lo de `app/layout.tsx`
 * está disponible aquí, ni siquiera la variable de fuente (`globals.css` cae al stack del sistema).
 *
 * Por eso la única acción es recargar: si el layout raíz no se pudo montar, `reset()` reintentaría el
 * mismo render roto y navegar con `<Link>` tampoco es fiable — un `<a>` normal fuerza petición limpia.
 * En la práctica esto se ve si la base de datos no responde al arrancar.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[control-tower] error global (falló el layout raíz)', error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <MessageScreen
          tone="danger"
          title={t('error.globalTitle')}
          hint={t('error.globalHint')}
          actions={
            <a href="/" className={btnPrimary}>
              {t('error.reload')}
            </a>
          }
          footnote={error.digest ? `${t('error.reference')} ${error.digest}` : undefined}
        />
      </body>
    </html>
  );
}
