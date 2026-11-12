// Reads the VTT file delivered by yt-dlp and returns segments with time.
// VTT is the engine's file format, so it is read here, in the infra layer; the domain only sees segments.
//
// Manual captions: one cue, one line of speech.
// Automatic captions are "rolling": each cue repeats the previous line and adds a new one, with
// word-by-word tags (<00:00:26.720><c> morning</c>). So a line only counts the first time it appears.

import type { TranscriptSegment } from '../../domain/transcript.js';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export class VttReader {
  private static readonly HEADER: string = 'WEBVTT';
  /** "00:00:26.560 --> ..." or "02:03.250 --> ..." (hours are optional in VTT). */
  private static readonly TIMING: RegExp = /^(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})\s+-->/;
  private static readonly TAG: RegExp = /<[^>]*>/g;
  private static readonly ENTITY: RegExp = /&(amp|lt|gt|quot|#39|nbsp);/g;
  private static readonly ENTITIES: Readonly<Record<string, string>> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    '#39': "'",
    nbsp: ' ',
  };

  static read(vtt: string): Result<TranscriptSegment[]> {
    const lines: string[] = VttReader.lines(vtt);
    if (!VttReader.hasHeader(lines)) return Result.fail<TranscriptSegment[]>(ErrorCode.VTT_PARSE);

    const segments: TranscriptSegment[] = VttReader.segments(VttReader.blocks(lines));
    if (segments.length === 0) return Result.fail<TranscriptSegment[]>(ErrorCode.VTT_PARSE);
    return Result.ok<TranscriptSegment[]>(segments);
  }

  private static lines(vtt: string): string[] {
    return vtt.replace(/^﻿/, '').split(/\r?\n/);
  }

  private static hasHeader(lines: string[]): boolean {
    return lines[0].startsWith(VttReader.HEADER);
  }

  private static blocks(lines: string[]): string[][] {
    const blocks: string[][] = [[]];
    for (const line of lines) {
      if (line === '') blocks.push([]);
      else blocks[blocks.length - 1].push(line);
    }
    return blocks;
  }

  private static segments(blocks: string[][]): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    for (const block of blocks) {
      const timingIndex: number = block.findIndex((line: string) => VttReader.TIMING.test(line));
      if (timingIndex === -1) continue; // header, NOTE, STYLE: not a cue

      const startSeconds: number = VttReader.startSeconds(block[timingIndex]);
      for (const line of block.slice(timingIndex + 1)) {
        const text: string = VttReader.clean(line);
        const isNewText: boolean = text !== '' && text !== segments[segments.length - 1]?.text;
        if (isNewText) segments.push({ startSeconds, text });
      }
    }
    return segments;
  }

  /** "00:00:26.560 --> ..." becomes 26.56. Computed in milliseconds to keep the exact value. */
  private static startSeconds(timingLine: string): number {
    const [, hours, minutes, seconds, milliseconds] = VttReader.TIMING.exec(timingLine)!;
    const totalMilliseconds: number =
      ((Number(hours ?? 0) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(milliseconds);
    return totalMilliseconds / 1000;
  }

  private static clean(line: string): string {
    return line
      .replace(VttReader.TAG, '')
      .replace(VttReader.ENTITY, (_entity: string, name: string) => VttReader.ENTITIES[name])
      .replace(/\s+/g, ' ')
      .trim();
  }
}
