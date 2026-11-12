// Tests for YtDlpOutputReader: what yt-dlp wrote tells which error happened.
// Only "ERROR:" lines count; the known warnings (JavaScript runtime, impersonation) are not errors.
// Real fixtures: test/fixtures/ytdlp/ (origin in ORIGEM.md).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { YtDlpOutputReader } from '../../../src/infra/engine/ytDlpOutput-reader.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

function fixture(name: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', 'ytdlp', name), 'utf-8');
}

describe('errorCode (used when yt-dlp ends with a failure code)', () => {
  test('real "This video is unavailable": VIDEO_UNAVAILABLE', () => {
    expect(YtDlpOutputReader.errorCode(fixture('erro-video-indisponivel.stderr.txt'))).toBe(ErrorCode.VIDEO_UNAVAILABLE);
  });

  test('real 429, after the two known warnings: RATE_LIMITED', () => {
    expect(YtDlpOutputReader.errorCode(fixture('erro-429.stderr.txt'))).toBe(ErrorCode.RATE_LIMITED);
  });

  test('only warnings, no ERROR line: ENGINE_FAILED (the warnings are not the cause)', () => {
    expect(YtDlpOutputReader.errorCode(fixture('info-ted.stderr.txt'))).toBe(ErrorCode.ENGINE_FAILED);
  });

  test('an ERROR we have never seen: ENGINE_FAILED', () => {
    expect(YtDlpOutputReader.errorCode('ERROR: [youtube] abc: Some message nobody has seen yet\n')).toBe(ErrorCode.ENGINE_FAILED);
  });

  test('"unavailable" inside a warning does not count, only inside an ERROR line', () => {
    expect(YtDlpOutputReader.errorCode('WARNING: some formats This video is unavailable\nERROR: other\n')).toBe(ErrorCode.ENGINE_FAILED);
  });

  test('Windows line breaks', () => {
    expect(YtDlpOutputReader.errorCode('WARNING: x\r\nERROR: Unable to download: HTTP Error 429: Too Many Requests\r\n')).toBe(
      ErrorCode.RATE_LIMITED,
    );
  });
});

describe('errorCode: real error outputs of restricted videos', () => {
  test.each([
    ['erro-agendada.stderr.txt', ErrorCode.LIVE_NOT_STARTED],
    ['erro-membros.stderr.txt', ErrorCode.MEMBERS_ONLY],
    ['erro-idade.stderr.txt', ErrorCode.AGE_RESTRICTED],
    ['erro-privado.stderr.txt', ErrorCode.VIDEO_PRIVATE],
    ['erro-excluido.stderr.txt', ErrorCode.VIDEO_REMOVED],
  ])('%s: %s', (file: string, code: ErrorCode) => {
    expect(YtDlpOutputReader.errorCode(fixture(file))).toBe(code);
  });

  test('removed by the uploader is not confused with the ID that never existed', () => {
    expect(YtDlpOutputReader.errorCode(fixture('erro-excluido.stderr.txt'))).not.toBe(ErrorCode.VIDEO_UNAVAILABLE);
    expect(YtDlpOutputReader.errorCode(fixture('erro-video-indisponivel.stderr.txt'))).toBe(ErrorCode.VIDEO_UNAVAILABLE);
  });
});

describe('errorLines (what goes to the log)', () => {
  test('keeps only the ERROR lines, without the warnings', () => {
    expect(YtDlpOutputReader.errorLines(fixture('erro-429.stderr.txt'))).toEqual([
      "ERROR: Unable to download video subtitles for 'pt': HTTP Error 429: Too Many Requests",
    ]);
  });
});

describe('reportsNoSubtitles (yt-dlp ends with 0 and writes no file)', () => {
  test('real "There are no subtitles for the requested languages": true', () => {
    expect(YtDlpOutputReader.reportsNoSubtitles(fixture('sem-legenda-no-idioma.stdout.txt'))).toBe(true);
  });

  test('any other output: false', () => {
    expect(YtDlpOutputReader.reportsNoSubtitles('[info] Writing video subtitles to: legenda.en.vtt\n')).toBe(false);
  });
});
