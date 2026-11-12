// Where the official yt-dlp of each system is published, and the name it gets in the MCP's private folder.
// Only the official GitHub of yt-dlp, only the fixed version (kept in package.json, "config.ytDlpVersion").
// The file names are the ones in the official checksum list (test/fixtures/install/SHA2-256SUMS).

import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export class YtDlpRelease {
  static readonly SUMS_FILE: string = 'SHA2-256SUMS';
  private static readonly BASE_URL: string = 'https://github.com/yt-dlp/yt-dlp/releases/download';

  /** "<system> <processor>" -> the official file. Only single-file executables (no Python needed). */
  private static readonly ASSETS: Readonly<Record<string, string>> = {
    'win32 x64': 'yt-dlp.exe',
    'win32 ia32': 'yt-dlp_x86.exe',
    'win32 arm64': 'yt-dlp_arm64.exe',
    'darwin x64': 'yt-dlp_macos',
    'darwin arm64': 'yt-dlp_macos',
    'linux x64': 'yt-dlp_linux',
    'linux arm64': 'yt-dlp_linux_aarch64',
  };

  /** The official file for this system; UNSUPPORTED_SYSTEM (cause: "<system> <processor>") when there is none. */
  static assetFor(platform: NodeJS.Platform, arch: string): Result<string> {
    const system: string = `${platform} ${arch}`;
    const asset: string | undefined = YtDlpRelease.ASSETS[system];
    if (asset === undefined) return Result.failWithCause<string>(ErrorCode.UNSUPPORTED_SYSTEM, system);
    return Result.ok<string>(asset);
  }

  /** The name in the private folder: the one YtDlpExecutableLocator looks for. */
  static installedName(platform: NodeJS.Platform): string {
    return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  }

  static url(version: string, file: string): string {
    return `${YtDlpRelease.BASE_URL}/${version}/${file}`;
  }
}
