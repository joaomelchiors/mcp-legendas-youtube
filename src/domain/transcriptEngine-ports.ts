// The engine port: the contract that any engine (today yt-dlp) must fulfill.
// The use case depends on this interface, never on yt-dlp (dependency inversion).
// Changing the engine means writing another class that implements this interface.
// An engine never throws for an expected problem: it returns Result.fail(ErrorCode).

import type { Track, TranscriptSegment } from './transcript.js';
import type { UrlVideo } from './urlVideo-vo.js';
import type { VideoInfo } from './videoInfo-vo.js';
import type { Result } from './shared/result.js';

export interface TranscriptEngine {
  /** Tells which captions the video has (both lists), its original language, duration, channel and date, without downloading any. */
  getVideoInfo(video: UrlVideo): Promise<Result<VideoInfo>>;

  /**
   * Downloads exactly this track, from exactly its list (manual or automatic), and returns it as segments
   * with time, already clean (the file format, e.g. VTT, is the engine's business).
   * Never asks for anything else: no list of languages, no pattern (they caused 429 in the engine tests).
   */
  downloadTrack(video: UrlVideo, track: Track): Promise<Result<TranscriptSegment[]>>;
}
