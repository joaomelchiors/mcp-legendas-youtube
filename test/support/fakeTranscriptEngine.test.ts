// Tests for the fake engine: it replaces yt-dlp in the use case tests.
// If it lies, every test that depends on it lies too, so it has its own tests.

import type { TranscriptEngine } from '../../src/domain/transcriptEngine-ports.js';
import { UrlVideo, VideoInfo, type Track, type TranscriptSegment } from '../../src/domain/generics-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';
import { FakeTranscriptEngine } from './fakeTranscriptEngine.js';

const VIDEO: UrlVideo = UrlVideo.tryCreate('iG9CE55wbtY').instance;
const INFO: VideoInfo = new VideoInfo('TED', 'en', ['en', 'pt-BR'], ['en-orig']);
const EN: Track = { language: 'en', kind: 'manual' };
const PT_BR: Track = { language: 'pt-BR', kind: 'manual' };
const SEGMENTS: TranscriptSegment[] = [{ startSeconds: 27.103, text: 'Good morning. How are you?' }];

describe('FakeTranscriptEngine', () => {
  test('can be used where a TranscriptEngine is expected', async () => {
    const engine: TranscriptEngine = new FakeTranscriptEngine({ videoInfo: Result.ok(INFO), tracks: { en: Result.ok(SEGMENTS) } });
    expect((await engine.getVideoInfo(VIDEO)).instance).toBe(INFO);
    expect((await engine.downloadTrack(VIDEO, EN)).instance).toEqual(SEGMENTS);
  });

  test('answers each track with its own configured result', async () => {
    const engine: FakeTranscriptEngine = new FakeTranscriptEngine({
      tracks: { en: Result.ok(SEGMENTS), 'pt-BR': Result.fail<TranscriptSegment[]>(ErrorCode.RATE_LIMITED) },
    });
    expect((await engine.downloadTrack(VIDEO, EN)).instance).toEqual(SEGMENTS);
    expect((await engine.downloadTrack(VIDEO, PT_BR)).errors).toEqual([ErrorCode.RATE_LIMITED]);
  });

  test('fails loudly when an operation or a track was not configured (a test never calls the engine by accident)', async () => {
    const engine: FakeTranscriptEngine = new FakeTranscriptEngine({ tracks: { en: Result.ok(SEGMENTS) } });
    await expect(engine.getVideoInfo(VIDEO)).rejects.toThrow(/getVideoInfo not configured/);
    await expect(engine.downloadTrack(VIDEO, PT_BR)).rejects.toThrow(/downloadTrack not configured for pt-BR/);
  });

  test('records every call, in order, with the video ID and the track', async () => {
    const engine: FakeTranscriptEngine = new FakeTranscriptEngine({ videoInfo: Result.ok(INFO), tracks: { en: Result.ok(SEGMENTS) } });
    await engine.getVideoInfo(VIDEO);
    await engine.downloadTrack(VIDEO, EN);
    expect(engine.calls).toEqual([
      { operation: 'getVideoInfo', videoId: 'iG9CE55wbtY' },
      { operation: 'downloadTrack', videoId: 'iG9CE55wbtY', track: EN },
    ]);
  });

  test('starts with no calls', () => {
    expect(new FakeTranscriptEngine({}).calls).toEqual([]);
  });
});
