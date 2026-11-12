// The transcript and its parts: the track (language + kind), the rule of track names,
// the segments of text, and the Transcript the use case returns.

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

/** The result of the use case: the video's data and the downloaded track. */
export interface Transcript {
  readonly videoId: string;
  readonly title: string;
  readonly channel: string | null;
  /** "YYYY-MM-DD". */
  readonly uploadDate: string | null;
  readonly durationSeconds: number | null;
  /** Name of the downloaded track (e.g. "pt-BR", "pt-orig"). */
  readonly language: string;
  /** manual: "legenda revisada"; automatic: "gerada automaticamente". */
  readonly kind: TrackKind;
  readonly segments: readonly TranscriptSegment[];
  /** True when the requested translation failed and the original language came instead. */
  readonly isOriginalFallback: boolean;
}
