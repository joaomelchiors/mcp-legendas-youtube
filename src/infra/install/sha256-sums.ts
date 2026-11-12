// Reads the official checksum list of a yt-dlp version (SHA2-256SUMS) and computes the checksum of a content.
// Each line of the list: "<64 hexadecimal characters>  <file name>" ("*" before the name in binary mode).

import { createHash } from 'node:crypto';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export class Sha256Sums {
  private static readonly LINE: RegExp = /^([0-9a-fA-F]{64}) [ *](.+)$/;

  /** The checksum (lowercase) listed for exactly this file name; CHECKSUM_NOT_LISTED (cause: the name) otherwise. */
  static expectedFor(text: string, fileName: string): Result<string> {
    for (const line of text.split(/\r?\n/)) {
      const match: RegExpMatchArray | null = Sha256Sums.LINE.exec(line.trim());
      const isThisFile: boolean = match !== null && match[2] === fileName;
      if (isThisFile) return Result.ok<string>(match![1]!.toLowerCase());
    }
    return Result.failWithCause<string>(ErrorCode.CHECKSUM_NOT_LISTED, fileName);
  }

  /** SHA-256 of the content, in lowercase hexadecimal (the format of the list). */
  static of(content: Buffer): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
