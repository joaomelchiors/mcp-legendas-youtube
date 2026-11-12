// Tests for TranscriptFileName: the standard name of the saved file,
// "publicationDate_title_language_ID.md". Title without accents, lowercase, hyphens, at most 60 letters.

import { TranscriptFileName } from '../../../src/infra/storage/transcriptFile-name.js';
import type { Transcript } from '../../../src/domain/transcript.js';
import { aTranscript } from '../../support/sampleTranscript.js';

const TED: Transcript = aTranscript({ durationSeconds: 1203 });

function nameFor(changes: Partial<Transcript>): string {
  return TranscriptFileName.for({ ...TED, ...changes });
}

describe('real videos', () => {
  test('TED in pt-BR', () => {
    expect(nameFor({})).toBe('2007-01-07_do-schools-kill-creativity-sir-ken-robinson-ted_pt-BR_iG9CE55wbtY.md');
  });

  test('the video in Portuguese, automatic original caption', () => {
    expect(
      nameFor({ videoId: 'OhCXEo3lE4A', title: 'Você ainda usa o Claude do jeito antigo (Claude 2.0)', uploadDate: '2026-11-07', language: 'pt-orig' }),
    ).toBe('2026-11-07_voce-ainda-usa-o-claude-do-jeito-antigo-claude-2-0_pt-orig_OhCXEo3lE4A.md');
  });

  test('the U2 clip, whose title has a broken character (\\ufffd)', () => {
    expect(nameFor({ videoId: 'ZhCezZQqxx4', title: 'U2 - City Of Blinding Lights (U2 360�)', uploadDate: '2009-11-12', language: 'en' })).toBe(
      '2009-11-12_u2-city-of-blinding-lights-u2-360_en_ZhCezZQqxx4.md',
    );
  });
});

describe('title', () => {
  test('accents and cedilla become plain letters', () => {
    expect(nameFor({ title: 'Ação, Coração & Pão Ñandú' })).toContain('_acao-coracao-pao-nandu_');
  });

  test('characters forbidden in Windows file names are removed', () => {
    expect(nameFor({ title: 'a<b>c:d"e/f\\g|h?i*j' })).toContain('_a-b-c-d-e-f-g-h-i-j_');
  });

  test('spaces, symbols and repeated separators become a single hyphen, none at the ends', () => {
    expect(nameFor({ title: '  --Olá,   mundo!!!  --  ' })).toContain('_ola-mundo_');
  });

  test('a long title is cut at 60 letters, without a hyphen left at the end', () => {
    const name: string = nameFor({ title: 'palavra '.repeat(20) });
    const slug: string = name.split('_')[1];
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
    expect(slug.startsWith('palavra-palavra')).toBe(true);
  });

  test('a single word longer than 60 letters, with no hyphen to cut at: cut at exactly 60', () => {
    expect(nameFor({ title: 'a'.repeat(80) }).split('_')[1]).toBe('a'.repeat(60));
  });

  test.each([
    ['empty', ''],
    ['only symbols', '!!! ??? ***'],
    ['only characters without a Latin form', '日本語のタイトル'],
  ])('title %s: "sem-titulo"', (_case: string, title: string) => {
    expect(nameFor({ title })).toBe('2007-01-07_sem-titulo_pt-BR_iG9CE55wbtY.md');
  });
});

describe('other parts', () => {
  test('without publication date: "sem-data"', () => {
    expect(nameFor({ uploadDate: null })).toBe('sem-data_do-schools-kill-creativity-sir-ken-robinson-ted_pt-BR_iG9CE55wbtY.md');
  });

  test('the language keeps its case and variant (pt-BR, en-orig)', () => {
    expect(nameFor({ language: 'en-orig' })).toContain('_en-orig_');
  });

  test('the whole name only has letters, digits, "-", "_" and the ".md" extension', () => {
    const names: string[] = [nameFor({}), nameFor({ title: 'a<b>c:d"e/f\\g|h?i*j ção ✓ 日本' }), nameFor({ uploadDate: null, title: '' })];
    for (const name of names) expect(name).toMatch(/^[A-Za-z0-9_-]+\.md$/);
  });
});
