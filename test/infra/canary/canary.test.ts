// Tests for Canary: the live check that tells whether YouTube (or yt-dlp) changed.
// It runs the same engine as the MCP on the TED video, in three steps, and stops at the first failure.
// No network here: a fake engine that also answers the yt-dlp version.

import { Canary, type CanaryEngine, type CanaryReport } from '../../../src/infra/canary/canary.js';
import { VideoInfo } from '../../../src/domain/videoInfo-vo.js';
import type { TranscriptSegment } from '../../../src/domain/transcript.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';
import { FakeTranscriptEngine, type FakeEngineConfig } from '../../support/fakeTranscriptEngine.js';

class FakeCanaryEngine extends FakeTranscriptEngine implements CanaryEngine {
  constructor(
    config: FakeEngineConfig,
    private readonly versionReturn: Result<string> = Result.ok<string>('2026.10.26'),
  ) {
    super(config);
  }

  async version(): Promise<Result<string>> {
    return this.versionReturn;
  }
}

const TED: VideoInfo = new VideoInfo(
  'Do schools kill creativity? | Sir Ken Robinson | TED',
  'en',
  ['en', 'pt-BR', 'pt-PT'],
  ['en-orig', 'pt'],
  1203,
  'TED',
  '2007-01-07',
);

function segments(count: number): TranscriptSegment[] {
  return Array.from({ length: count }, (_: unknown, index: number) => ({ startSeconds: index, text: 'Bom dia.' }));
}

function healthy(): FakeEngineConfig {
  return { videoInfo: Result.ok(TED), tracks: { 'pt-BR': Result.ok(segments(300)) } };
}

async function run(engine: FakeCanaryEngine): Promise<CanaryReport> {
  return new Canary(engine).run();
}

describe('everything works', () => {
  test('three steps ok, in order, with the version, what was checked and the time of each one', async () => {
    const report: CanaryReport = await run(new FakeCanaryEngine(healthy()));
    expect(report.isOk).toBe(true);
    expect(report.steps.map((step) => [step.name, step.isOk])).toEqual([
      ['versão do yt-dlp', true],
      ['consulta do vídeo', true],
      ['download da legenda pt-BR', true],
    ]);
    expect(report.steps[0]!.detail).toBe('2026.10.26');
    expect(report.steps[1]!.detail).toMatch(/idioma original en; manuais en e pt-BR/);
    expect(report.steps[2]!.detail).toBe('300 trechos');
    for (const step of report.steps) expect(step.seconds).toBeGreaterThanOrEqual(0);
  });

  test('keeps the consultation, to compare with the fixture', async () => {
    expect((await run(new FakeCanaryEngine(healthy()))).info).toBe(TED);
  });

  test('uses the TED video and downloads exactly the manual pt-BR, nothing else', async () => {
    const engine: FakeCanaryEngine = new FakeCanaryEngine(healthy());
    await run(engine);
    expect(engine.calls).toEqual([
      { operation: 'getVideoInfo', videoId: 'iG9CE55wbtY' },
      { operation: 'downloadTrack', videoId: 'iG9CE55wbtY', track: { language: 'pt-BR', kind: 'manual' } },
    ]);
  });
});

describe('it stops at the first failure and says why', () => {
  test('1) yt-dlp not found: one step, failed, with the code and the message; the video is not consulted', async () => {
    const engine: FakeCanaryEngine = new FakeCanaryEngine(healthy(), Result.fail<string>(ErrorCode.ENGINE_NOT_FOUND));
    const report: CanaryReport = await run(engine);
    expect(report.isOk).toBe(false);
    expect(report.steps).toHaveLength(1);
    expect(report.steps[0]!.detail).toMatch(/^ENGINE_NOT_FOUND: /);
    expect(engine.calls).toEqual([]);
  });

  test('2) the consultation fails: two steps, the second failed with the code; nothing is downloaded', async () => {
    const engine: FakeCanaryEngine = new FakeCanaryEngine({ videoInfo: Result.fail<VideoInfo>(ErrorCode.RATE_LIMITED) });
    const report: CanaryReport = await run(engine);
    expect(report.steps.map((step) => step.isOk)).toEqual([true, false]);
    expect(report.steps[1]!.detail).toMatch(/^RATE_LIMITED: /);
    expect(report.info).toBeNull();
    expect(engine.calls).toHaveLength(1);
  });

  test.each([
    ['another title', new VideoInfo('Outro vídeo', 'en', ['en', 'pt-BR'], []), /título: esperava "Do schools kill creativity", veio "Outro vídeo"/],
    ['original language lost', new VideoInfo(TED.title, null, ['en', 'pt-BR'], []), /idioma original: esperava en, veio nenhum/],
    ['manual pt-BR missing', new VideoInfo(TED.title, 'en', ['en'], ['pt-BR']), /manuais: faltou pt-BR/],
    ['no manual at all', new VideoInfo(TED.title, 'en', [], []), /manuais: faltou en, pt-BR/],
  ])('2) the consultation comes, but changed (%s): failed, says what, and keeps it', async (_case: string, info: VideoInfo, detail: RegExp) => {
    const report: CanaryReport = await run(new FakeCanaryEngine({ videoInfo: Result.ok(info) }));
    expect(report.steps.map((step) => step.isOk)).toEqual([true, false]);
    expect(report.steps[1]!.detail).toMatch(detail);
    expect(report.info).toBe(info);
  });

  test('3) the download fails: failed with the code', async () => {
    const report: CanaryReport = await run(
      new FakeCanaryEngine({ videoInfo: Result.ok(TED), tracks: { 'pt-BR': Result.fail<TranscriptSegment[]>(ErrorCode.VTT_PARSE) } }),
    );
    expect(report.steps.map((step) => step.isOk)).toEqual([true, true, false]);
    expect(report.steps[2]!.detail).toMatch(/^VTT_PARSE: /);
  });

  test('3) the download comes too short: failed, with how many came and how many were expected', async () => {
    const report: CanaryReport = await run(new FakeCanaryEngine({ videoInfo: Result.ok(TED), tracks: { 'pt-BR': Result.ok(segments(5)) } }));
    expect(report.isOk).toBe(false);
    expect(report.steps[2]!.detail).toBe('5 trechos (esperava pelo menos 100)');
  });

  test('3) segments without text: failed', async () => {
    const empty: TranscriptSegment[] = segments(150).map((segment: TranscriptSegment) => ({ ...segment, text: ' ' }));
    const report: CanaryReport = await run(new FakeCanaryEngine({ videoInfo: Result.ok(TED), tracks: { 'pt-BR': Result.ok(empty) } }));
    expect(report.steps[2]!.isOk).toBe(false);
    expect(report.steps[2]!.detail).toBe('150 trechos, todos sem texto');
  });
});
