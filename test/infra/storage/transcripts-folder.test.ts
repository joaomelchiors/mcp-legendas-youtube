// Tests for TranscriptsFolder: where the transcripts are saved.
// LEGENDAS_DIR, otherwise "legendas/" inside the folder where the MCP started.

import { join } from 'node:path';
import { TranscriptsFolder } from '../../../src/infra/storage/transcripts-folder.js';

describe('TranscriptsFolder.from', () => {
  test('without LEGENDAS_DIR: "legendas" inside the folder where the MCP started', () => {
    expect(TranscriptsFolder.from({}, 'C:/Projetos/eng-reversa')).toBe(join('C:/Projetos/eng-reversa', 'legendas'));
  });

  test('LEGENDAS_DIR empty or only spaces counts as not set', () => {
    expect(TranscriptsFolder.from({ LEGENDAS_DIR: '  ' }, 'C:/Projetos/eng-reversa')).toBe(join('C:/Projetos/eng-reversa', 'legendas'));
  });

  test('LEGENDAS_DIR set: that folder, without spaces around', () => {
    expect(TranscriptsFolder.from({ LEGENDAS_DIR: ' D:/Notas/Legendas ' }, 'C:/qualquer')).toBe('D:/Notas/Legendas');
  });

  test('by default it uses the real folder where the process started', () => {
    expect(TranscriptsFolder.from({})).toBe(join(process.cwd(), 'legendas'));
  });
});
