// Tests for TranscriptFormatter:
// a header (title, channel, clean link, date, duration, caption language and quality, fallback warning)
// and the running text with time markers at 10%, 25%, 50%, 75% and 90% of the duration.

import { TranscriptFormatter } from '../../../src/infra/mcp/transcript-formatter.js';
import type { Transcript } from '../../../src/domain/transcript.js';
import { aTranscript, everyFiveSeconds } from '../../support/sampleTranscript.js';

/** One segment every 5 seconds: "s0" at 0s, "s5" at 5s ... up to the given second. */
const BASE: Transcript = aTranscript({ segments: everyFiveSeconds(95) });

function headerOf(text: string): string[] {
  return text.split('\n\n')[0].split('\n');
}

describe('header', () => {
  test('all fields, in order, with the clean link built from the ID', () => {
    expect(headerOf(TranscriptFormatter.format(BASE))).toEqual([
      'Título: Do schools kill creativity? | Sir Ken Robinson | TED',
      'Canal: TED',
      'Link: https://www.youtube.com/watch?v=iG9CE55wbtY',
      'Publicado em: 2007-01-07',
      'Duração: 01:40',
      'Legenda: pt-BR, legenda revisada (feita por pessoa)',
    ]);
  });

  test('automatic caption: "gerada automaticamente", with the warning about errors', () => {
    const header: string[] = headerOf(TranscriptFormatter.format({ ...BASE, language: 'pt-orig', kind: 'automatic' }));
    expect(header).toContain('Legenda: pt-orig, gerada automaticamente (pode conter erros, principalmente em nomes próprios)');
  });

  test('fallback: a warning line that the original language came instead', () => {
    const header: string[] = headerOf(TranscriptFormatter.format({ ...BASE, language: 'en', isOriginalFallback: true }));
    expect(header[header.length - 1]).toBe('Aviso: a tradução pedida não pôde ser obtida; segue a legenda no idioma original do vídeo.');
  });

  test('missing channel, date and duration: their lines are left out, not shown as "unknown"', () => {
    const header: string[] = headerOf(TranscriptFormatter.format({ ...BASE, channel: null, uploadDate: null, durationSeconds: null }));
    expect(header.some((line: string) => /^(Canal|Publicado em|Duração):/.test(line))).toBe(false);
    expect(header).toHaveLength(3);
  });

  test('duration of more than one hour: h:mm:ss', () => {
    expect(headerOf(TranscriptFormatter.format({ ...BASE, durationSeconds: 4000 }))).toContain('Duração: 1:06:40');
  });
});

describe('time markers', () => {
  test('the five markers, in order, each before the first segment that starts at or after its point', () => {
    const text: string = TranscriptFormatter.format(BASE);
    expect(text).toContain('s5\n\n[10% - 00:10]\ns10');
    expect(text).toContain('s20\n\n[25% - 00:25]\ns25');
    expect(text).toContain('s45\n\n[50% - 00:50]\ns50');
    expect(text).toContain('s70\n\n[75% - 01:15]\ns75');
    expect(text).toContain('s85\n\n[90% - 01:30]\ns90');
  });

  test('every segment appears exactly once, in order, and each marker appears once', () => {
    const text: string = TranscriptFormatter.format(BASE);
    const body: string = text.slice(text.indexOf('\n\n') + 2);
    expect(body.replace(/\[\d+% - [\d:]+\]/g, ' ').split(/\s+/).filter(Boolean)).toEqual(BASE.segments.map((s) => s.text));
    for (const marker of ['[10%', '[25%', '[50%', '[75%', '[90%']) expect(body.split(marker)).toHaveLength(2);
  });

  test('the text between markers runs together, separated by spaces', () => {
    expect(TranscriptFormatter.format(BASE)).toContain('s0 s5\n\n[10%');
  });

  test('video of more than one hour: the markers use h:mm:ss', () => {
    const long: Transcript = { ...BASE, durationSeconds: 4000, segments: [{ startSeconds: 0, text: 'a' }, { startSeconds: 3700, text: 'b' }] };
    expect(TranscriptFormatter.format(long)).toContain('[90% - 1:00:00]');
  });

  test('without duration: the points are taken from the start of the last segment', () => {
    const text: string = TranscriptFormatter.format({ ...BASE, durationSeconds: null });
    expect(text).toContain('[50% - 00:47]'); // last segment starts at 95s; 50% is 47.5s
  });

  test('few segments: markers that fall on the same segment come together, in order, none lost', () => {
    const sparse: Transcript = { ...BASE, segments: [{ startSeconds: 0, text: 'início' }, { startSeconds: 95, text: 'fim' }] };
    expect(TranscriptFormatter.format(sparse)).toContain('início\n\n[10% - 00:10]\n[25% - 00:25]\n[50% - 00:50]\n[75% - 01:15]\n[90% - 01:30]\nfim');
  });

  test('caption that ends before the points: the markers go to the end, in order', () => {
    const short: Transcript = { ...BASE, segments: [{ startSeconds: 0, text: 'a' }, { startSeconds: 5, text: 'b' }] };
    expect(TranscriptFormatter.format(short).endsWith('a b\n\n[10% - 00:10]\n[25% - 00:25]\n[50% - 00:50]\n[75% - 01:15]\n[90% - 01:30]')).toBe(true);
  });

  test('no segments and no duration: only the header, no markers', () => {
    const empty: Transcript = { ...BASE, durationSeconds: null, segments: [] };
    expect(TranscriptFormatter.format(empty)).not.toContain('[10%');
  });
});
