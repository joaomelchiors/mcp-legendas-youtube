// Tests for TranscriptMarkdown: the content of the saved .md file.
// Title as "#", header as a list, running text, time markers as "## [10% - 02:00]".

import { TranscriptMarkdown } from '../../../src/infra/mcp/transcript-markdown.js';
import type { Transcript } from '../../../src/domain/getTranscript-usecase.js';

const SMALL: Transcript = {
  videoId: 'iG9CE55wbtY',
  title: 'Do schools kill creativity? | Sir Ken Robinson | TED',
  channel: 'TED',
  uploadDate: '2007-01-07',
  durationSeconds: 100,
  language: 'pt-BR',
  kind: 'manual',
  segments: [
    { startSeconds: 0, text: 'Bom dia.' },
    { startSeconds: 5, text: 'Como estão?' },
    { startSeconds: 30, text: 'Existem três temas.' },
    { startSeconds: 95, text: 'Obrigado.' },
  ],
  isOriginalFallback: false,
};

describe('TranscriptMarkdown.format', () => {
  test('the whole file, exactly', () => {
    expect(TranscriptMarkdown.format(SMALL)).toBe(
      [
        '# Do schools kill creativity? | Sir Ken Robinson | TED',
        '',
        '- Canal: TED',
        '- Link: https://www.youtube.com/watch?v=iG9CE55wbtY',
        '- Publicado em: 2007-01-07',
        '- Duração: 01:40',
        '- Legenda: pt-BR, legenda revisada (feita por pessoa)',
        '',
        'Bom dia. Como estão?',
        '',
        '## [10% - 00:10]',
        '',
        '## [25% - 00:25]',
        '',
        'Existem três temas.',
        '',
        '## [50% - 00:50]',
        '',
        '## [75% - 01:15]',
        '',
        '## [90% - 01:30]',
        '',
        'Obrigado.',
        '',
      ].join('\n'),
    );
  });

  test('missing fields are left out of the list', () => {
    const text: string = TranscriptMarkdown.format({ ...SMALL, channel: null, uploadDate: null, durationSeconds: null });
    expect(text).not.toMatch(/^- (Canal|Publicado em|Duração):/m);
    expect(text).toMatch(/^- Link: /m);
  });

  test('automatic caption: "gerada automaticamente" in the list', () => {
    expect(TranscriptMarkdown.format({ ...SMALL, kind: 'automatic' })).toMatch(/^- Legenda: pt-BR, gerada automaticamente/m);
  });

  test('fallback: a quoted warning after the list', () => {
    const text: string = TranscriptMarkdown.format({ ...SMALL, isOriginalFallback: true });
    expect(text).toContain('- Legenda: pt-BR, legenda revisada (feita por pessoa)\n\n> **Aviso:** a tradução pedida não pôde ser obtida');
  });

  test('no segments and no duration: only the title and the list', () => {
    const text: string = TranscriptMarkdown.format({ ...SMALL, segments: [], durationSeconds: null });
    expect(text.endsWith('- Legenda: pt-BR, legenda revisada (feita por pessoa)\n')).toBe(true);
  });

  test('the file ends with exactly one line break', () => {
    const text: string = TranscriptMarkdown.format(SMALL);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});
