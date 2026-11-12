// Tests for Language: which caption codes are accepted.
// A value object never throws for bad input: tryCreate returns Result.fail(code).

import { Language } from '../../src/domain/language-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

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
