import Link from 'next/link';
import { MessageScreen } from '@/components/ui/message-screen';
import { btnPrimary, btnSecondary } from '@/components/ui/button';
import { t } from '@/lib/i18n';

/**
 * 404 de las fichas (F-26): lo que se ve cuando una ficha llama a `notFound()` porque el registro no
 * existe o no es de esta organización. Sustituye al 404 por defecto de Next, que salía en inglés.
 *
 * **Se pinta SIN la barra lateral, y no es un descuido.** Next no aplica el layout del grupo `(app)` a un
 * `not-found.tsx` aunque el fichero viva dentro del grupo: el boundary de 404 se renderiza sólo con el
 * layout raíz. Se probó montar el `AppShell` a mano leyendo la sesión, pero dentro de ese boundary
 * `getCurrentContext()` devuelve null (Next no expone las cookies ahí), así que quedaba igual y con una
 * consulta de más. Por eso la pantalla lleva sus propias salidas: sin ellas el usuario sí se quedaría
 * atrapado.
 *
 * El atajo a Archivados no es decorativo: la causa más probable de llegar aquí desde un enlace que antes
 * funcionaba es que el registro se archivó (se oculta de las listas pero no se borra).
 */
export default function AppNotFound() {
  return (
    <MessageScreen
      title={t('error.notFoundTitle')}
      hint={`${t('error.notFoundHint')} ${t('error.notFoundArchivedHint')}`}
      actions={
        <>
          <Link href="/" className={btnPrimary}>
            {t('error.backHome')}
          </Link>
          <Link href="/settings/archived" className={btnSecondary}>
            {t('error.goToArchived')}
          </Link>
        </>
      }
    />
  );
}
