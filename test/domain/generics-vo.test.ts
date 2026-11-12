// Tests for the value objects.
// UrlVideo: which links give the video ID.
// Language: which caption codes are accepted.
// VideoInfo: what the engine tells about the video's captions.
// A value object never throws for bad input: tryCreate returns Result.fail(code).

import { Language, TrackName, UrlVideo, VideoInfo } from '../../src/domain/generics-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

const ID: string = 'OhCXEo3lE4A';

describe('UrlVideo.tryCreate: accepted inputs', () => {
  test.each([
    ['plain ID', ID, ID],
    ['plain ID with spaces around', `  ${ID}\n`, ID],
    ['ID with - and _', 'a-b_c-d_e-f', 'a-b_c-d_e-f'],
    ['watch with www', `https://www.youtube.com/watch?v=${ID}`, ID],
    ['watch without www', `https://youtube.com/watch?v=${ID}`, ID],
    ['watch on mobile (m.)', `https://m.youtube.com/watch?v=${ID}`, ID],
    ['watch with http', `http://www.youtube.com/watch?v=${ID}`, ID],
    ['watch without https://', `www.youtube.com/watch?v=${ID}`, ID],
    ['watch with uppercase host', `https://WWW.YOUTUBE.COM/watch?v=${ID}`, ID],
    ['watch with time', `https://www.youtube.com/watch?v=${ID}&t=42s`, ID],
    ['watch with v after other parameters', `https://www.youtube.com/watch?feature=share&v=${ID}`, ID],
    ['playlist link (playlist ignored)', 'https://www.youtube.com/watch?v=ZhCezZQqxx4&list=PLE-wFs0H2h9E&index=3', 'ZhCezZQqxx4'],
    ['youtu.be', `https://youtu.be/${ID}`, ID],
    ['youtu.be with ?si= from the Share button', `https://youtu.be/${ID}?si=abc123`, ID],
    ['shorts', `https://www.youtube.com/shorts/${ID}`, ID],
    ['shorts with parameter', `https://youtube.com/shorts/${ID}?feature=share`, ID],
    ['embed', `https://www.youtube.com/embed/${ID}`, ID],
    ['embed with parameters', `https://www.youtube.com/embed/${ID}?start=30&autoplay=1`, ID],
  ])('%s', (_case: string, input: string, expectedId: string) => {
    const urlVideoReturn: Result<UrlVideo> = UrlVideo.tryCreate(input);
    expect(urlVideoReturn.isOk).toBe(true);
    expect(urlVideoReturn.instance).toBeInstanceOf(UrlVideo);
    expect(urlVideoReturn.instance.id).toBe(expectedId);
  });
});

describe('UrlVideo.tryCreate: rejected inputs return INVALID_URL, without throwing', () => {
  test.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['ID with 10 characters', 'OhCXEo3lE4'],
    ['ID with 12 characters', 'OhCXEo3lE4AB'],
    ['ID with forbidden character', 'OhCXEo3lE4!'],
    ['any text', 'vídeo do gato'],
    ['another site', `https://vimeo.com/${ID}`],
    ['host imitating YouTube at the end', `https://youtube.com.exemplo.com/watch?v=${ID}`],
    ['host imitating YouTube at the start', `https://falsoyoutube.com/watch?v=${ID}`],
    ['ftp protocol', `ftp://www.youtube.com/watch?v=${ID}`],
    ['javascript:', `javascript:alert('${ID}')`],
    ['watch without v', 'https://www.youtube.com/watch?list=PLE-wFs0H2h9E'],
    ['watch with invalid v', 'https://www.youtube.com/watch?v=curto'],
    ['only the playlist', 'https://www.youtube.com/playlist?list=PLE-wFs0H2h9E'],
    ['channel', 'https://www.youtube.com/@canal'],
    ['youtu.be without ID', 'https://youtu.be/'],
    ['youtu.be with extra path', `https://youtu.be/${ID}/extra`],
    ['shorts without ID', 'https://www.youtube.com/shorts/'],
    ['embed without ID', 'https://www.youtube.com/embed/'],
    ['embed with extra path', `https://www.youtube.com/embed/${ID}/extra`],
  ])('%s', (_case: string, input: string) => {
    expectInvalidUrl(input);
  });
});

describe('UrlVideo.tryCreate: values that are not text (no zod at the door anymore)', () => {
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['number', 123],
    ['object', { url: ID }],
    ['array', [ID]],
  ])('%s returns INVALID_URL, without throwing', (_case: string, input: unknown) => {
    expectInvalidUrl(input);
  });
});

