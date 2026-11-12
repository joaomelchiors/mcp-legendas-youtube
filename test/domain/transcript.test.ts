// Tests for TrackName, the rule of YouTube's track names.

import { TrackName } from '../../src/domain/transcript.js';

// ---------------------------------------------------------------------------
// TrackName
// YouTube names the automatic transcription of the audio "<language>-orig" ("en-orig", "pt-BR-orig").
// The other automatic names ("pt", "es") are machine translations.
// ---------------------------------------------------------------------------

describe('TrackName', () => {
  test.each([
    ['en-orig', true],
    ['pt-BR-orig', true],
    ['en', false],
    ['pt-BR', false],
    ['orig', false],
  ])('isOriginal("%s") is %s', (name: string, expected: boolean) => {
    expect(TrackName.isOriginal(name)).toBe(expected);
  });

  test.each([
    ['pt', 'pt-orig'],
    ['pt-BR', 'pt-BR-orig'],
  ])('originalOf("%s") is "%s"', (language: string, expected: string) => {
    expect(TrackName.originalOf(language)).toBe(expected);
  });
});
