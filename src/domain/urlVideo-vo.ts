// Value object: the YouTube video the user pointed to.
// Created only through tryCreate, which returns a Result: the instance, or INVALID_URL. It never throws.

import { Result } from './shared/result.js';
import { ErrorCode } from './shared/errorCode.js';

/**
 * The YouTube video the user pointed to.
 * Accepts the plain 11-character ID or a link: youtube.com/watch?v=, youtu.be/,
 * youtube.com/shorts/ and youtube.com/embed/. Extra parameters (playlist, time, si) are ignored.
 */
export class UrlVideo {
  private static readonly ID_PATTERN: RegExp = /^[A-Za-z0-9_-]{11}$/;
  private static readonly YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
  ]);
  private static readonly SHORT_HOST: string = 'youtu.be';
  private static readonly PATHS_WITH_ID: ReadonlySet<string> = new Set(['shorts', 'embed']);
  private static readonly WATCH_URL: string = 'https://www.youtube.com/watch?v=';

  private constructor(public readonly id: string) {}

  /** The one canonical link of the video, whatever link the user sent (no playlist, time or tracking). */
  get watchUrl(): string {
    return UrlVideo.watchUrlOf(this.id);
  }

  /** The canonical link for an ID that is already valid (e.g. the videoId of a Transcript). */
  static watchUrlOf(id: string): string {
    return `${UrlVideo.WATCH_URL}${id}`;
  }

  static tryCreate(input: unknown): Result<UrlVideo> {
    if (typeof input !== 'string') return Result.fail<UrlVideo>(ErrorCode.INVALID_URL);

    const text: string = input.trim();
    const id: string | null = UrlVideo.isVideoId(text) ? text : UrlVideo.idFromLink(text);
    if (id === null || !UrlVideo.isVideoId(id)) return Result.fail<UrlVideo>(ErrorCode.INVALID_URL);

    return Result.ok<UrlVideo>(new UrlVideo(id));
  }

  private static isVideoId(text: string): boolean {
    return UrlVideo.ID_PATTERN.test(text);
  }

  private static idFromLink(text: string): string | null {
    const url: URL | null = UrlVideo.parseHttpUrl(text);
    if (url === null) return null;

    const host: string = url.hostname.toLowerCase();
    const parts: string[] = url.pathname.split('/').filter(Boolean);

    if (host === UrlVideo.SHORT_HOST) return parts.length === 1 ? parts[0] : null;
    if (!UrlVideo.YOUTUBE_HOSTS.has(host)) return null;
    if (parts.length === 1 && parts[0] === 'watch') return url.searchParams.get('v');
    if (parts.length === 2 && UrlVideo.PATHS_WITH_ID.has(parts[0])) return parts[1];
    return null;
  }

  private static parseHttpUrl(text: string): URL | null {
    const hasScheme: boolean = /^[a-z][a-z0-9+.-]*:/i.test(text);
    const withScheme: string = hasScheme ? text : `https://${text}`;
    try {
      const url: URL = new URL(withScheme);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
    } catch {
      return null;
    }
  }
}
