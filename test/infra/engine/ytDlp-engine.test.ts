// Tests for YtDlpEngine: the yt-dlp adapter, implementing the TranscriptEngine port.
// The runner is fake (no yt-dlp, no network); it answers with the real outputs recorded in
// test/fixtures and, for downloads, writes the real caption file where yt-dlp would.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { YtDlpEngine } from '../../../src/infra/engine/ytDlp-engine.js';
import type { TranscriptEngine } from '../../../src/domain/transcriptEngine-ports.js';
import { UrlVideo, VideoInfo, type Track, type TranscriptSegment } from '../../../src/domain/generics-vo.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';
import { FakeCommandRunner, finished, type CommandHandler } from '../../support/fakeCommandRunner.js';
import type { CommandResult } from '../../../src/infra/engine/command-runner.js';

const VIDEO: UrlVideo = UrlVideo.tryCreate('iG9CE55wbtY').instance;
const MANUAL_EN: Track = { language: 'en', kind: 'manual' };
const EXECUTABLE: Result<string> = Result.ok('C:/ferramentas/yt-dlp.exe');

function fixture(folder: string, name: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', folder, name), 'utf-8');
}

function engineWith(handler: CommandHandler, executable: Result<string> = EXECUTABLE): { engine: YtDlpEngine; runner: FakeCommandRunner } {
  const runner: FakeCommandRunner = new FakeCommandRunner(handler);
  return { engine: new YtDlpEngine(runner, executable, 5_000), runner };
}

/** The "-o" template yt-dlp received, and the folder it points to. */
function outputTemplate(args: readonly string[]): string {
  return args[args.indexOf('-o') + 1];
}

/** Pretends to be yt-dlp writing the caption: "<folder>/legenda.%(ext)s" -> "<folder>/legenda.en.vtt". */
function writesCaption(vtt: string, stdout: string = '[info] Writing video subtitles to: legenda.en.vtt'): CommandHandler {
  return (args: readonly string[]): CommandResult => {
    writeFileSync(outputTemplate(args).replace('%(ext)s', 'en.vtt'), vtt, 'utf-8');
    return finished(0, stdout);
  };
}

beforeEach(() => {
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

describe('YtDlpEngine implements the port', () => {
  test('can be used where a TranscriptEngine is expected', () => {
    const engine: TranscriptEngine = engineWith(() => finished(0)).engine;
    expect(typeof engine.getVideoInfo).toBe('function');
    expect(typeof engine.downloadTrack).toBe('function');
  });
});

describe('getVideoInfo (the consultation)', () => {
  test('runs the located executable with the consultation arguments and the time limit', async () => {
    const { engine, runner } = engineWith(() => finished(0, fixture('ytdlp', 'info-ted.json')));
    await engine.getVideoInfo(VIDEO);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0].executable).toBe('C:/ferramentas/yt-dlp.exe');
    expect(runner.calls[0].args).toContain('-J');
    expect(runner.calls[0].args[runner.calls[0].args.length - 1]).toBe('https://www.youtube.com/watch?v=iG9CE55wbtY');
    expect(runner.calls[0].timeoutMs).toBe(5_000);
  });

  test('real TED output becomes a VideoInfo', async () => {
    const { engine } = engineWith(() => finished(0, fixture('ytdlp', 'info-ted.json')));
    const infoReturn: Result<VideoInfo> = await engine.getVideoInfo(VIDEO);
    expect(infoReturn.instance.title).toBe('Do schools kill creativity? | Sir Ken Robinson | TED');
    expect(infoReturn.instance.uploadDate).toBe('2007-01-07');
  });

  test.each([
    ['real "video unavailable"', finished(1, '', 'erro-video-indisponivel.stderr.txt'), ErrorCode.VIDEO_UNAVAILABLE],
    ['real 429', finished(1, '', 'erro-429.stderr.txt'), ErrorCode.RATE_LIMITED],
    ['not found', { exitCode: null, stdout: '', stderr: '', timedOut: false, notFound: true }, ErrorCode.ENGINE_NOT_FOUND],
    ['time limit', { exitCode: null, stdout: '', stderr: '', timedOut: true, notFound: false }, ErrorCode.TIMEOUT],
    ['exit 0 but not JSON', finished(0, 'not json'), ErrorCode.ENGINE_OUTPUT],
  ])('%s: %s', async (_case: string, result: CommandResult, error: ErrorCode) => {
    const stderr: string = result.stderr.endsWith('.txt') ? fixture('ytdlp', result.stderr) : result.stderr;
    const { engine } = engineWith(() => ({ ...result, stderr }));
    expect((await engine.getVideoInfo(VIDEO)).errors).toEqual([error]);
  });

  test('executable not located (bad YT_DLP_PATH): ENGINE_NOT_FOUND without running anything', async () => {
    const { engine, runner } = engineWith(() => finished(0), Result.fail<string>(ErrorCode.ENGINE_NOT_FOUND));
    expect((await engine.getVideoInfo(VIDEO)).errors).toEqual([ErrorCode.ENGINE_NOT_FOUND]);
    expect(runner.calls).toEqual([]);
  });

  test('the ERROR lines go to the log, the warnings do not', async () => {
    const stderr: jest.SpyInstance = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { engine } = engineWith(() => finished(1, '', fixture('ytdlp', 'erro-429.stderr.txt')));
    await engine.getVideoInfo(VIDEO);
    const lines: string = stderr.mock.calls.map((call: unknown[]) => String(call[0])).join('');
    expect(lines).toContain('HTTP Error 429');
    expect(lines).not.toContain('JavaScript runtime');
  });
});

