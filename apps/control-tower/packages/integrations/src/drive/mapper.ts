import type { DriveRawFile } from './client';
import type { NormalizedDriveFile } from '../types';

/** Mapea un archivo crudo de Drive a una referencia normalizada (metadata + URL). Defensivo. */
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

export function mapDriveFile(raw: DriveRawFile): NormalizedDriveFile {
  return {
    externalId: raw.id,
    name: str(raw.name) ?? '(archivo sin nombre)',
    mimeType: str(raw.mimeType),
    url: str(raw.webViewLink),
  };
}
