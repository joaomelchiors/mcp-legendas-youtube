// Tests for TrackSelection: João's quality rules.
// Pure domain service: it receives what the engine found (VideoInfo) and the requested Language,
// and decides the exact track to download, plus a fallback when the preferred one is a translation.
// Video data comes from consultations of real videos.

import { TrackSelection, type TrackPlan } from '../../src/domain/trackSelection-service.js';
import { Language, VideoInfo, type Track } from '../../src/domain/generics-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

// TED: English talk; human translations; automatic has en-orig and machine translations.
const TED: VideoInfo = new VideoInfo(
  'Do schools kill creativity? | Sir Ken Robinson | TED',
  'en',
  ['af', 'en', 'pt-BR', 'pt-PT', 'es'],
  ['af', 'en-orig', 'en', 'pt', 'pt-BR', 'pt-PT', 'es'],
);

// Video in Portuguese: language pt-BR, no manual, automatic with pt-orig, en-orig (dub?) and translations.
const VIDEO_PT: VideoInfo = new VideoInfo('Vídeo falado em português', 'pt-BR', [], ['en', 'en-orig', 'es', 'pt', 'pt-PT', 'pt-orig']);

// No captions at all.
const NO_CAPTIONS: VideoInfo = new VideoInfo('U2 - City Of Blinding Lights', null, [], []);

// Live stream in progress (NASA): it has one automatic "en", but the caption only exists after it ends.
const LIVE: VideoInfo = new VideoInfo('NASA ao vivo', null, [], ['en'], null, 'NASA', '2026-10-22', true);

const MANUAL = (language: string): Track => ({ language, kind: 'manual' });
const AUTOMATIC = (language: string): Track => ({ language, kind: 'automatic' });

function select(info: VideoInfo, code?: string): Result<TrackPlan> {
  return TrackSelection.select(info, Language.tryCreate(code).instance);
}

function expectPlan(info: VideoInfo, code: string | undefined, preferred: Track, fallback: Track | null = null): void {
  const planReturn: Result<TrackPlan> = select(info, code);
  expect(planReturn.isOk).toBe(true);
  expect(planReturn.instance).toEqual({ preferred, fallback });
}

function expectError(info: VideoInfo, code: string | undefined, error: ErrorCode): Result<TrackPlan> {
  const planReturn: Result<TrackPlan> = select(info, code);
  expect(planReturn.errors).toEqual([error]);
  return planReturn;
}

describe('language given: 1) manual of the language family', () => {
  test('"pt" prefers pt-BR (João\'s preference list)', () => {
    expectPlan(TED, 'pt', MANUAL('pt-BR'));
  });

  test('"pt" without pt-BR: pt-PT', () => {
    expectPlan(new VideoInfo('t', 'en', ['en', 'pt-PT'], ['en-orig']), 'pt', MANUAL('pt-PT'));
  });

  test('"pt" with only the exact manual "pt": pt', () => {
    expectPlan(new VideoInfo('t', 'en', ['en', 'pt'], ['en-orig']), 'pt', MANUAL('pt'));
  });

  test('"pt" with pt-BR and exact "pt": the preference list comes first (pt-BR)', () => {
    expectPlan(new VideoInfo('t', 'en', ['pt', 'pt-BR'], []), 'pt', MANUAL('pt-BR'));
  });

  test('"pt-PT" asked explicitly: pt-PT first, even with pt-BR available', () => {
    expectPlan(TED, 'pt-PT', MANUAL('pt-PT'));
  });

  test('language without preference list ("es"): the exact code first', () => {
    expectPlan(new VideoInfo('t', 'en', ['es-419', 'es'], []), 'es', MANUAL('es'));
  });

  test('language without preference list, no exact code: the first variant that appears', () => {
    expectPlan(new VideoInfo('t', 'en', ['es-419', 'es-ES'], []), 'es', MANUAL('es-419'));
  });

  test('"pt" does not take a language that only starts with the same letters (e.g. "pta")', () => {
    expectError(new VideoInfo('t', 'en', ['pta'], []), 'pt', ErrorCode.NO_CAPTIONS_FOR_LANGUAGE);
  });
});

describe('language given: 2) automatic original of the language', () => {
  test('video in Portuguese, "pt": pt-orig (transcription of the audio, not a translation)', () => {
    expectPlan(VIDEO_PT, 'pt', AUTOMATIC('pt-orig'));
  });

  test('video in Portuguese, "pt-BR": same family, pt-orig', () => {
    expectPlan(VIDEO_PT, 'pt-BR', AUTOMATIC('pt-orig'));
  });

  test('an "-orig" in the requested language is preferred over a translation ("en" on the Portuguese video)', () => {
    expectPlan(VIDEO_PT, 'en', AUTOMATIC('en-orig'));
  });
});

