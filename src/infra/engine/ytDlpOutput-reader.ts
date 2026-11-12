// Reads what yt-dlp wrote and tells what happened.
// Only "ERROR:" lines count. The warnings that appear in almost every run
// ("No supported JavaScript runtime", "impersonation") are not errors.
// Each known ERROR text comes from a real output (see test/fixtures/ytdlp).

import { ErrorCode } from '../../domain/shared/errorCode.js';

export class YtDlpOutputReader {
  private static readonly ERROR_PREFIX: string = 'ERROR:';
  /** Checked in this order: "removed by the uploader" also says "Video unavailable", so it comes first. */
  private static readonly KNOWN_ERRORS: ReadonlyArray<readonly [RegExp, ErrorCode]> = [
    [/removed by the uploader/i, ErrorCode.VIDEO_REMOVED],
    [/This video is unavailable|Video unavailable/i, ErrorCode.VIDEO_UNAVAILABLE],
    [/Private video/i, ErrorCode.VIDEO_PRIVATE],
    [/available to this channel's members/i, ErrorCode.MEMBERS_ONLY],
    [/Sign in to confirm your age/i, ErrorCode.AGE_RESTRICTED],
    [/This live event will begin/i, ErrorCode.LIVE_NOT_STARTED],
    [/HTTP Error 429/, ErrorCode.RATE_LIMITED],
  ];
  private static readonly NO_SUBTITLES: string = 'There are no subtitles for the requested languages';

  static errorCode(stderr: string): ErrorCode {
    const errors: string = YtDlpOutputReader.errorLines(stderr).join('\n');
    const known: readonly [RegExp, ErrorCode] | undefined = YtDlpOutputReader.KNOWN_ERRORS.find(
      ([pattern]: readonly [RegExp, ErrorCode]) => pattern.test(errors),
    );
    return known === undefined ? ErrorCode.ENGINE_FAILED : known[1];
  }

  static errorLines(stderr: string): string[] {
    return stderr.split(/\r?\n/).filter((line: string) => line.startsWith(YtDlpOutputReader.ERROR_PREFIX));
  }

  static reportsNoSubtitles(stdout: string): boolean {
    return stdout.includes(YtDlpOutputReader.NO_SUBTITLES);
  }
}
