// Builds the exact argument list for each yt-dlp run.
// Rules learned from real tests of yt-dlp:
//   - manual OR automatic, never both (both together fell to the translation and got 429);
//   - one exact track name, never a list or a pattern (they asked for many captions and got 429);
//   - "--" before the URL, so nothing after it is read as an option.

import type { Track, UrlVideo } from '../../domain/generics-vo.js';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export class YtDlpArgumentsBuilder {
  private static readonly COMMON: readonly string[] = [
    '--ignore-config',
    '--no-cache-dir',
    '--encoding',
    'utf-8',
    '--skip-download',
  ];
  private static readonly PLAIN_NAME: RegExp = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
  private static readonly SUBTITLE_FORMAT: string = 'vtt';

  /** Only the version (for the canary): no URL, nothing downloaded. */
  static version(): string[] {
    return ['--ignore-config', '--version'];
  }

  static videoInfo(video: UrlVideo): string[] {
    return [...YtDlpArgumentsBuilder.COMMON, '-J', '--', video.watchUrl];
  }

  static download(video: UrlVideo, track: Track, outputTemplate: string): Result<string[]> {
    const isPlainName: boolean = YtDlpArgumentsBuilder.PLAIN_NAME.test(track.language);
    if (!isPlainName) return Result.fail<string[]>(ErrorCode.ENGINE_OUTPUT);

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
