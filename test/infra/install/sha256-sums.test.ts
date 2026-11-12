// Tests for Sha256Sums: reads the official checksum list (SHA2-256SUMS) and computes the checksum of a file.
// Real fixture: test/fixtures/install/SHA2-256SUMS (version 2026.10.26).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Sha256Sums } from '../../../src/infra/install/sha256-sums.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

const REAL_SUMS: string = readFileSync(join(__dirname, '..', '..', 'fixtures', 'install', 'SHA2-256SUMS'), 'utf-8');

describe('Sha256Sums.expectedFor: the checksum of one file in the list', () => {
  test.each([
    ['yt-dlp.exe', 'f5389d3698ecde4ef06f4e6b1ce0294fe9ac1396228c8990b8d3416d6d177a7d'],
    ['yt-dlp', 'e51e69e89489f199530f13d32a4342da3ddb2cf34842f364603a066db05afbf3'],
    ['yt-dlp_linux', '767ba9dce7052aa196f8b12652f433d76de128ba168966fa84b6394d5e6c6795'],
    ['yt-dlp_macos', '0f922c15ccc0b83eefa1c8bc9104e434318c4bf16e408e1ee93b7745a6efe0aa'],
  ])('%s: the exact name, never a similar one (.zip, .tar.gz, .exe)', (asset: string, checksum: string) => {
    const expectedReturn: Result<string> = Sha256Sums.expectedFor(REAL_SUMS, asset);
    expect(expectedReturn.isOk).toBe(true);
    expect(expectedReturn.instance).toBe(checksum);
  });

  test('a file that is not in the list: CHECKSUM_NOT_LISTED, with the name', () => {
    const expectedReturn: Result<string> = Sha256Sums.expectedFor(REAL_SUMS, 'yt-dlp_solaris');
    expect(expectedReturn.errors).toEqual([ErrorCode.CHECKSUM_NOT_LISTED]);
    expect(String(expectedReturn.cause)).toBe('yt-dlp_solaris');
  });

  test('an empty list (e.g. a page that is not the list): CHECKSUM_NOT_LISTED', () => {
    expect(Sha256Sums.expectedFor('', 'yt-dlp.exe').errors).toEqual([ErrorCode.CHECKSUM_NOT_LISTED]);
  });

  test('accepts Windows line breaks, an uppercase checksum and the "*" of binary mode; returns lowercase', () => {
    const text: string = `${'A'.repeat(64)} *yt-dlp.exe\r\n${'b'.repeat(64)}  yt-dlp\r\n`;
    expect(Sha256Sums.expectedFor(text, 'yt-dlp.exe').instance).toBe('a'.repeat(64));
    expect(Sha256Sums.expectedFor(text, 'yt-dlp').instance).toBe('b'.repeat(64));
  });

  test('ignores lines that are not "checksum  name" (short checksum, letters outside hexadecimal)', () => {
    const text: string = `abc123  yt-dlp.exe\n${'z'.repeat(64)}  yt-dlp\n`;
    expect(Sha256Sums.expectedFor(text, 'yt-dlp.exe').errors).toEqual([ErrorCode.CHECKSUM_NOT_LISTED]);
    expect(Sha256Sums.expectedFor(text, 'yt-dlp').errors).toEqual([ErrorCode.CHECKSUM_NOT_LISTED]);
  });
});

describe('Sha256Sums.of: the checksum of a content', () => {
  test('known value of "abc" (lowercase hexadecimal)', () => {
    expect(Sha256Sums.of(Buffer.from('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
