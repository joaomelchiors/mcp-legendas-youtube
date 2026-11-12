// Builds the exact argument list for each yt-dlp run.
// Rules learned from real tests of yt-dlp:
//   - manual OR automatic, never both (both together fell to the translation and got 429);
//   - one exact track name, never a list or a pattern (they asked for many captions and got 429);
//   - "--" before the URL, so nothing after it is read as an option.

import type { Track } from '../../domain/transcript.js';
import type { UrlVideo } from '../../domain/urlVideo-vo.js';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export class YtDlpArgumentsBuilder {
  /** Never read a yt-dlp configuration file of the machine: only the arguments below count. */
  private static readonly IGNORE_CONFIG: string = '--ignore-config';
  private static readonly COMMON: readonly string[] = [
    YtDlpArgumentsBuilder.IGNORE_CONFIG,
    '--no-cache-dir',
    '--encoding',
    'utf-8',
    '--skip-download',
  ];
  private static readonly PLAIN_NAME: RegExp = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
  private static readonly SUBTITLE_FORMAT: string = 'vtt';

  /** Only the version (for the canary): no URL, nothing downloaded. */
  static version(): string[] {
    return [YtDlpArgumentsBuilder.IGNORE_CONFIG, '--version'];
  }

  static videoInfo(video: UrlVideo): string[] {
    return [...YtDlpArgumentsBuilder.COMMON, '-J', '--', video.watchUrl];
  }

  static download(video: UrlVideo, track: Track, outputTemplate: string): Result<string[]> {
    const isPlainName: boolean = YtDlpArgumentsBuilder.PLAIN_NAME.test(track.language);
    // The domain never sends such a name (it chooses from what yt-dlp listed): it is an internal error, not an engine answer.
    if (!isPlainName) return Result.failWithCause<string[]>(ErrorCode.UNEXPECTED, `nome de faixa recusado: ${JSON.stringify(track.language)}`);

    return Result.ok<string[]>([
      ...YtDlpArgumentsBuilder.COMMON,
      track.kind === 'manual' ? '--write-subs' : '--write-auto-subs',
      '--sub-langs',
      track.language,
      '--sub-format',
      YtDlpArgumentsBuilder.SUBTITLE_FORMAT,
      '-o',
      outputTemplate,
      '--',
      video.watchUrl,
    ]);
  }

}
