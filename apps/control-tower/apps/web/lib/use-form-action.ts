'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Acción de formulario del cliente: **el estado que acompaña a toda escritura** (ocupado / error / refresco de
 * la vista del servidor), en un solo sitio.
 *
 * Existía copiado **cinco veces** —`useSubmit` en los `forms.tsx` de projects, business, portfolio y knowledge, y
 * `useAction` en `integrations/controls.tsx`— byte a byte igual salvo el mensaje de éxito. Eso significaba que un
 * arreglo (p. ej. dejar de refrescar cuando la petición falla) había que acordarse de hacerlo cinco veces.
 *
 * `run(fn)` ejecuta la escritura, guarda el mensaje si falla y, **sólo si sale bien**, hace `router.refresh()`
 * para que los Server Components vuelvan a leer. Devuelve `true`/`false` para que el llamador decida si limpia
 * el formulario. `okMsg` es opcional: los formularios muestran sólo errores; las acciones de integración muestran
 * también una confirmación («Sincronización encolada»).
 */
export function useFormAction() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(
    fn: () => Promise<{ error?: { message: string } }>,
    okMsg?: string,
  ): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    setIsError(false);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message);
      setIsError(true);
      return false;
    }
    if (okMsg) setMsg(okMsg);
    router.refresh();
    return true;
  }

  return {
    /** Mensaje a mostrar (error o confirmación); `null` si no hay nada que decir. */
    msg,
    /** `true` si `msg` es un error (para pintarlo en `text-danger`). */
    isError,
    /** Sólo el error, o `null` si el mensaje es una confirmación. Atajo para los formularios, que sólo pintan errores. */
    error: isError ? msg : null,
    busy,
    run,
  };
}
