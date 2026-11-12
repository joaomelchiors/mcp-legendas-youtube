// Tests for VttReader: turns the VTT file delivered by yt-dlp into segments with time.
// VTT is the engine's file format, so reading it is infra; the domain only sees segments.
// Real fixtures: test/fixtures/vtt/ (origin in ORIGEM.md). Synthetic cases cover what they lack.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VttReader } from '../../../src/infra/engine/vtt-reader.js';
import type { TranscriptSegment } from '../../../src/domain/generics-vo.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

function fixture(name: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', 'vtt', name), 'utf-8');
}

function read(vtt: string): TranscriptSegment[] {
  const segmentsReturn: Result<TranscriptSegment[]> = VttReader.read(vtt);
  expect(segmentsReturn.isOk).toBe(true);
  return segmentsReturn.instance;
}

describe('real captions: what every reading must guarantee', () => {
  test.each([
    ['ted-manual-en.vtt'],
    ['ted-manual-pt-BR.vtt'],
    ['ted-automatic-en-orig.vtt'],
    ['video-pt-automatic-pt.vtt'],
  ])('%s: text without tags or timings, no repeated line in a row, times in order', (name: string) => {
    const segments: TranscriptSegment[] = read(fixture(name));
    expect(segments.length).toBeGreaterThan(100);
    for (let i: number = 0; i < segments.length; i++) {
      expect(segments[i].text).not.toMatch(/<|-->|^\s|\s$/);
      expect(segments[i].text.length).toBeGreaterThan(0);
      if (i > 0) {
        expect(segments[i].text).not.toBe(segments[i - 1].text);
        expect(segments[i].startSeconds).toBeGreaterThanOrEqual(segments[i - 1].startSeconds);
      }
    }
  });
});

describe('real manual caption (TED, en)', () => {
  test('one segment per cue, with the cue start time', () => {
    expect(read(fixture('ted-manual-en.vtt')).slice(0, 3)).toEqual([
      { startSeconds: 27.103, text: 'Good morning. How are you?' },
      { startSeconds: 29.702, text: '(Audience) Good.' },
      { startSeconds: 31.129, text: "It's been great, hasn't it?" },
    ]);
  });

  test('human translation (pt-BR): a two-line cue gives two segments with the same time', () => {
    expect(read(fixture('ted-manual-pt-BR.vtt')).slice(0, 2)).toEqual([
      { startSeconds: 0, text: 'Tradutor: Renan Botelho' },
      { startSeconds: 0, text: 'Revisor: Belucio Haibara' },
    ]);
  });
});

describe('real automatic caption (rolling lines and word-by-word tags)', () => {
  test('TED en-orig: each line once, at the time it first appears', () => {
    expect(read(fixture('ted-automatic-en-orig.vtt')).slice(0, 4)).toEqual([
      { startSeconds: 6.26, text: '[Music]' },
      { startSeconds: 26.56, text: 'good morning' },
      { startSeconds: 28.4, text: "how are you it's been great hasn't it" },
      { startSeconds: 32.96, text: "it's been i've been blown away by the" },
    ]);
  });

  test('video in Portuguese: the word-by-word line becomes plain text', () => {
    const first: TranscriptSegment = read(fixture('video-pt-automatic-pt.vtt'))[0];
    expect(first.startSeconds).toBe(0.1);
    expect(first.text).toMatch(/^Um dos engenheiros de IA mais/);
  });
});

describe('synthetic cases', () => {
  test('times with hours and without hours', () => {
    const vtt: string = 'WEBVTT\n\n01:02:03.500 --> 01:02:05.000\nlong video\n\n02:03.250 --> 02:04.000\nno hours\n';
    expect(read(vtt)).toEqual([
      { startSeconds: 3723.5, text: 'long video' },
      { startSeconds: 123.25, text: 'no hours' },
    ]);
  });

  test('cue identifiers, NOTE and STYLE blocks are not text', () => {
    const vtt: string = 'WEBVTT\n\nNOTE a comment\n\nSTYLE\n::cue { color: red }\n\n1\n00:00:01.000 --> 00:00:02.000\nhello\n';
    expect(read(vtt)).toEqual([{ startSeconds: 1, text: 'hello' }]);
  });

  test('entities are decoded after removing the tags', () => {
    const vtt: string = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTom &amp; Jerry &lt;3 &quot;hi&quot;&nbsp;there\n';
    expect(read(vtt)[0].text).toBe('Tom & Jerry <3 "hi" there');
  });

  test('Windows line breaks, byte order mark, extra spaces and blank lines', () => {
    const vtt: string = '﻿WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\n   two    spaces  \r\n \r\n';
    expect(read(vtt)).toEqual([{ startSeconds: 1, text: 'two spaces' }]);
  });

  test.each([
    ['empty text', ''],
    ['no WEBVTT header', '00:00:01.000 --> 00:00:02.000\nhello\n'],
    ['header only, no cue', 'WEBVTT\nKind: captions\n'],
    ['cues without any text', 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n \n'],
  ])('%s: VTT_PARSE', (_case: string, vtt: string) => {
    expect(VttReader.read(vtt).errors).toEqual([ErrorCode.VTT_PARSE]);
  });
});
