// Where the MCP's own yt-dlp lives: ~/.mcp-legendas-youtube/yt-dlp.exe (yt-dlp outside Windows).
// The installer writes it there (YtDlpInstaller); the locator looks for it there (YtDlpExecutableLocator).
// Both use this one piece, so neither depends on the other.
// The folder name is written here on purpose, not taken from Project.NAME: it is a place on disk, and
// renaming the project must not move it (the yt-dlp already installed would be lost).

import { homedir } from 'node:os';
import { join } from 'node:path';

export class YtDlpPrivateFolder {
  private static readonly FOLDER: string = '.mcp-legendas-youtube';

  /** ~/.mcp-legendas-youtube */
  static path(homeFolder: string = homedir()): string {
    return join(homeFolder, YtDlpPrivateFolder.FOLDER);
  }

  /** yt-dlp.exe on Windows, yt-dlp elsewhere, whatever the processor (the official file is renamed on install). */
  static executableName(platform: NodeJS.Platform): string {
    return platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
  }

  /** The folder plus the name: the only yt-dlp the MCP uses when YT_DLP_PATH is not set. */
  static executablePath(homeFolder: string, platform: NodeJS.Platform): string {
    return join(YtDlpPrivateFolder.path(homeFolder), YtDlpPrivateFolder.executableName(platform));
  }
}
