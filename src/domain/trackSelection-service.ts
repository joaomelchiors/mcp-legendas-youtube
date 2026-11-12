// Domain service: chooses the exact caption track to download.
// João's quality rules. Pure: it only reads what the engine found (VideoInfo).
//
// Language given ("pt"):
//   1. manual of the language family (preference list, exact code, other variants)
//   2. automatic original of the language ("pt-orig")
//   3. automatic translation ("pt"), with the best of the original language as fallback
//   4. nothing: NO_CAPTIONS_FOR_LANGUAGE with the available captions
// No language: the original language of the video, manual first, then "<language>-orig".
// Before all that: a live stream in progress has no caption yet (LIVE_IN_PROGRESS).

import { Language } from './language-vo.js';
import { TrackName, type Track } from './transcript.js';
import { VideoInfo } from './videoInfo-vo.js';
import { Result } from './shared/result.js';
import { ErrorCode } from './shared/errorCode.js';

/** The track to download and, only when it is a translation, the one to download if it fails. */
export interface TrackPlan {
  readonly preferred: Track;
  readonly fallback: Track | null;
}

export class TrackSelection {
  /** Order of variants where João has a preference. Other languages: exact code, then variants as they appear. */
  private static readonly PREFERRED_VARIANTS: Readonly<Record<string, readonly string[]>> = { pt: ['pt-BR', 'pt-PT'] };

  static select(info: VideoInfo, language: Language): Result<TrackPlan> {
    if (info.isLive) return Result.fail<TrackPlan>(ErrorCode.LIVE_IN_PROGRESS);
    if (!info.hasCaptions) return Result.fail<TrackPlan>(ErrorCode.NO_CAPTIONS);
    if (language.isOriginal) return TrackSelection.selectOriginal(info);
    return TrackSelection.selectRequested(info, language.code!);
  }

  private static selectRequested(info: VideoInfo, code: string): Result<TrackPlan> {
    const manual: string | null = TrackSelection.firstAvailable(TrackSelection.familyOrder(code, info.manual), info.manual);
    if (manual !== null) return TrackSelection.plan({ language: manual, kind: 'manual' });

    const original: string | null = TrackSelection.firstAvailable(TrackSelection.originalNames(code), info.automatic);
    if (original !== null) return TrackSelection.plan({ language: original, kind: 'automatic' });

    const translation: string | null = TrackSelection.firstAvailable(TrackSelection.familyOrder(code, info.automatic), info.automatic);
    if (translation !== null) return TrackSelection.plan({ language: translation, kind: 'automatic' }, TrackSelection.bestOfOriginal(info));

    return TrackSelection.nothingFor(info);
  }

  private static selectOriginal(info: VideoInfo): Result<TrackPlan> {
    if (info.originalLanguage === null) return TrackSelection.singleOriginal(info);

    const best: Track | null = TrackSelection.bestOfOriginal(info);
    if (best !== null) return TrackSelection.plan(best);
    return TrackSelection.nothingFor(info);
  }

  /** Original language unknown: only a single "-orig" can be trusted; more than one goes to the user. */
  private static singleOriginal(info: VideoInfo): Result<TrackPlan> {
    const originals: string[] = info.automatic.filter((name: string) => TrackName.isOriginal(name));
    if (originals.length === 1) return TrackSelection.plan({ language: originals[0], kind: 'automatic' });
    return TrackSelection.nothingFor(info);
  }

  /** Best track in the original language of the video: manual (exact, then language part), then "-orig". */
  private static bestOfOriginal(info: VideoInfo): Track | null {
    if (info.originalLanguage === null) return null;
    const exactAndBase: string[] = TrackSelection.unique([info.originalLanguage, TrackSelection.base(info.originalLanguage)]);

    const manual: string | null = TrackSelection.firstAvailable(exactAndBase, info.manual);
    if (manual !== null) return { language: manual, kind: 'manual' };

    const original: string | null = TrackSelection.firstAvailable(TrackSelection.originalNames(info.originalLanguage), info.automatic);
    if (original !== null) return { language: original, kind: 'automatic' };
    return null;
  }

  /**
   * Names to try for a language, in order: the asked variant (only when one was asked, e.g. "pt-PT"),
   * the preference list, the exact base, the other variants as they appear.
   */
  private static familyOrder(code: string, available: readonly string[]): string[] {
    const base: string = TrackSelection.base(code);
    const askedVariant: string[] = code === base ? [] : [code];
    const preferred: readonly string[] = TrackSelection.PREFERRED_VARIANTS[base] ?? [];
    const otherVariants: string[] = available.filter(
      (name: string) => name.startsWith(`${base}-`) && !TrackName.isOriginal(name),
    );
    return TrackSelection.unique([...askedVariant, ...preferred, base, ...otherVariants]);
  }

  /** "pt-BR" -> ["pt-BR-orig", "pt-orig"]; "pt" -> ["pt-orig"]. */
  private static originalNames(code: string): string[] {
    return TrackSelection.unique([code, TrackSelection.base(code)]).map((name: string) => TrackName.originalOf(name));
  }

  private static firstAvailable(candidates: readonly string[], available: readonly string[]): string | null {
    return candidates.find((name: string) => available.includes(name)) ?? null;
  }

  /** The language part of a code: "pt-BR" -> "pt". */
  private static base(code: string): string {
    return code.split('-')[0];
  }

  private static unique(names: readonly string[]): string[] {
    return [...new Set(names)];
  }

  private static plan(preferred: Track, fallback: Track | null = null): Result<TrackPlan> {
    return Result.ok<TrackPlan>({ preferred, fallback });
  }

  private static nothingFor(info: VideoInfo): Result<TrackPlan> {
    return Result.fail<TrackPlan>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, { available: info.available });
  }
}
