// Tests for VideoInfoParser: the JSON of "yt-dlp -J" becomes the domain's VideoInfo.
// Real fixtures: test/fixtures/ytdlp/info-*.json (reduced, no URLs).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { VideoInfoParser } from '../../../src/infra/engine/videoInfo-parser.js';
import type { VideoInfo } from '../../../src/domain/generics-vo.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

function fixture(name: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', 'ytdlp', name), 'utf-8');
}

function parse(json: string): VideoInfo {
  const infoReturn: Result<VideoInfo> = VideoInfoParser.parse(json);
  expect(infoReturn.isOk).toBe(true);
  return infoReturn.instance;
}

describe('real consultations', () => {
  test('live stream in progress: isLive, no duration, no language, one automatic "en"', () => {
    const info: VideoInfo = parse(fixture('info-ao-vivo.json'));
    expect(info.isLive).toBe(true);
    expect(info.durationSeconds).toBeNull();
    expect(info.originalLanguage).toBeNull();
    expect(info.manual).toEqual([]);
    expect(info.automatic).toEqual(['en']);
  });

  test('a normal video is not live', () => {
    expect(parse(fixture('info-ted.json')).isLive).toBe(false);
  });

  test('TED: title, language, duration, channel, date as YYYY-MM-DD, both lists', () => {
    const info: VideoInfo = parse(fixture('info-ted.json'));
    expect(info.title).toBe('Do schools kill creativity? | Sir Ken Robinson | TED');
    expect(info.originalLanguage).toBe('en');
    expect(info.durationSeconds).toBe(1203);
    expect(info.channel).toBe('TED');
    expect(info.uploadDate).toBe('2007-01-07');
    expect(info.manual).toHaveLength(64);
    expect(info.manual).toEqual(expect.arrayContaining(['en', 'pt-BR', 'pt-PT']));
    expect(info.automatic).toHaveLength(163);
    expect(info.automatic).toContain('en-orig');
  });

  test('video in Portuguese: language pt-BR, no manual, pt-orig and en-orig', () => {
    const info: VideoInfo = parse(fixture('info-video-pt.json'));
    expect(info.title).toBe('Você ainda usa o Claude do jeito antigo (Claude 2.0)');
    expect(info.originalLanguage).toBe('pt-BR');
    expect(info.manual).toEqual([]);
    expect(info.automatic).toEqual(expect.arrayContaining(['pt-orig', 'en-orig']));
  });

  test('clip without captions: no caption at all, language unknown', () => {
    const info: VideoInfo = parse(fixture('info-sem-legenda.json'));
    expect(info.hasCaptions).toBe(false);
    expect(info.originalLanguage).toBeNull();
  });

  test('"Me at the zoo": language unknown, two manual captions', () => {
    const info: VideoInfo = parse(fixture('info-idioma-nulo.json'));
    expect(info.originalLanguage).toBeNull();
    expect(info.manual).toEqual(['en', 'de']);
    expect(info.durationSeconds).toBe(19);
    expect(info.uploadDate).toBe('2005-04-24');
  });
});

describe('missing or strange fields become null or empty, never an error', () => {
  test('only the title: everything else null or empty', () => {
    const info: VideoInfo = parse('{"title":"t"}');
    expect(info).toMatchObject({
      originalLanguage: null,
      durationSeconds: null,
      channel: null,
      uploadDate: null,
      manual: [],
      automatic: [],
      isLive: false,
    });
  });

  test.each([
    ['language that is not text', '{"title":"t","language":5}', 'originalLanguage', null],
    ['negative duration', '{"title":"t","duration":-3}', 'durationSeconds', null],
    ['duration that is not a number', '{"title":"t","duration":"20"}', 'durationSeconds', null],
    ['channel that is not text', '{"title":"t","channel":["TED"]}', 'channel', null],
    ['date in another format', '{"title":"t","upload_date":"2007-01-07"}', 'uploadDate', null],
    ['captions list that is not an object', '{"title":"t","subtitles":["en"]}', 'manual', []],
    ['live that already ended (was_live) is not live', '{"title":"t","live_status":"was_live"}', 'isLive', false],
    ['live_status that is not text', '{"title":"t","live_status":true}', 'isLive', false],
  ])('%s', (_case: string, json: string, field: string, expected: unknown) => {
    expect((parse(json) as unknown as Record<string, unknown>)[field]).toEqual(expected);
  });

  test('"live_chat" (chat replay of live streams) is not a caption', () => {
    expect(parse('{"title":"t","subtitles":{"live_chat":[],"en":[]}}').manual).toEqual(['en']);
  });
});

describe('unusable output: ENGINE_OUTPUT', () => {
  test.each([
    ['not JSON', 'ERROR: something'],
    ['empty', ''],
    ['JSON that is not an object', '["title"]'],
    ['null', 'null'],
    ['no title', '{"language":"en"}'],
  ])('%s', (_case: string, json: string) => {
    expect(VideoInfoParser.parse(json).errors).toEqual([ErrorCode.ENGINE_OUTPUT]);
  });
});