describe('downloadTrack (one exact track)', () => {
  test('reads the caption yt-dlp wrote and returns the segments', async () => {
    const { engine } = engineWith(writesCaption(fixture('vtt', 'ted-manual-en.vtt')));
    const segmentsReturn: Result<TranscriptSegment[]> = await engine.downloadTrack(VIDEO, MANUAL_EN);
    expect(segmentsReturn.instance[0]).toEqual({ startSeconds: 27.103, text: 'Good morning. How are you?' });
  });

  test('asks for exactly the track: manual flag, exact name, output inside a temporary folder', async () => {
    const { engine, runner } = engineWith(writesCaption(fixture('vtt', 'ted-manual-en.vtt')));
    await engine.downloadTrack(VIDEO, MANUAL_EN);
    const args: readonly string[] = runner.calls[0].args;
    expect(args).toContain('--write-subs');
    expect(args).not.toContain('--write-auto-subs');
    expect(args[args.indexOf('--sub-langs') + 1]).toBe('en');
    expect(outputTemplate(args)).toMatch(/legenda\.%\(ext\)s$/);
  });

  test('the temporary folder is removed after success', async () => {
    const { engine, runner } = engineWith(writesCaption(fixture('vtt', 'ted-manual-en.vtt')));
    await engine.downloadTrack(VIDEO, MANUAL_EN);
    expect(existsSync(dirname(outputTemplate(runner.calls[0].args)))).toBe(false);
  });

  test('the temporary folder is removed after a failure too', async () => {
    const { engine, runner } = engineWith(() => finished(1, '', fixture('ytdlp', 'erro-429.stderr.txt')));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.RATE_LIMITED]);
    expect(existsSync(dirname(outputTemplate(runner.calls[0].args)))).toBe(false);
  });

  test('exit 0 and no file (real "There are no subtitles"): ENGINE_OUTPUT, because exit 0 is not enough', async () => {
    const { engine } = engineWith(() => finished(0, fixture('ytdlp', 'sem-legenda-no-idioma.stdout.txt')));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.ENGINE_OUTPUT]);
  });

  test('exit 0, no file and no explanation: ENGINE_OUTPUT, and the log says no file was written', async () => {
    const stderr: jest.SpyInstance = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { engine } = engineWith(() => finished(0, ''));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.ENGINE_OUTPUT]);
    expect(stderr).toHaveBeenCalledWith(expect.stringMatching(/nenhum arquivo gravado/));
  });

  test('a caption file that is not VTT: VTT_PARSE', async () => {
    const { engine } = engineWith(writesCaption('isto não é VTT'));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.VTT_PARSE]);
  });

  test('time limit: TIMEOUT', async () => {
    const { engine } = engineWith(() => ({ exitCode: null, stdout: '', stderr: '', timedOut: true, notFound: false }));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.TIMEOUT]);
  });

  test('a track name that is not a plain code: ENGINE_OUTPUT without running anything', async () => {
    const { engine, runner } = engineWith(() => finished(0));
    expect((await engine.downloadTrack(VIDEO, { language: 'pt.*', kind: 'manual' })).errors).toEqual([ErrorCode.ENGINE_OUTPUT]);
    expect(runner.calls).toEqual([]);
  });

  test('executable not located: ENGINE_NOT_FOUND without running anything', async () => {
    const { engine, runner } = engineWith(() => finished(0), Result.fail<string>(ErrorCode.ENGINE_NOT_FOUND));
    expect((await engine.downloadTrack(VIDEO, MANUAL_EN)).errors).toEqual([ErrorCode.ENGINE_NOT_FOUND]);
    expect(runner.calls).toEqual([]);
  });
});

describe('version (used by the canary; not part of the port)', () => {
  test('runs yt-dlp --version and returns the version without the line break', async () => {
    const { engine, runner } = engineWith(() => finished(0, '2026.10.26\r\n'));
    const versionReturn: Result<string> = await engine.version();
    expect(versionReturn.instance).toBe('2026.10.26');
    expect(runner.calls[0].args).toEqual(['--ignore-config', '--version']);
  });

  test('yt-dlp not located: ENGINE_NOT_FOUND, nothing runs', async () => {
    const { engine, runner } = engineWith(() => finished(0), Result.fail<string>(ErrorCode.ENGINE_NOT_FOUND));
    expect((await engine.version()).errors).toEqual([ErrorCode.ENGINE_NOT_FOUND]);
    expect(runner.calls).toEqual([]);
  });

  test('yt-dlp ends with an error: the same codes as the other runs', async () => {
    const { engine } = engineWith(() => finished(1, '', 'ERROR: something\n'));
    expect((await engine.version()).errors).toEqual([ErrorCode.ENGINE_FAILED]);
  });
});
