// Value objects of the tool's two inputs.
// Each one validates itself and is created only through tryCreate, which returns a Result:
// the instance when the input is valid, or an ErrorCode when it is not. They never throw.

import { Result } from './shared/result.js';
import { ErrorCode, type AvailableCaptions } from './shared/errorCode.js';

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

/**
 * The subtitle language the user asked for.
 * Empty (undefined, null, '' or spaces) means the original language of the video: code is null.
 * Otherwise exactly ONE code of 2 or 3 letters with an optional variant (pt, fil, pt-BR, zh-Hans, es-419).
 * Never "all", lists or patterns: the code goes to the engine, and yt-dlp would download many subtitles.
 */
export class Language {
  private static readonly CODE_PATTERN: RegExp = /^([a-z]{2,3})(?:-([a-z0-9]{2,8}))?$/i;
  private static readonly ALL_LANGUAGES: string = 'all';

  private constructor(public readonly code: string | null) {}

  get isOriginal(): boolean {
    return this.code === null;
  }

  static tryCreate(input: unknown): Result<Language> {
    if (input === undefined || input === null) return Result.ok<Language>(new Language(null));
    if (typeof input !== 'string') return Result.fail<Language>(ErrorCode.INVALID_LANGUAGE);

    const text: string = input.trim();
    if (text === '') return Result.ok<Language>(new Language(null));

    const code: string | null = Language.normalizeCode(text);
    if (code === null) return Result.fail<Language>(ErrorCode.INVALID_LANGUAGE);

    return Result.ok<Language>(new Language(code));
  }

  private static normalizeCode(text: string): string | null {
    const parts: RegExpExecArray | null = Language.CODE_PATTERN.exec(text);
    if (parts === null) return null;

    const language: string = parts[1].toLowerCase();
    const variant: string | undefined = parts[2];
    if (language === Language.ALL_LANGUAGES) return null;
    if (TrackName.isOriginal(text.toLowerCase())) return null;

    return variant === undefined ? language : `${language}-${Language.normalizeVariant(variant)}`;
  }

  private static normalizeVariant(variant: string): string {
    if (/^[a-z]{2}$/i.test(variant)) return variant.toUpperCase();
    if (/^[a-z]{4}$/i.test(variant)) return variant[0].toUpperCase() + variant.slice(1).toLowerCase();
    return variant;
  }
}

/** What the engine tells about the video's captions, without downloading any. */
export class VideoInfo {
  constructor(
    public readonly title: string,
    public readonly originalLanguage: string | null,
    public readonly manual: readonly string[],
    public readonly automatic: readonly string[],
    public readonly durationSeconds: number | null = null,
    public readonly channel: string | null = null,
    /** Publication date, "YYYY-MM-DD". */
    public readonly uploadDate: string | null = null,
    /** Live stream happening now: its caption only exists after it ends. */
    public readonly isLive: boolean = false,
  ) {}

  get hasCaptions(): boolean {
    return this.manual.length > 0 || this.automatic.length > 0;
  }

  get available(): AvailableCaptions {
    return { manual: this.manual, automatic: this.automatic };
  }
}

export type TrackKind = 'manual' | 'automatic';

export interface Track {
  readonly language: string;
  readonly kind: TrackKind;
}

/**
 * Rule of YouTube's track names: the automatic transcription of the audio is "<language>-orig"
 * ("en-orig", "pt-BR-orig"). The other automatic names ("pt", "es") are machine translations.
 */
export class TrackName {
  private static readonly ORIGINAL_SUFFIX: string = '-orig';

  static isOriginal(name: string): boolean {
    return name.endsWith(TrackName.ORIGINAL_SUFFIX);
  }

  /** "pt-BR" -> "pt-BR-orig". */
  static originalOf(language: string): string {
    return `${language}${TrackName.ORIGINAL_SUFFIX}`;
  }
}

/** One piece of caption text and the second of the video where it starts. */
export interface TranscriptSegment {
  readonly startSeconds: number;
  readonly text: string;
}
