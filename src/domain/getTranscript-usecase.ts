// Use case: get the transcript of a YouTube video.
// This is the map of the flow. It leaves on the first failure.
//   1. url      -> UrlVideo     (value object)
//   2. language -> Language     (value object; empty means the original)
//   3. engine   -> VideoInfo    (consult first: what exists)
//   4. domain   -> TrackPlan    (TrackSelection: the exact track, and a fallback when it is a translation)
//   5. engine   -> segments     (download the preferred track; if it fails and there is a fallback, the fallback)

import { Language } from './language-vo.js';
import { UrlVideo } from './urlVideo-vo.js';
import { VideoInfo } from './videoInfo-vo.js';
import type { Track, Transcript, TranscriptSegment } from './transcript.js';
import { TrackSelection, type TrackPlan } from './trackSelection-service.js';
import type { TranscriptEngine } from './transcriptEngine-ports.js';
import { Result } from './shared/result.js';

export class GetTranscript {
  constructor(private readonly engine: TranscriptEngine) {}

  async execute(url: unknown, language: unknown): Promise<Result<Transcript>> {
    const urlVideoReturn: Result<UrlVideo> = UrlVideo.tryCreate(url);
    if (urlVideoReturn.isFailure) return urlVideoReturn.propagate<Transcript>();

    const languageReturn: Result<Language> = Language.tryCreate(language);
    if (languageReturn.isFailure) return languageReturn.propagate<Transcript>();

    const videoInfoReturn: Result<VideoInfo> = await this.engine.getVideoInfo(urlVideoReturn.instance);
    if (videoInfoReturn.isFailure) return videoInfoReturn.propagate<Transcript>();

    const planReturn: Result<TrackPlan> = TrackSelection.select(videoInfoReturn.instance, languageReturn.instance);
    if (planReturn.isFailure) return planReturn.propagate<Transcript>();

    return this.download(urlVideoReturn.instance, videoInfoReturn.instance, planReturn.instance);
  }

  /** Downloads the preferred track; if it fails and the plan has a fallback, downloads the fallback. */
  private async download(video: UrlVideo, info: VideoInfo, plan: TrackPlan): Promise<Result<Transcript>> {
    const preferredReturn: Result<TranscriptSegment[]> = await this.engine.downloadTrack(video, plan.preferred);
    if (preferredReturn.isOk) {
      return Result.ok<Transcript>(this.transcript(video, info, plan.preferred, preferredReturn.instance, false));
    }
    if (plan.fallback === null) return preferredReturn.propagate<Transcript>();

    const fallbackReturn: Result<TranscriptSegment[]> = await this.engine.downloadTrack(video, plan.fallback);
    if (fallbackReturn.isFailure) return fallbackReturn.propagate<Transcript>();
    return Result.ok<Transcript>(this.transcript(video, info, plan.fallback, fallbackReturn.instance, true));
  }

  private transcript(
    video: UrlVideo,
    info: VideoInfo,
    track: Track,
    segments: TranscriptSegment[],
    isOriginalFallback: boolean,
  ): Transcript {
    return {
      videoId: video.id,
      title: info.title,
      channel: info.channel,
      uploadDate: info.uploadDate,
      durationSeconds: info.durationSeconds,
      language: track.language,
      kind: track.kind,
      segments,
      isOriginalFallback,
    };
  }
}
