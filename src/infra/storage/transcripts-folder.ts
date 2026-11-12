// Where the transcripts are saved: LEGENDAS_DIR, otherwise "legendas/" inside the folder where the MCP started.

import { join } from 'node:path';
import type { Environment } from '../environment.js';

export class TranscriptsFolder {
  private static readonly VARIABLE: string = 'LEGENDAS_DIR';
  private static readonly DEFAULT_FOLDER: string = 'legendas';

  static from(environment: Environment, startFolder: string = process.cwd()): string {
    const configured: string = (environment[TranscriptsFolder.VARIABLE] ?? '').trim();
    return configured !== '' ? configured : join(startFolder, TranscriptsFolder.DEFAULT_FOLDER);
  }
}
