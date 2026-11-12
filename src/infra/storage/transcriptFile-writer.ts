// Saves the transcript file.
// It receives the name (TranscriptFileName) and the content (TranscriptMarkdown) ready; it only writes.
// Folder: LEGENDAS_DIR, otherwise "legendas/" inside the folder where the MCP started.
// Creates the folder when missing, writes UTF-8, replaces a file with the same name.
// A failure becomes FILE_WRITE_FAILED (with the exception kept as cause for the log), never an exception.
// It only writes INSIDE its folder. A name that is not a plain file name ("..", "/", "\",
// a drive or an absolute path) is refused, even though TranscriptFileName never makes one (defense in depth).

import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';
import type { Environment } from '../environment.js';

export class TranscriptFileWriter {
  private static readonly VARIABLE: string = 'LEGENDAS_DIR';
  private static readonly DEFAULT_FOLDER: string = 'legendas';

  /** The folder to use: LEGENDAS_DIR, otherwise "legendas" inside the folder where the process started. */
  static folderFrom(environment: Environment, startFolder: string = process.cwd()): string {
    const configured: string = (environment[TranscriptFileWriter.VARIABLE] ?? '').trim();
    return configured !== '' ? configured : join(startFolder, TranscriptFileWriter.DEFAULT_FOLDER);
  }

  constructor(readonly folder: string) {}

  /** Writes the file and returns its full path. */
  async save(fileName: string, content: string): Promise<Result<string>> {
    if (!TranscriptFileWriter.isPlainName(fileName)) {
      return Result.failWithCause<string>(ErrorCode.FILE_WRITE_FAILED, `nome de arquivo recusado: ${JSON.stringify(fileName)}`);
    }
    const path: string = join(this.folder, fileName);
    try {
      await mkdir(this.folder, { recursive: true });
      await writeFile(path, content, 'utf-8');
      return Result.ok<string>(path);
    } catch (error: unknown) {
      return Result.failWithCause<string>(ErrorCode.FILE_WRITE_FAILED, error);
    }
  }

  /** Only a file name: not empty, not "." or "..", no separator of any system, nothing that basename would cut. */
  private static isPlainName(name: string): boolean {
    const isSpecial: boolean = name === '' || name === '.' || name === '..';
    const hasSeparator: boolean = name.includes('/') || name.includes('\\');
    return !isSpecial && !hasSeparator && basename(name) === name;
  }
}
