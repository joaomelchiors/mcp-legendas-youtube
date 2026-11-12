// The yt-dlp adapter: implements the TranscriptEngine port.
// It joins the pure pieces (arguments, consultation parser, output reader) and
// the VTT reader with the runner that executes yt-dlp.
// Every download uses its own temporary folder, removed at the end, with or without error.

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TranscriptEngine } from '../../domain/transcriptEngine-ports.js';
import type { Track, TranscriptSegment, UrlVideo, VideoInfo } from '../../domain/generics-vo.js';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';
import type { CommandResult, CommandRunner } from './command-runner.js';
import { YtDlpArgumentsBuilder } from './ytDlpArguments-builder.js';
import { VideoInfoParser } from './videoInfo-parser.js';
import { YtDlpOutputReader } from './ytDlpOutput-reader.js';
import { VttReader } from './vtt-reader.js';
import { Log } from '../log.js';

export class YtDlpEngine implements TranscriptEngine {
  /** Time limit for each yt-dlp run, used by the MCP and the canary. The consultations in the engine tests took a few seconds. */
  static readonly TIMEOUT_MS: number = 90_000;
  private static readonly TEMP_PREFIX: string = 'mcp-legendas-';
  private static readonly OUTPUT_NAME: string = 'legenda.%(ext)s';
  private static readonly CAPTION_EXTENSION: string = '.vtt';

  constructor(
    private readonly runner: CommandRunner,
    private readonly executable: Result<string>,
    private readonly timeoutMs: number,
  ) {}

  /** The yt-dlp version. Only the canary uses it, so it is not part of the port. */
  async version(): Promise<Result<string>> {
    const runReturn: Result<CommandResult> = await this.execute(YtDlpArgumentsBuilder.version());
    if (runReturn.isFailure) return Result.fail<string>(runReturn.errors!);
    return Result.ok<string>(runReturn.instance.stdout.trim());
  }

  async getVideoInfo(video: UrlVideo): Promise<Result<VideoInfo>> {
    const runReturn: Result<CommandResult> = await this.execute(YtDlpArgumentsBuilder.videoInfo(video));
    if (runReturn.isFailure) return Result.fail<VideoInfo>(runReturn.errors!);
    return VideoInfoParser.parse(runReturn.instance.stdout);
  }

  async downloadTrack(video: UrlVideo, track: Track): Promise<Result<TranscriptSegment[]>> {
    const folder: string = await mkdtemp(join(tmpdir(), YtDlpEngine.TEMP_PREFIX));
    try {
      return await this.downloadInto(folder, video, track);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  }

  private async downloadInto(folder: string, video: UrlVideo, track: Track): Promise<Result<TranscriptSegment[]>> {
    const argsReturn: Result<string[]> = YtDlpArgumentsBuilder.download(video, track, join(folder, YtDlpEngine.OUTPUT_NAME));
    if (argsReturn.isFailure) return Result.fail<TranscriptSegment[]>(argsReturn.errors!);

    const runReturn: Result<CommandResult> = await this.execute(argsReturn.instance);
    if (runReturn.isFailure) return Result.fail<TranscriptSegment[]>(runReturn.errors!);

    const captionFile: string | null = await YtDlpEngine.captionFile(folder);
    if (captionFile === null) return YtDlpEngine.noFileWritten(runReturn.instance);
    return VttReader.read(await readFile(captionFile, 'utf-8'));
  }

  /** Runs yt-dlp; any way of not ending well becomes the matching error code. */
  private async execute(args: string[]): Promise<Result<CommandResult>> {
    if (this.executable.isFailure) return Result.fail<CommandResult>(this.executable.errors!);

    const result: CommandResult = await this.runner.run(this.executable.instance, args, this.timeoutMs);
    if (result.notFound) return YtDlpEngine.failed(ErrorCode.ENGINE_NOT_FOUND, 'yt-dlp não encontrado');
    if (result.timedOut) return YtDlpEngine.failed(ErrorCode.TIMEOUT, `yt-dlp passou de ${this.timeoutMs} ms`);
    if (result.exitCode !== 0) {
      for (const line of YtDlpOutputReader.errorLines(result.stderr)) Log.write(`yt-dlp: ${line}`);
      return Result.fail<CommandResult>(YtDlpOutputReader.errorCode(result.stderr));
    }
    return Result.ok<CommandResult>(result);
  }

  /** The caption yt-dlp wrote in the folder, or null when it wrote none. */
  private static async captionFile(folder: string): Promise<string | null> {
    const names: string[] = await readdir(folder);
    const caption: string | undefined = names.find((name: string) => name.endsWith(YtDlpEngine.CAPTION_EXTENSION));
    return caption === undefined ? null : join(folder, caption);
  }

  /** Exit code 0 is not enough: no file means the track we asked for did not come. */
  private static noFileWritten(result: CommandResult): Result<TranscriptSegment[]> {
    const reason: string = YtDlpOutputReader.reportsNoSubtitles(result.stdout) ? 'sem legenda para a faixa pedida' : 'nenhum arquivo gravado';
    Log.write(`yt-dlp terminou com 0, mas ${reason}`);
    return Result.fail<TranscriptSegment[]>(ErrorCode.ENGINE_OUTPUT);
  }

  private static failed(code: ErrorCode, logMessage: string): Result<CommandResult> {
    Log.write(logMessage);
    return Result.fail<CommandResult>(code);
  }
}
