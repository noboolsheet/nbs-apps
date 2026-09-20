/**
 * Normaliza la identidad externa de una entidad (tabla `external_identities`) al `meta.source`
 * que consume el panel lateral: el origen del dato (Twenty/Notion/…) y su URL para "Abrir en el origen".
 * `NATIVE` = creado en Control Tower (sin origen externo).
 */
export function sourceMeta(identity: { provider: string; metadata: unknown } | null | undefined) {
  const url = (identity?.metadata as { url?: string } | null | undefined)?.url ?? null;
  return { source: { provider: identity?.provider ?? 'NATIVE', url } };
}
