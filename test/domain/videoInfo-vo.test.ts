// Tests for VideoInfo: what the engine tells about the video's captions.

import { VideoInfo } from '../../src/domain/videoInfo-vo.js';

// ---------------------------------------------------------------------------
// VideoInfo
// Built by the engine from what it found. Only asked when the requested language is missing,
// to tell the user what exists.
// ---------------------------------------------------------------------------

describe('VideoInfo', () => {
  const ted: VideoInfo = new VideoInfo('Do schools kill creativity? | Sir Ken Robinson | TED', 'en', ['en', 'pt-BR'], ['en-orig', 'pt']);

  test('keeps what the engine reported', () => {
    expect(ted.title).toBe('Do schools kill creativity? | Sir Ken Robinson | TED');
    expect(ted.originalLanguage).toBe('en');
    expect(ted.manual).toEqual(['en', 'pt-BR']);
    expect(ted.automatic).toEqual(['en-orig', 'pt']);
  });

  test('keeps duration (seconds), channel and publication date, from the same consultation', () => {
    const info: VideoInfo = new VideoInfo('TED talk', 'en', ['en'], ['en-orig'], 1203, 'TED', '2007-01-06');
    expect(info.durationSeconds).toBe(1203);
    expect(info.channel).toBe('TED');
    expect(info.uploadDate).toBe('2007-01-06');
  });

  test('duration, channel and date are optional: null when the engine does not report them', () => {
    const info: VideoInfo = new VideoInfo('t', 'en', [], []);
    expect(info.durationSeconds).toBeNull();
    expect(info.channel).toBeNull();
    expect(info.uploadDate).toBeNull();
  });

  test('the original language may be unknown', () => {
    expect(new VideoInfo('Me at the zoo', null, ['en', 'de'], ['de', 'en']).originalLanguage).toBeNull();
  });

  test.each([
    ['manual and automatic', ['en'], ['en-orig'], true],
    ['only manual', ['en'], [], true],
    ['only automatic', [], ['pt-orig'], true],
    ['none', [], [], false],
  ])('hasCaptions: %s', (_case: string, manual: string[], automatic: string[], expected: boolean) => {
    expect(new VideoInfo('video', null, manual, automatic).hasCaptions).toBe(expected);
  });

  test('available gives both lists, to be offered to the user', () => {
    expect(ted.available).toEqual({ manual: ['en', 'pt-BR'], automatic: ['en-orig', 'pt'] });
  });
});
