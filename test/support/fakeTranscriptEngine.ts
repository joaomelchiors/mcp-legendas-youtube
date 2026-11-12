// Fake engine: implements the TranscriptEngine port for tests only.
// No network, no yt-dlp. Returns the configured Results and records every call.
// Each track answers with its own result (needed to test the fallback).
// Anything not configured fails loudly, so a test never calls the engine by accident.

import type { TranscriptEngine } from '../../src/domain/transcriptEngine-ports.js';
import type { Track, TranscriptSegment, UrlVideo, VideoInfo } from '../../src/domain/generics-vo.js';
import type { Result } from '../../src/domain/shared/result.js';

export interface FakeEngineConfig {
  videoInfo?: Result<VideoInfo>;
  /** Result of downloadTrack for each track name (e.g. { 'pt-BR': Result.ok([{ startSeconds: 0, text: '...' }]) }). */
  tracks?: Readonly<Record<string, Result<TranscriptSegment[]>>>;
}

export type RecordedCall =
  | { operation: 'getVideoInfo'; videoId: string }
  | { operation: 'downloadTrack'; videoId: string; track: Track };

export class FakeTranscriptEngine implements TranscriptEngine {
  readonly calls: RecordedCall[] = [];

  constructor(private readonly config: FakeEngineConfig) {}

  async getVideoInfo(video: UrlVideo): Promise<Result<VideoInfo>> {
    this.calls.push({ operation: 'getVideoInfo', videoId: video.id });
    if (this.config.videoInfo === undefined) throw new Error('fake engine: getVideoInfo not configured');
    return this.config.videoInfo;
  }

  async downloadTrack(video: UrlVideo, track: Track): Promise<Result<TranscriptSegment[]>> {
    this.calls.push({ operation: 'downloadTrack', videoId: video.id, track });
    const result: Result<TranscriptSegment[]> | undefined = this.config.tracks?.[track.language];
    if (result === undefined) throw new Error(`fake engine: downloadTrack not configured for ${track.language}`);
    return result;
  }
}
