// The canary: a live check that tells whether YouTube (or yt-dlp) changed.
// It runs the same engine as the MCP on the TED video, chosen for its stable manual captions,
// in three steps, and stops at the first failure:
//   1. yt-dlp version;  2. consultation (title, original language, manual en and pt-BR);
//   3. download of the manual pt-BR (hundreds of segments with text).
// Only two runs of yt-dlp touch YouTube (2 and 3). It runs only when João asks (npm run canario).

import { UrlVideo } from '../../domain/urlVideo-vo.js';
import { VideoInfo } from '../../domain/videoInfo-vo.js';
import type { Track, TranscriptSegment } from '../../domain/transcript.js';
import type { TranscriptEngine } from '../../domain/transcriptEngine-ports.js';
import type { Result } from '../../domain/shared/result.js';
import type { ErrorCode } from '../../domain/shared/errorCode.js';
import { ErrorMessages } from '../error-messages.js';

/** The MCP engine plus the yt-dlp version, which only the canary needs (it is not part of the port). */
export interface CanaryEngine extends TranscriptEngine {
  version(): Promise<Result<string>>;
}

export interface CanaryStep {
  readonly name: string;
  readonly isOk: boolean;
  /** What was found, or why it failed. */
  readonly detail: string;
  readonly seconds: number;
}

export interface CanaryReport {
  readonly steps: readonly CanaryStep[];
  /** The consultation, kept to compare with the fixture; null when it did not come. */
  readonly info: VideoInfo | null;
  readonly isOk: boolean;
}

export class Canary {
  static readonly VIDEO_ID: string = 'iG9CE55wbtY';
  private static readonly TITLE_PART: string = 'Do schools kill creativity';
  private static readonly ORIGINAL_LANGUAGE: string = 'en';
  private static readonly MANUAL_EXPECTED: readonly string[] = ['en', 'pt-BR'];
  private static readonly TRACK: Track = { language: 'pt-BR', kind: 'manual' };
  private static readonly MIN_SEGMENTS: number = 100;

  constructor(private readonly engine: CanaryEngine) {}

  async run(): Promise<CanaryReport> {
    const video: UrlVideo = UrlVideo.tryCreate(Canary.VIDEO_ID).instance;
    const steps: CanaryStep[] = [];

    const versionReturn: Result<string> = await Canary.timed(() => this.engine.version(), steps, 'versão do yt-dlp', Canary.versionDetail);
    if (versionReturn.isFailure) return Canary.report(steps, null);

    const infoReturn: Result<VideoInfo> = await Canary.timed(() => this.engine.getVideoInfo(video), steps, 'consulta do vídeo', Canary.infoDetail);
    const info: VideoInfo | null = infoReturn.isOk ? infoReturn.instance : null;
    if (Canary.lastFailed(steps)) return Canary.report(steps, info);

    await Canary.timed(
      () => this.engine.downloadTrack(video, Canary.TRACK),
      steps,
      `download da legenda ${Canary.TRACK.language}`,
      Canary.segmentsDetail,
    );
    return Canary.report(steps, info);
  }

  /** Runs one step, measures it, and records whether it passed. A Result failure is a step failure. */
  private static async timed<T>(
    action: () => Promise<Result<T>>,
    steps: CanaryStep[],
    name: string,
    check: (instance: T) => { isOk: boolean; detail: string },
  ): Promise<Result<T>> {
    const started: number = performance.now();
    const actionReturn: Result<T> = await action();
    const seconds: number = (performance.now() - started) / 1000;
    const checked: { isOk: boolean; detail: string } = actionReturn.isOk
      ? check(actionReturn.instance)
      : { isOk: false, detail: Canary.errorDetail(actionReturn.errors!) };
    steps.push({ name, isOk: checked.isOk, detail: checked.detail, seconds });
    return actionReturn;
  }

  private static versionDetail(version: string): { isOk: boolean; detail: string } {
    return { isOk: true, detail: version };
  }

  /** Everything the MCP relies on in this video; lists every difference, not only the first. */
  private static infoDetail(info: VideoInfo): { isOk: boolean; detail: string } {
    const problems: string[] = [];
    if (!info.title.includes(Canary.TITLE_PART)) problems.push(`título: esperava "${Canary.TITLE_PART}", veio "${info.title}"`);
    if (info.originalLanguage !== Canary.ORIGINAL_LANGUAGE) {
      problems.push(`idioma original: esperava ${Canary.ORIGINAL_LANGUAGE}, veio ${info.originalLanguage ?? 'nenhum'}`);
    }
    const missing: string[] = Canary.MANUAL_EXPECTED.filter((name: string) => !info.manual.includes(name));
    if (missing.length > 0) problems.push(`manuais: faltou ${missing.join(', ')}`);

    const isOk: boolean = problems.length === 0;
    const found: string = `título ok; idioma original ${Canary.ORIGINAL_LANGUAGE}; manuais ${Canary.MANUAL_EXPECTED.join(' e ')}`;
    return { isOk, detail: isOk ? found : problems.join('; ') };
  }

  private static segmentsDetail(segments: TranscriptSegment[]): { isOk: boolean; detail: string } {
    const count: number = segments.length;
    if (count < Canary.MIN_SEGMENTS) return { isOk: false, detail: `${count} trechos (esperava pelo menos ${Canary.MIN_SEGMENTS})` };
    const hasText: boolean = segments.some((segment: TranscriptSegment) => segment.text.trim() !== '');
    if (!hasText) return { isOk: false, detail: `${count} trechos, todos sem texto` };
    return { isOk: true, detail: `${count} trechos` };
  }

  /** The code (for whoever looks for it in the code and the guide) and the message the MCP would show. */
  private static errorDetail(errors: ErrorCode[]): string {
    const messages: string[] = errors.map((code: ErrorCode) => ErrorMessages.of(code));
    return `${errors.join(', ')}: ${messages.join('\n')}`;
  }

  private static lastFailed(steps: readonly CanaryStep[]): boolean {
    return !steps[steps.length - 1]!.isOk;
  }

  private static report(steps: readonly CanaryStep[], info: VideoInfo | null): CanaryReport {
    const isOk: boolean = steps.every((step: CanaryStep) => step.isOk);
    return { steps, info, isOk };
  }
}