function expectInvalidUrl(input: unknown): void {
  let urlVideoReturn: Result<UrlVideo> | undefined;
  expect(() => {
    urlVideoReturn = UrlVideo.tryCreate(input);
  }).not.toThrow();
  expect(urlVideoReturn!.isFailure).toBe(true);
  expect(urlVideoReturn!.errors).toEqual([ErrorCode.INVALID_URL]);
}

describe('UrlVideo.watchUrl: the one canonical link of the video', () => {
  test.each([
    ['from the plain ID', ID],
    ['from a short link with extra parameters', `https://youtu.be/${ID}?si=abc&t=42`],
    ['from a playlist link', `https://www.youtube.com/watch?v=${ID}&list=PLE-wFs0H2h9E&index=3`],
  ])('%s', (_case: string, input: string) => {
    expect(UrlVideo.tryCreate(input).instance.watchUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  test('watchUrlOf gives the same link for an ID kept as text (e.g. the videoId of a Transcript)', () => {
    expect(UrlVideo.watchUrlOf(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

// ---------------------------------------------------------------------------
// Language
// Empty (undefined, null, '' or spaces) means "the original language of the video".
// Otherwise: exactly ONE language code (2 or 3 letters, optional variant). Never "all", never a list.
// ---------------------------------------------------------------------------

describe('Language.tryCreate: no language given means the original', () => {
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['empty text', ''],
    ['only spaces', '   '],
  ])('%s', (_case: string, input: unknown) => {
    const languageReturn: Result<Language> = Language.tryCreate(input);
    expect(languageReturn.isOk).toBe(true);
    expect(languageReturn.instance.isOriginal).toBe(true);
    expect(languageReturn.instance.code).toBeNull();
  });
});

describe('Language.tryCreate: accepted codes (real list of the TED video)', () => {
  test.each([
    ['pt', 'pt'],
    ['en', 'en'],
    ['fil', 'fil'],
    ['ckb', 'ckb'],
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'pt-PT'],
    ['fr-CA', 'fr-CA'],
    ['zh-TW', 'zh-TW'],
    ['zh-Hans', 'zh-Hans'],
    ['es-419', 'es-419'], // Latin American Spanish: numeric variant
    [' pt ', 'pt'],
  ])('"%s" becomes "%s"', (input: string, code: string) => {
    const languageReturn: Result<Language> = Language.tryCreate(input);
    expect(languageReturn.isOk).toBe(true);
    expect(languageReturn.instance.isOriginal).toBe(false);
    expect(languageReturn.instance.code).toBe(code);
  });

  test.each([
    ['PT', 'pt'],
    ['pt-br', 'pt-BR'],
    ['ZH-hans', 'zh-Hans'],
  ])('normalizes letter case: "%s" becomes "%s"', (input: string, code: string) => {
    expect(Language.tryCreate(input).instance.code).toBe(code);
  });
});

describe('Language.tryCreate: rejected inputs return INVALID_LANGUAGE, without throwing', () => {
  test.each([
    ['all (would download every subtitle)', 'all'],
    ['ALL in uppercase', 'ALL'],
    ['all with a variant ("all" is not a language)', 'all-BR'],
    ['list', 'pt,en'],
    ['list with space', 'pt, en'],
    ['pattern', '.*'],
    ['yt-dlp option', '--exec'],
    ['-orig suffix (choosing it is our rule)', 'en-orig'],
    ['"original" is not a code', 'original'],
    ['full name (the LLM must send the code)', 'português'],
    ['full name in English', 'portuguese'],
    ['one letter', 'p'],
    ['four letters', 'port'],
    ['number in the language', 'p1'],
    ['variant too long', 'pt-abcdefghi'],
    ['two variants', 'zh-Hans-CN'],
    ['space in the middle', 'pt BR'],
    ['underscore', 'pt_BR'],
  ])('%s', (_case: string, input: string) => {
    expectInvalidLanguage(input);
  });

  test.each([
    ['number', 5],
    ['object', { code: 'pt' }],
    ['array', ['pt']],
    ['boolean', true],
  ])('value that is not text: %s', (_case: string, input: unknown) => {
    expectInvalidLanguage(input);
  });
});

function expectInvalidLanguage(input: unknown): void {
  let languageReturn: Result<Language> | undefined;
  expect(() => {
    languageReturn = Language.tryCreate(input);
  }).not.toThrow();
  expect(languageReturn!.isFailure).toBe(true);
  expect(languageReturn!.errors).toEqual([ErrorCode.INVALID_LANGUAGE]);
}

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