describe('language given: 3) automatic translation, with the original language as fallback', () => {
  test('TED, "es" without manual: translation "es", fallback the original manual "en"', () => {
    const ted: VideoInfo = new VideoInfo(TED.title, 'en', ['en'], ['en-orig', 'es']);
    expectPlan(ted, 'es', AUTOMATIC('es'), MANUAL('en'));
  });

  test('without manual in the original language, the fallback is "<original>-orig"', () => {
    expectPlan(VIDEO_PT, 'es', AUTOMATIC('es'), AUTOMATIC('pt-orig'));
  });

  test('translation, but the original language of the video is unknown: no fallback', () => {
    expectPlan(new VideoInfo('t', null, [], ['es', 'en-orig']), 'es', AUTOMATIC('es'), null);
  });

  test('translation exists but the original language has nothing: no fallback', () => {
    expectPlan(new VideoInfo('t', 'en', [], ['es']), 'es', AUTOMATIC('es'), null);
  });

  test('translation with variant: "pt-PT" asked, only automatic "pt-PT"', () => {
    expectPlan(new VideoInfo('t', 'en', ['en'], ['en-orig', 'pt-PT']), 'pt-PT', AUTOMATIC('pt-PT'), MANUAL('en'));
  });
});

describe('language given: 4) nothing in the language', () => {
  test('NO_CAPTIONS_FOR_LANGUAGE with the available captions', () => {
    const planReturn: Result<TrackPlan> = expectError(TED, 'de', ErrorCode.NO_CAPTIONS_FOR_LANGUAGE);
    expect(planReturn.details).toEqual({ available: { manual: TED.manual, automatic: TED.automatic } });
  });
});

describe('no language: the original language of the video', () => {
  test('TED: the manual in the original language (en)', () => {
    expectPlan(TED, undefined, MANUAL('en'));
  });

  test('video in Portuguese (language pt-BR, no manual): pt-orig, ignoring the en-orig', () => {
    expectPlan(VIDEO_PT, undefined, AUTOMATIC('pt-orig'));
  });

  test('original pt-BR with manual pt-BR: the manual, exact', () => {
    expectPlan(new VideoInfo('t', 'pt-BR', ['pt-BR', 'pt'], ['pt-orig']), undefined, MANUAL('pt-BR'));
  });

  test('original pt-BR with manual only "pt": the manual by the language part', () => {
    expectPlan(new VideoInfo('t', 'pt-BR', ['pt'], ['pt-orig']), undefined, MANUAL('pt'));
  });

  test('original pt-BR and an automatic "pt-BR-orig": the exact one first', () => {
    expectPlan(new VideoInfo('t', 'pt-BR', [], ['pt-orig', 'pt-BR-orig']), undefined, AUTOMATIC('pt-BR-orig'));
  });

  test('original language unknown, a single "-orig": that one', () => {
    expectPlan(new VideoInfo('t', null, [], ['pt-orig', 'en']), undefined, AUTOMATIC('pt-orig'));
  });

  test('original language unknown, two "-orig": NO_CAPTIONS_FOR_LANGUAGE with the list, for the user to choose', () => {
    const info: VideoInfo = new VideoInfo('t', null, [], ['pt-orig', 'en-orig']);
    const planReturn: Result<TrackPlan> = expectError(info, undefined, ErrorCode.NO_CAPTIONS_FOR_LANGUAGE);
    expect(planReturn.details).toEqual({ available: { manual: [], automatic: ['pt-orig', 'en-orig'] } });
  });

  test('original known but nothing in it, while other captions exist: NO_CAPTIONS_FOR_LANGUAGE with the list', () => {
    expectError(new VideoInfo('t', 'en', ['de'], ['de']), undefined, ErrorCode.NO_CAPTIONS_FOR_LANGUAGE);
  });
});

describe('video without any caption', () => {
  test.each([
    ['no language', undefined],
    ['language given', 'pt'],
  ])('%s: NO_CAPTIONS, nothing to offer', (_case: string, code: string | undefined) => {
    expect(expectError(NO_CAPTIONS, code, ErrorCode.NO_CAPTIONS).details).toBeUndefined();
  });
});

describe('live stream in progress', () => {
  test.each([
    ['no language', undefined],
    ['language given, even one that exists in the list', 'en'],
  ])('%s: LIVE_IN_PROGRESS, nothing to offer', (_case: string, code: string | undefined) => {
    expect(expectError(LIVE, code, ErrorCode.LIVE_IN_PROGRESS).details).toBeUndefined();
  });
});
