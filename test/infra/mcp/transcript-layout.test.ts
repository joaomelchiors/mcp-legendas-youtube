// Tests for TranscriptLayout: WHAT goes in a transcript, shared by the two formats
// (the text of the response and the Markdown file). Each format only decides HOW to write it.

import { TranscriptLayout, type LayoutBlock, type HeaderField } from '../../../src/infra/mcp/transcript-layout.js';
import type { Transcript } from '../../../src/domain/getTranscript-usecase.js';
import type { TranscriptSegment } from '../../../src/domain/generics-vo.js';

function everyFiveSeconds(untilSecond: number): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (let second: number = 0; second <= untilSecond; second += 5) segments.push({ startSeconds: second, text: `s${second}` });
  return segments;
}

const BASE: Transcript = {
  videoId: 'iG9CE55wbtY',
  title: 'Do schools kill creativity? | Sir Ken Robinson | TED',
  channel: 'TED',
  uploadDate: '2007-01-07',
  durationSeconds: 100,
  language: 'pt-BR',
  kind: 'manual',
  segments: everyFiveSeconds(95),
  isOriginalFallback: false,
};

describe('headerFields', () => {
  test('all known fields, in order, without the title', () => {
    expect(TranscriptLayout.headerFields(BASE)).toEqual<HeaderField[]>([
      { label: 'Canal', value: 'TED' },
      { label: 'Link', value: 'https://www.youtube.com/watch?v=iG9CE55wbtY' },
      { label: 'Publicado em', value: '2007-01-07' },
      { label: 'Duração', value: '01:40' },
      { label: 'Legenda', value: 'pt-BR, legenda revisada (feita por pessoa)' },
    ]);
  });

  test('unknown channel, date and duration are left out', () => {
    const labels: string[] = TranscriptLayout.headerFields({ ...BASE, channel: null, uploadDate: null, durationSeconds: null }).map(
      (field: HeaderField) => field.label,
    );
    expect(labels).toEqual(['Link', 'Legenda']);
  });

  test('automatic caption: the quality warns about errors', () => {
    const caption: HeaderField = TranscriptLayout.headerFields({ ...BASE, kind: 'automatic' }).find((f: HeaderField) => f.label === 'Legenda')!;
    expect(caption.value).toBe('pt-BR, gerada automaticamente (pode conter erros, principalmente em nomes próprios)');
  });
});

describe('fallbackWarning', () => {
  test('the sentence for the fallback, without any prefix (each format adds its own)', () => {
    expect(TranscriptLayout.FALLBACK_WARNING).toBe('a tradução pedida não pôde ser obtida; segue a legenda no idioma original do vídeo.');
  });
});

describe('blocks: running text, opened by the markers that fall on it', () => {
  test('the first block has no marker; each marker opens the block of the first segment at or after its point', () => {
    const blocks: LayoutBlock[] = TranscriptLayout.blocks(BASE);
    expect(blocks[0]).toEqual({ markers: [], text: 's0 s5' });
    expect(blocks[1]).toEqual({ markers: ['10% - 00:10'], text: 's10 s15 s20' });
    expect(blocks.map((block: LayoutBlock) => block.markers)).toEqual([
      [],
      ['10% - 00:10'],
      ['25% - 00:25'],
      ['50% - 00:50'],
      ['75% - 01:15'],
      ['90% - 01:30'],
    ]);
  });

  test('markers after the last segment form a last block without text', () => {
    const short: Transcript = { ...BASE, segments: [{ startSeconds: 0, text: 'a' }] };
    expect(TranscriptLayout.blocks(short)).toEqual([
      { markers: [], text: 'a' },
      { markers: ['10% - 00:10', '25% - 00:25', '50% - 00:50', '75% - 01:15', '90% - 01:30'], text: '' },
    ]);
  });

  test('no segments and no duration: no blocks', () => {
    expect(TranscriptLayout.blocks({ ...BASE, segments: [], durationSeconds: null })).toEqual([]);
  });
});

describe('time', () => {
  test.each([
    [0, '00:00'],
    [100, '01:40'],
    [1203, '20:03'],
    [3600, '1:00:00'],
    [4000, '1:06:40'],
    [59.9, '00:59'],
  ])('%s seconds: %s', (seconds: number, expected: string) => {
    expect(TranscriptLayout.time(seconds)).toBe(expected);
  });
});
