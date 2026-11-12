// Finds the yt-dlp executable. yt-dlp is private to the MCP:
//   1. YT_DLP_PATH, when set, must point to an existing file;
//   2. otherwise the MCP's private folder: ~/.mcp-legendas-youtube/yt-dlp.exe (yt-dlp outside Windows);
//   3. nothing else. The system PATH is NOT used: a yt-dlp installed in the system is not picked up.

import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';
import { YtDlpRelease } from '../install/ytDlp-release.js';
import type { Environment } from '../environment.js';

export class YtDlpExecutableLocator {
  private static readonly VARIABLE: string = 'YT_DLP_PATH';
  private static readonly PRIVATE_FOLDER: string = '.mcp-legendas-youtube';

  static locate(
    environment: Environment,
    fileExists: (path: string) => boolean = existsSync,
    homeFolder: string = homedir(),
    platform: NodeJS.Platform = process.platform,
  ): Result<string> {
    const configured: string = YtDlpExecutableLocator.configured(environment);
    const candidate: string = configured !== '' ? configured : YtDlpExecutableLocator.privatePath(homeFolder, platform);
    if (fileExists(candidate)) return Result.ok<string>(candidate);
    return Result.fail<string>(ErrorCode.ENGINE_NOT_FOUND);
  }

  /** Where it looked, for the log. */
  static whereItLooked(environment: Environment, homeFolder: string = homedir(), platform: NodeJS.Platform = process.platform): string {
    const configured: string = YtDlpExecutableLocator.configured(environment);
    if (configured !== '') return `${YtDlpExecutableLocator.VARIABLE}="${configured}"`;
    return `pasta privada do MCP: "${YtDlpExecutableLocator.privatePath(homeFolder, platform)}"`;
  }

  private static configured(environment: Environment): string {
    return (environment[YtDlpExecutableLocator.VARIABLE] ?? '').trim();
  }

  /** ~/.mcp-legendas-youtube: where the installer puts yt-dlp. */
  static privateFolder(homeFolder: string = homedir()): string {
    return join(homeFolder, YtDlpExecutableLocator.PRIVATE_FOLDER);
  }

  /** ~/.mcp-legendas-youtube/yt-dlp.exe on Windows; ~/.mcp-legendas-youtube/yt-dlp elsewhere (same name the installer uses). */
  private static privatePath(homeFolder: string, platform: NodeJS.Platform): string {
    return join(YtDlpExecutableLocator.privateFolder(homeFolder), YtDlpRelease.installedName(platform));
  }
}
