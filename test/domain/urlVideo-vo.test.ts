// Tests for UrlVideo: which links give the video ID.
// A value object never throws for bad input: tryCreate returns Result.fail(code).

import { UrlVideo } from '../../src/domain/urlVideo-vo.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

const ID: string = 'OhCXEo3lE4A';

describe('UrlVideo.tryCreate: accepted inputs', () => {
  test.each([
    ['plain ID', ID, ID],
    ['plain ID with spaces around', `  ${ID}\n`, ID],
    ['ID with - and _', 'a-b_c-d_e-f', 'a-b_c-d_e-f'],
    ['watch with www', `https://www.youtube.com/watch?v=${ID}`, ID],
    ['watch without www', `https://youtube.com/watch?v=${ID}`, ID],
    ['watch on mobile (m.)', `https://m.youtube.com/watch?v=${ID}`, ID],
    ['watch with http', `http://www.youtube.com/watch?v=${ID}`, ID],
    ['watch without https://', `www.youtube.com/watch?v=${ID}`, ID],
    ['watch with uppercase host', `https://WWW.YOUTUBE.COM/watch?v=${ID}`, ID],
    ['watch with time', `https://www.youtube.com/watch?v=${ID}&t=42s`, ID],
    ['watch with v after other parameters', `https://www.youtube.com/watch?feature=share&v=${ID}`, ID],
    ['playlist link (playlist ignored)', 'https://www.youtube.com/watch?v=ZhCezZQqxx4&list=PLE-wFs0H2h9E&index=3', 'ZhCezZQqxx4'],
    ['youtu.be', `https://youtu.be/${ID}`, ID],
    ['youtu.be with ?si= from the Share button', `https://youtu.be/${ID}?si=abc123`, ID],
    ['shorts', `https://www.youtube.com/shorts/${ID}`, ID],
    ['shorts with parameter', `https://youtube.com/shorts/${ID}?feature=share`, ID],
    ['embed', `https://www.youtube.com/embed/${ID}`, ID],
    ['embed with parameters', `https://www.youtube.com/embed/${ID}?start=30&autoplay=1`, ID],
  ])('%s', (_case: string, input: string, expectedId: string) => {
    const urlVideoReturn: Result<UrlVideo> = UrlVideo.tryCreate(input);
    expect(urlVideoReturn.isOk).toBe(true);
    expect(urlVideoReturn.instance).toBeInstanceOf(UrlVideo);
    expect(urlVideoReturn.instance.id).toBe(expectedId);
  });
});

describe('UrlVideo.tryCreate: rejected inputs return INVALID_URL, without throwing', () => {
  test.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['ID with 10 characters', 'OhCXEo3lE4'],
    ['ID with 12 characters', 'OhCXEo3lE4AB'],
    ['ID with forbidden character', 'OhCXEo3lE4!'],
    ['any text', 'vídeo do gato'],
    ['another site', `https://vimeo.com/${ID}`],
    ['host imitating YouTube at the end', `https://youtube.com.exemplo.com/watch?v=${ID}`],
    ['host imitating YouTube at the start', `https://falsoyoutube.com/watch?v=${ID}`],
    ['ftp protocol', `ftp://www.youtube.com/watch?v=${ID}`],
    ['javascript:', `javascript:alert('${ID}')`],
    ['watch without v', 'https://www.youtube.com/watch?list=PLE-wFs0H2h9E'],
    ['watch with invalid v', 'https://www.youtube.com/watch?v=curto'],
    ['only the playlist', 'https://www.youtube.com/playlist?list=PLE-wFs0H2h9E'],
    ['channel', 'https://www.youtube.com/@canal'],
    ['youtu.be without ID', 'https://youtu.be/'],
    ['youtu.be with extra path', `https://youtu.be/${ID}/extra`],
    ['shorts without ID', 'https://www.youtube.com/shorts/'],
    ['embed without ID', 'https://www.youtube.com/embed/'],
    ['embed with extra path', `https://www.youtube.com/embed/${ID}/extra`],
  ])('%s', (_case: string, input: string) => {
    expectInvalidUrl(input);
  });
});

describe('UrlVideo.tryCreate: values that are not text (no zod at the door anymore)', () => {
  test.each([
    ['undefined', undefined],
    ['null', null],
    ['number', 123],
    ['object', { url: ID }],
    ['array', [ID]],
  ])('%s returns INVALID_URL, without throwing', (_case: string, input: unknown) => {
    expectInvalidUrl(input);
  });
});

function expectInvalidUrl(input: unknown): void {
  let urlVideoReturn: Result<UrlVideo> | undefined;
  expect(() => {
    urlVideoReturn = UrlVideo.tryCreate(input);
  }).not.toThrow();
  expect(urlVideoReturn!.isFailure).toBe(true);
  expect(urlVideoReturn!.errors).toEqual([ErrorCode.INVALID_URL]);
}

describe('UrlVideo.watchUrl: the one canonical link of the video', () => {
  test.each([
    ['from the plain ID', ID],
    ['from a short link with extra parameters', `https://youtu.be/${ID}?si=abc&t=42`],
    ['from a playlist link', `https://www.youtube.com/watch?v=${ID}&list=PLE-wFs0H2h9E&index=3`],
  ])('%s', (_case: string, input: string) => {
    expect(UrlVideo.tryCreate(input).instance.watchUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  test('watchUrlOf gives the same link for an ID kept as text (e.g. the videoId of a Transcript)', () => {
    expect(UrlVideo.watchUrlOf(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});
