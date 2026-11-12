// Value object: the caption language the user asked for.
// Created only through tryCreate, which returns a Result: the instance, or INVALID_LANGUAGE. It never throws.

import { Result } from './shared/result.js';
import { ErrorCode } from './shared/errorCode.js';
import { TrackName } from './transcript.js';

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
