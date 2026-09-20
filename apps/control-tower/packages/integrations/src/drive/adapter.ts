import type { DocumentSourceAdapter, HealthResult, DrivePullResult } from '../types';
import type { DriveDataSource } from './client';
import { mapDriveFile } from './mapper';

/** Adapter de Google Drive: pull de archivos → referencias (se reflejan como Documents). */
export class DriveAdapter implements DocumentSourceAdapter {
  readonly provider = 'GDRIVE';
  constructor(private readonly source: DriveDataSource) {}

  async healthCheck(): Promise<HealthResult> {
    try {
      const ok = await this.source.ping();
      return ok ? { status: 'HEALTHY' } : { status: 'ERROR', message: 'ping failed' };
    } catch (e) {
      return { status: 'ERROR', message: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  async pull(): Promise<DrivePullResult> {
    const files = await this.source.files();
    return { files: files.map(mapDriveFile) };
  }
}
