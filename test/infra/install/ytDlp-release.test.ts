// Tests for YtDlpRelease: which official yt-dlp file each system uses, its name in the private folder,
// and the download address on the official GitHub. No network.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { YtDlpRelease } from '../../../src/infra/install/ytDlp-release.js';
import { Sha256Sums } from '../../../src/infra/install/sha256-sums.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

const REAL_SUMS: string = readFileSync(join(__dirname, '..', '..', 'fixtures', 'install', 'SHA2-256SUMS'), 'utf-8');

const SUPPORTED: [NodeJS.Platform, string, string][] = [
  ['win32', 'x64', 'yt-dlp.exe'],
  ['win32', 'ia32', 'yt-dlp_x86.exe'],
  ['win32', 'arm64', 'yt-dlp_arm64.exe'],
  ['darwin', 'x64', 'yt-dlp_macos'],
  ['darwin', 'arm64', 'yt-dlp_macos'],
  ['linux', 'x64', 'yt-dlp_linux'],
  ['linux', 'arm64', 'yt-dlp_linux_aarch64'],
];

describe('YtDlpRelease.assetFor: the official file of each system', () => {
  test.each(SUPPORTED)('%s %s -> %s', (platform: NodeJS.Platform, arch: string, asset: string) => {
    const assetReturn: Result<string> = YtDlpRelease.assetFor(platform, arch);
    expect(assetReturn.isOk).toBe(true);
    expect(assetReturn.instance).toBe(asset);
  });

  test.each(SUPPORTED)('%s %s: the file %s exists in the real checksum list of 2026.10.26', (platform: NodeJS.Platform, arch: string) => {
    const asset: string = YtDlpRelease.assetFor(platform, arch).instance;
    expect(Sha256Sums.expectedFor(REAL_SUMS, asset).isOk).toBe(true);
  });

  test.each([
    ['freebsd', 'x64'],
    ['linux', 'ia32'],
    ['win32', 'ppc64'],
  ])('%s %s: UNSUPPORTED_SYSTEM, saying which system it is', (platform: string, arch: string) => {
    const assetReturn: Result<string> = YtDlpRelease.assetFor(platform as NodeJS.Platform, arch);
    expect(assetReturn.errors).toEqual([ErrorCode.UNSUPPORTED_SYSTEM]);
    expect(String(assetReturn.cause)).toBe(`${platform} ${arch}`);
  });
});

describe('YtDlpRelease.url: always the official GitHub, always the fixed version', () => {
  test('the executable', () => {
    expect(YtDlpRelease.url('2026.10.26', 'yt-dlp.exe')).toBe('https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/yt-dlp.exe');
  });

  test('the checksum list of the same version', () => {
    expect(YtDlpRelease.url('2026.10.26', YtDlpRelease.SUMS_FILE)).toBe(
      'https://github.com/yt-dlp/yt-dlp/releases/download/2026.10.26/SHA2-256SUMS',
    );
  });
});
