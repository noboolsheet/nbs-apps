import { getDb } from '@ct/db';
import { listIdentitiesByInternalType } from '@ct/application';
import type { OrgContext } from '@ct/application';

/**
 * Mapa `knowledge_item.id → URL de su página en Notion`, leído de `external_identities` (el sync guarda la url de
 * la página en `metadata.url` al crearla o importarla). Lo usan la Biblioteca y Procesos (SOP) para ofrecer el
 * salto a Notion, que es donde vive el cuerpo del documento.
 */
export async function notionUrlsByKnowledgeItem(org: OrgContext): Promise<Map<string, string>> {
  const identities = await listIdentitiesByInternalType(getDb(), org, 'knowledge_item');
  const map = new Map<string, string>();
  for (const i of identities) {
    const url = (i.metadata as { url?: string } | null)?.url;
    if (i.provider === 'NOTION' && url) map.set(i.internalId, url);
  }
  return map;
}
