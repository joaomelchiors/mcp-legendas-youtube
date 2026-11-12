// Turns the JSON of "yt-dlp -J" into the domain's VideoInfo.
// Only the title is required. Any other field that is missing or has an unexpected shape
// becomes null or an empty list: a missing date must not stop the user from getting the caption.

import { VideoInfo } from '../../domain/generics-vo.js';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

type JsonObject = Record<string, unknown>;

export class VideoInfoParser {
  /** "20070107" -> "2007-01-07". */
  private static readonly UPLOAD_DATE: RegExp = /^(\d{4})(\d{2})(\d{2})$/;
  /** Chat replay of live streams: yt-dlp lists it with the captions, but it is not a caption. */
  private static readonly NOT_A_CAPTION: string = 'live_chat';
  /** "live_status" of a live stream happening now. Ended lives ("was_live") are normal videos. */
  private static readonly LIVE_NOW: string = 'is_live';

  static parse(json: string): Result<VideoInfo> {
    const data: JsonObject | null = VideoInfoParser.object(json);
    if (data === null || typeof data.title !== 'string') return Result.fail<VideoInfo>(ErrorCode.ENGINE_OUTPUT);

    return Result.ok<VideoInfo>(
      new VideoInfo(
        data.title,
        VideoInfoParser.text(data.language),
        VideoInfoParser.trackNames(data.subtitles),
        VideoInfoParser.trackNames(data.automatic_captions),
        VideoInfoParser.duration(data.duration),
        VideoInfoParser.text(data.channel),
        VideoInfoParser.uploadDate(data.upload_date),
        data.live_status === VideoInfoParser.LIVE_NOW,
      ),
    );
  }

  /** The JSON as an object, or null when it is not valid JSON or not an object. */
  private static object(json: string): JsonObject | null {
    try {
      const value: unknown = JSON.parse(json);
      const isObject: boolean = typeof value === 'object' && value !== null && !Array.isArray(value);
      return isObject ? (value as JsonObject) : null;
    } catch {
      return null;
    }
  }

  private static text(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private static duration(value: unknown): number | null {
    const isValid: boolean = typeof value === 'number' && Number.isFinite(value) && value >= 0;
    return isValid ? (value as number) : null;
  }

  private static uploadDate(value: unknown): string | null {
    const parts: RegExpExecArray | null = typeof value === 'string' ? VideoInfoParser.UPLOAD_DATE.exec(value) : null;
    return parts === null ? null : `${parts[1]}-${parts[2]}-${parts[3]}`;
  }

  private static trackNames(value: unknown): string[] {
    const isObject: boolean = typeof value === 'object' && value !== null && !Array.isArray(value);
    if (!isObject) return [];
    return Object.keys(value as JsonObject).filter((name: string) => name !== VideoInfoParser.NOT_A_CAPTION);
  }
}
