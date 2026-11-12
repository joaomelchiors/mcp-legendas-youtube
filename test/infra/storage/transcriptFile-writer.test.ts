// Tests for TranscriptFileWriter: saves the transcript file.
// Folder: LEGENDAS_DIR, otherwise "legendas/" inside the folder where the MCP started.
// Real files, in temporary folders removed at the end. A failure becomes an error code, never an exception.

import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TranscriptFileWriter } from '../../../src/infra/storage/transcriptFile-writer.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

let sandbox: string;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'mcp-legendas-teste-'));
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

describe('TranscriptFileWriter.folderFrom', () => {
  test('without LEGENDAS_DIR: "legendas" inside the folder where the MCP started', () => {
    expect(TranscriptFileWriter.folderFrom({}, 'C:/Projetos/eng-reversa')).toBe(join('C:/Projetos/eng-reversa', 'legendas'));
  });

  test('LEGENDAS_DIR empty or only spaces counts as not set', () => {
    expect(TranscriptFileWriter.folderFrom({ LEGENDAS_DIR: '  ' }, 'C:/Projetos/eng-reversa')).toBe(join('C:/Projetos/eng-reversa', 'legendas'));
  });

  test('LEGENDAS_DIR set: that folder, without spaces around', () => {
    expect(TranscriptFileWriter.folderFrom({ LEGENDAS_DIR: ' D:/Notas/Legendas ' }, 'C:/qualquer')).toBe('D:/Notas/Legendas');
  });

  test('by default it uses the real folder where the process started', () => {
    expect(TranscriptFileWriter.folderFrom({})).toBe(join(process.cwd(), 'legendas'));
  });
});

describe('TranscriptFileWriter.save', () => {
  test('keeps the folder it will use, for the startup log', () => {
    expect(new TranscriptFileWriter(join(sandbox, 'legendas')).folder).toBe(join(sandbox, 'legendas'));
  });

  test('creates the folder when it does not exist (even nested) and returns the full path of the file', async () => {
    const folder: string = join(sandbox, 'nao', 'existe', 'legendas');
    const savedReturn: Result<string> = await new TranscriptFileWriter(folder).save('2007-01-07_ted_pt-BR_iG9CE55wbtY.md', '# TED\n');
    expect(savedReturn.instance).toBe(join(folder, '2007-01-07_ted_pt-BR_iG9CE55wbtY.md'));
    expect(existsSync(savedReturn.instance)).toBe(true);
  });

  test('writes the exact content in UTF-8, accents included', async () => {
    const content: string = '# Você ainda usa o Claude\n\n- Legenda: pt-orig, gerada automaticamente\n\nAção, coração, pão. 360°\n';
    const savedReturn: Result<string> = await new TranscriptFileWriter(sandbox).save('a.md', content);
    expect(readFileSync(savedReturn.instance, 'utf-8')).toBe(content);
  });

  test('saving again with the same name replaces the file (no duplicates)', async () => {
    const writer: TranscriptFileWriter = new TranscriptFileWriter(sandbox);
    await writer.save('a.md', 'primeira versão\n');
    const savedReturn: Result<string> = await writer.save('a.md', 'segunda versão\n');
    expect(readFileSync(savedReturn.instance, 'utf-8')).toBe('segunda versão\n');
  });

  test('when the folder cannot be created (its path is a file): FILE_WRITE_FAILED with the cause, no exception', async () => {
    const notAFolder: string = join(sandbox, 'sou-um-arquivo');
    writeFileSync(notAFolder, 'x');
    let savedReturn: Result<string> | undefined;
    await expect(
      (async () => {
        savedReturn = await new TranscriptFileWriter(join(notAFolder, 'legendas')).save('a.md', 'conteúdo\n');
      })(),
    ).resolves.toBeUndefined();
    expect(savedReturn!.errors).toEqual([ErrorCode.FILE_WRITE_FAILED]);
    // The cause is the system error (e.g. ENOTDIR, EEXIST). Not checked with instanceof Error: Jest runs each
    // test file in its own context, and errors created inside Node come with another copy of the Error class.
    expect((savedReturn!.cause as { code?: string }).code).toMatch(/^E[A-Z]+$/);
  });
});

describe('TranscriptFileWriter.save only writes inside its folder (defense in depth)', () => {
  test.each([
    ['going up a folder', '../fora.md'],
    ['going up with a Windows separator', '..\\fora.md'],
    ['a subfolder', 'sub/a.md'],
    ['an absolute path', join(tmpdir(), 'fora.md')],
    ['the folder itself', '.'],
    ['the parent folder', '..'],
    ['an empty name', ''],
  ])('%s: refused with FILE_WRITE_FAILED and the reason, nothing written', async (_case: string, fileName: string) => {
    const folder: string = join(sandbox, 'legendas');
    const savedReturn: Result<string> = await new TranscriptFileWriter(folder).save(fileName, 'x');
    expect(savedReturn.errors).toEqual([ErrorCode.FILE_WRITE_FAILED]);
    expect(String(savedReturn.cause)).toMatch(/nome de arquivo recusado/);
    expect(existsSync(join(sandbox, 'fora.md'))).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  test('a plain name made by TranscriptFileName is still accepted', async () => {
    const savedReturn: Result<string> = await new TranscriptFileWriter(sandbox).save('2007-01-07_ted_pt-BR_iG9CE55wbtY.md', 'x');
    expect(savedReturn.isOk).toBe(true);
  });
});
