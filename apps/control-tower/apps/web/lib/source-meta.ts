/**
 * Normaliza la identidad externa de una entidad (tabla `external_identities`) al `meta.source`
 * que consume el panel lateral: el origen del dato (Twenty/Notion/…) y su URL para "Abrir en el origen".
 * `NATIVE` = creado en Control Tower (sin origen externo).
 */
export function sourceMeta(identity: { provider: string; metadata: unknown } | null | undefined) {
  const url = (identity?.metadata as { url?: string } | null | undefined)?.url ?? null;
  return { source: { provider: identity?.provider ?? 'NATIVE', url } };
}

/**
 * Espejos del registro: los sistemas externos donde ese mismo registro **también** vive, con su URL. Distinto del
 * `source`: un proyecto es nativo de CT (`source` = NATIVE) y a la vez tiene página en Notion, y ese enlace es el
 * que el panel ofrece («Abrir en Notion ↗») justo encima del bloque de contexto.
 *
 * Se descartan las identidades sin `metadata.url`: un enlace sin destino no se pinta.
 */
export function mirrorMeta(identities: { provider: string; metadata: unknown }[] | null | undefined) {
  const mirrors = (identities ?? [])
    .map((i) => ({ provider: i.provider, url: (i.metadata as { url?: string } | null)?.url ?? null }))
    .filter((m): m is { provider: string; url: string } => !!m.url);
  return { mirrors };
}
