// Tests for YtDlpArgumentsBuilder: the exact argument list for each yt-dlp run.
// Rules learned from real tests of yt-dlp: manual OR automatic, never both;
// one exact track name, never a list or a pattern; "--" before the URL.

import { YtDlpArgumentsBuilder } from '../../../src/infra/engine/ytDlpArguments-builder.js';
import { UrlVideo, type Track } from '../../../src/domain/generics-vo.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

const VIDEO: UrlVideo = UrlVideo.tryCreate('https://www.youtube.com/watch?v=iG9CE55wbtY&list=PLE-wFs0H2h9E&index=3').instance;
const CLEAN_URL: string = 'https://www.youtube.com/watch?v=iG9CE55wbtY';
const COMMON: string[] = ['--ignore-config', '--no-cache-dir', '--encoding', 'utf-8', '--skip-download'];

function download(track: Track): Result<string[]> {
  return YtDlpArgumentsBuilder.download(VIDEO, track, 'C:/tmp/legenda');
}

describe('videoInfo (the consultation, -J)', () => {
  test('exact list: common options, -J, "--" and the clean URL built from the ID (no playlist)', () => {
    expect(YtDlpArgumentsBuilder.videoInfo(VIDEO)).toEqual([...COMMON, '-J', '--', CLEAN_URL]);
  });
});

describe('download (one exact track)', () => {
  test('manual: --write-subs with the exact name, vtt, output template, "--" and the URL last', () => {
    expect(download({ language: 'pt-BR', kind: 'manual' }).instance).toEqual([
      ...COMMON,
      '--write-subs',
      '--sub-langs',
      'pt-BR',
      '--sub-format',
      'vtt',
      '-o',
      'C:/tmp/legenda',
      '--',
      CLEAN_URL,
    ]);
  });

  test('automatic: --write-auto-subs instead of --write-subs', () => {
    const args: string[] = download({ language: 'en-orig', kind: 'automatic' }).instance;
    expect(args).toContain('--write-auto-subs');
    expect(args).toContain('en-orig');
  });

  test.each([
    ['manual', { language: 'en', kind: 'manual' } as Track],
    ['automatic', { language: 'en-orig', kind: 'automatic' } as Track],
  ])('%s: never both flags together (both together fell to the translation and got 429 in a real test)', (_case: string, track: Track) => {
    const args: string[] = download(track).instance;
    const flags: string[] = args.filter((arg: string) => arg === '--write-subs' || arg === '--write-auto-subs');
    expect(flags).toHaveLength(1);
  });

  test.each([
    ['pattern', 'pt.*'],
    ['list', 'pt,en'],
    ['option', '--exec'],
    ['exclusion', '-live_chat'],
    ['space', 'pt BR'],
    ['empty', ''],
  ])('track name that is not a plain code (%s) is refused as an internal error (UNEXPECTED), with the name as cause for the log', (_case: string, language: string) => {
    const refused: Result<string[]> = download({ language, kind: 'manual' });
    expect(refused.errors).toEqual([ErrorCode.UNEXPECTED]);
    expect(refused.cause).toBe(`nome de faixa recusado: ${JSON.stringify(language)}`);
  });
});

describe('version (used by the canary)', () => {
  test('only --ignore-config and --version: no URL, nothing downloaded', () => {
    expect(YtDlpArgumentsBuilder.version()).toEqual(['--ignore-config', '--version']);
  });
});
