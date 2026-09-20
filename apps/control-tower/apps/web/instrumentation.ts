/**
 * Arranque de la web: valida el entorno **una vez**, al levantar el servidor (SECURITY_CHECKLIST §1, ítem 1).
 *
 * Next llama a `register()` al bootstrap de cada instancia del servidor. Es el único sitio donde se puede
 * fallar **pronto y con un mensaje claro** en lugar de dejar la app en pie y rota:
 *
 * Antes, sin `BETTER_AUTH_SECRET` la web **arrancaba igual** —`/api/health` devolvía 200— y sólo reventaba al
 * iniciar sesión, con un `500 Error interno` que no dice nada. Comprobado antes de escribir esto. Ese es el peor
 * modo de fallo: parece que va. Con esta guarda, un despliegue con la variable mal escrita **no arranca** y el
 * log dice exactamente qué falta.
 *
 * Se salta durante `next build`: ahí no hay entorno real (mismo criterio que `requireDatabaseUrl()` en `@ct/db`,
 * que devuelve una URL de mentira en la fase de build).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  // Import dinámico: `instrumentation.ts` también se carga en el runtime edge, donde estos paquetes no van.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { loadWebEnv } = await import('@ct/validation');
  const { logger } = await import('@ct/shared');

  try {
    const env = loadWebEnv();
    logger.info('entorno validado', {
      service: 'control-tower-web',
      nodeEnv: env.NODE_ENV,
      // Nunca el secreto, sólo la constancia de que existe y de que tiene longitud suficiente.
      authSecret: 'presente',
    });
  } catch (error) {
    logger.error('entorno inválido: la web no arranca', {
      service: 'control-tower-web',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
