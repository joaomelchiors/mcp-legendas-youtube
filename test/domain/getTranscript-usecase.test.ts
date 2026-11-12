// Tests for the GetTranscript use case.
// Flow: validate url and language -> ask the video info -> TrackSelection chooses the exact track
// -> download it (segments with time); when the preferred track is a translation and its download
// fails, download the fallback (best of the original language) and say so. The engine is the fake one.

import { GetTranscript, type Transcript } from '../../src/domain/getTranscript-usecase.js';
import { VideoInfo, type TranscriptSegment } from '../../src/domain/generics-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';
import { FakeTranscriptEngine, type FakeEngineConfig } from '../support/fakeTranscriptEngine.js';

const TED_URL: string = 'https://www.youtube.com/watch?v=iG9CE55wbtY&list=PLE-wFs0H2h9E';
const TED_ID: string = 'iG9CE55wbtY';
const TITLE: string = 'Do schools kill creativity? | Sir Ken Robinson | TED';
const TED: VideoInfo = new VideoInfo(TITLE, 'en', ['en', 'pt-BR'], ['en-orig', 'es'], 1203, 'TED', '2007-01-06');
const EN: TranscriptSegment[] = [{ startSeconds: 27.103, text: 'Good morning. How are you?' }];
const PT_BR: TranscriptSegment[] = [{ startSeconds: 27.1, text: 'Bom dia. Como vão?' }];
const ES: TranscriptSegment[] = [{ startSeconds: 27.2, text: 'Buenos días.' }];

function engineWith(config: FakeEngineConfig): FakeTranscriptEngine {
  return new FakeTranscriptEngine(config);
}

describe('invalid input: the engine is never called', () => {
  test('invalid URL returns INVALID_URL', async () => {
    const engine: FakeTranscriptEngine = engineWith({});
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute('https://vimeo.com/123', 'pt');
    expect(transcriptReturn.errors).toEqual([ErrorCode.INVALID_URL]);
    expect(engine.calls).toEqual([]);
  });

  test('invalid language returns INVALID_LANGUAGE', async () => {
    const engine: FakeTranscriptEngine = engineWith({});
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'all');
    expect(transcriptReturn.errors).toEqual([ErrorCode.INVALID_LANGUAGE]);
    expect(engine.calls).toEqual([]);
  });
});

describe('success: consult, then download the chosen track (two engine calls)', () => {
  test('no language: the original manual "en", with the video data and the segments', async () => {
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(TED), tracks: { en: Result.ok(EN) } });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, undefined);
    expect(transcriptReturn.instance).toEqual({
      videoId: TED_ID,
      title: TITLE,
      channel: 'TED',
      uploadDate: '2007-01-06',
      durationSeconds: 1203,
      language: 'en',
      kind: 'manual',
      segments: EN,
      isOriginalFallback: false,
    });
    expect(engine.calls).toEqual([
      { operation: 'getVideoInfo', videoId: TED_ID },
      { operation: 'downloadTrack', videoId: TED_ID, track: { language: 'en', kind: 'manual' } },
    ]);
  });

  test('"pt": downloads the manual pt-BR', async () => {
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(TED), tracks: { 'pt-BR': Result.ok(PT_BR) } });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'pt');
    expect(transcriptReturn.instance).toMatchObject({ language: 'pt-BR', kind: 'manual', segments: PT_BR });
  });

  test('missing video data (duration, channel, date) stay null in the transcript', async () => {
    const bare: VideoInfo = new VideoInfo(TITLE, 'en', ['en'], []);
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(bare), tracks: { en: Result.ok(EN) } });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, undefined);
    expect(transcriptReturn.instance).toMatchObject({ channel: null, uploadDate: null, durationSeconds: null });
  });
});

describe('translation with fallback to the original language', () => {
  test('translation downloaded: no fallback needed', async () => {
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(TED), tracks: { es: Result.ok(ES) } });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'es');
    expect(transcriptReturn.instance).toMatchObject({ language: 'es', kind: 'automatic', isOriginalFallback: false });
    expect(engine.calls).toHaveLength(2);
  });

  test('translation fails (429): downloads the original manual "en" and marks the fallback (three calls)', async () => {
    const engine: FakeTranscriptEngine = engineWith({
      videoInfo: Result.ok(TED),
      tracks: { es: Result.fail<TranscriptSegment[]>(ErrorCode.RATE_LIMITED), en: Result.ok(EN) },
    });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'es');
    expect(transcriptReturn.instance).toMatchObject({ language: 'en', kind: 'manual', segments: EN, isOriginalFallback: true });
    expect(engine.calls.map((call) => call.operation)).toEqual(['getVideoInfo', 'downloadTrack', 'downloadTrack']);
  });

  test('translation fails and the fallback fails too: the fallback failure is returned', async () => {
    const engine: FakeTranscriptEngine = engineWith({
      videoInfo: Result.ok(TED),
      tracks: {
        es: Result.fail<TranscriptSegment[]>(ErrorCode.RATE_LIMITED),
        en: Result.fail<TranscriptSegment[]>(ErrorCode.TIMEOUT),
      },
    });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'es');
    expect(transcriptReturn.errors).toEqual([ErrorCode.TIMEOUT]);
  });
});

describe('failures', () => {
  test('the consultation fails: returned, nothing is downloaded', async () => {
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.fail<VideoInfo>(ErrorCode.VIDEO_UNAVAILABLE) });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, undefined);
    expect(transcriptReturn.errors).toEqual([ErrorCode.VIDEO_UNAVAILABLE]);
    expect(engine.calls).toHaveLength(1);
  });

  test('nothing in the language: NO_CAPTIONS_FOR_LANGUAGE with the list, nothing is downloaded', async () => {
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(TED) });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'de');
    expect(transcriptReturn.errors).toEqual([ErrorCode.NO_CAPTIONS_FOR_LANGUAGE]);
    expect(transcriptReturn.details).toEqual({ available: { manual: TED.manual, automatic: TED.automatic } });
    expect(engine.calls).toHaveLength(1);
  });

  test('live stream in progress: LIVE_IN_PROGRESS, nothing is downloaded', async () => {
    const live: VideoInfo = new VideoInfo('NASA ao vivo', null, [], ['en'], null, 'NASA', '2026-10-22', true);
    const engine: FakeTranscriptEngine = engineWith({ videoInfo: Result.ok(live) });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, 'en');
    expect(transcriptReturn.errors).toEqual([ErrorCode.LIVE_IN_PROGRESS]);
    expect(engine.calls).toHaveLength(1);
  });

  test('a manual download fails: returned, with no fallback (fallback is only for translations)', async () => {
    const engine: FakeTranscriptEngine = engineWith({
      videoInfo: Result.ok(TED),
      tracks: { en: Result.fail<TranscriptSegment[]>(ErrorCode.TIMEOUT) },
    });
    const transcriptReturn: Result<Transcript> = await new GetTranscript(engine).execute(TED_URL, undefined);
    expect(transcriptReturn.errors).toEqual([ErrorCode.TIMEOUT]);
    expect(engine.calls).toHaveLength(2);
  });
});
