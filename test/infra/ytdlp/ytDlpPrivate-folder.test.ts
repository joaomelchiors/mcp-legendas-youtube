// Tests for YtDlpPrivateFolder: where the MCP's own yt-dlp lives (~/.mcp-legendas-youtube/) and its name there.
// The installer writes it there; the locator looks for it there. Both use this one piece.

import { join } from 'node:path';
import { YtDlpPrivateFolder } from '../../../src/infra/ytdlp/ytDlpPrivate-folder.js';

const HOME: string = 'C:/Users/fulano';

describe('YtDlpPrivateFolder.path', () => {
  test('~/.mcp-legendas-youtube', () => {
    expect(YtDlpPrivateFolder.path(HOME)).toBe(join(HOME, '.mcp-legendas-youtube'));
  });

  test('by default it uses the real home folder', () => {
    expect(YtDlpPrivateFolder.path()).toMatch(/\.mcp-legendas-youtube$/);
  });
});

describe('YtDlpPrivateFolder.executableName: the name of yt-dlp in the folder', () => {
  test('Windows: yt-dlp.exe, whatever the processor', () => {
    expect(YtDlpPrivateFolder.executableName('win32')).toBe('yt-dlp.exe');
  });

  test.each(['linux', 'darwin'])('%s: yt-dlp', (platform: string) => {
    expect(YtDlpPrivateFolder.executableName(platform as NodeJS.Platform)).toBe('yt-dlp');
  });
});

describe('YtDlpPrivateFolder.executablePath: the folder plus the name', () => {
  test('Windows', () => {
    expect(YtDlpPrivateFolder.executablePath(HOME, 'win32')).toBe(join(HOME, '.mcp-legendas-youtube', 'yt-dlp.exe'));
  });

  test('Linux', () => {
    expect(YtDlpPrivateFolder.executablePath(HOME, 'linux')).toBe(join(HOME, '.mcp-legendas-youtube', 'yt-dlp'));
  });
});
