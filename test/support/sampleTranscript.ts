// A sample Transcript for the tests (the TED video), built in one place.
// Each test changes only what matters to it: aTranscript({ kind: 'automatic' }).
// When Transcript gets a new field, only this file changes.

import type { Transcript, TranscriptSegment } from '../../src/domain/transcript.js';

const TED: Transcript = {
  videoId: 'iG9CE55wbtY',
  title: 'Do schools kill creativity? | Sir Ken Robinson | TED',
  channel: 'TED',
  uploadDate: '2007-01-07',
  durationSeconds: 100,
  language: 'pt-BR',
  kind: 'manual',
  segments: [],
  isOriginalFallback: false,
};

export function aTranscript(changes: Partial<Transcript> = {}): Transcript {
  return { ...TED, ...changes };
}

/** One segment every 5 seconds, from 0 to untilSecond, with the text "s<second>". */
export function everyFiveSeconds(untilSecond: number): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];
  for (let second: number = 0; second <= untilSecond; second += 5) segments.push({ startSeconds: second, text: `s${second}` });
  return segments;
}
