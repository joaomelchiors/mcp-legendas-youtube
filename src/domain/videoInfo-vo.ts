// Value object: what the engine tells about the video and its captions (the answer of the consultation).

import type { AvailableCaptions } from './shared/errorCode.js';

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
