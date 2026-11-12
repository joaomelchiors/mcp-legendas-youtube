// Tests for YtDlpExecutableLocator:
// 1. YT_DLP_PATH, when set, must point to an existing file;
// 2. otherwise the MCP's private folder: ~/.mcp-legendas-youtube/yt-dlp.exe (yt-dlp outside Windows);
// 3. nothing else: the system PATH is NOT used (yt-dlp stays private to the MCP).

import { join } from 'node:path';
import { YtDlpExecutableLocator } from '../../../src/infra/engine/ytDlpExecutable-locator.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

const HOME: string = 'C:/Users/fulano';
const PRIVATE_WINDOWS: string = join(HOME, '.mcp-legendas-youtube', 'yt-dlp.exe');
const PRIVATE_LINUX: string = join(HOME, '.mcp-legendas-youtube', 'yt-dlp');

function existing(...paths: string[]): (path: string) => boolean {
  return (path: string): boolean => paths.includes(path);
}

describe('YtDlpExecutableLocator.locate', () => {
  test('YT_DLP_PATH pointing to an existing file: that file, even if the private folder also has one', () => {
    const files = existing('C:/ferramentas/yt-dlp.exe', PRIVATE_WINDOWS);
    expect(YtDlpExecutableLocator.locate({ YT_DLP_PATH: 'C:/ferramentas/yt-dlp.exe' }, files, HOME, 'win32').instance).toBe(
      'C:/ferramentas/yt-dlp.exe',
    );
  });

  test('YT_DLP_PATH pointing to nothing: ENGINE_NOT_FOUND (no silent fallback)', () => {
    const files = existing(PRIVATE_WINDOWS);
    expect(YtDlpExecutableLocator.locate({ YT_DLP_PATH: 'C:/errado/yt-dlp.exe' }, files, HOME, 'win32').errors).toEqual([
      ErrorCode.ENGINE_NOT_FOUND,
    ]);
  });

  test('without YT_DLP_PATH, on Windows: the private folder, yt-dlp.exe', () => {
    expect(YtDlpExecutableLocator.locate({}, existing(PRIVATE_WINDOWS), HOME, 'win32').instance).toBe(PRIVATE_WINDOWS);
  });

  test('without YT_DLP_PATH, on Linux or Mac: the private folder, yt-dlp without extension', () => {
    expect(YtDlpExecutableLocator.locate({}, existing(PRIVATE_LINUX), HOME, 'linux').instance).toBe(PRIVATE_LINUX);
  });

  test('YT_DLP_PATH empty or only spaces counts as not set', () => {
    expect(YtDlpExecutableLocator.locate({ YT_DLP_PATH: '  ' }, existing(PRIVATE_WINDOWS), HOME, 'win32').instance).toBe(PRIVATE_WINDOWS);
  });

  test('without YT_DLP_PATH and without the private file: ENGINE_NOT_FOUND, the system PATH is not tried', () => {
    const executableReturn: Result<string> = YtDlpExecutableLocator.locate({}, existing(), HOME, 'win32');
    expect(executableReturn.errors).toEqual([ErrorCode.ENGINE_NOT_FOUND]);
  });

  test('by default it checks the real file system, the real home folder and the real platform', () => {
    expect(YtDlpExecutableLocator.locate({ YT_DLP_PATH: process.execPath }).instance).toBe(process.execPath);
  });
});

describe('YtDlpExecutableLocator.whereItLooked (for the log when yt-dlp is not found)', () => {
  test('without YT_DLP_PATH: the private folder', () => {
    expect(YtDlpExecutableLocator.whereItLooked({}, HOME, 'win32')).toBe(`pasta privada do MCP: "${PRIVATE_WINDOWS}"`);
  });

  test('with YT_DLP_PATH: the configured path', () => {
    expect(YtDlpExecutableLocator.whereItLooked({ YT_DLP_PATH: ' C:/errado/yt-dlp.exe ' }, HOME, 'win32')).toBe(
      'YT_DLP_PATH="C:/errado/yt-dlp.exe"',
    );
  });

  test('by default it uses the real home folder and platform', () => {
    expect(YtDlpExecutableLocator.whereItLooked({})).toMatch(/pasta privada do MCP: ".*\.mcp-legendas-youtube/);
  });
});

describe('YtDlpExecutableLocator.privateFolder (where the installer puts yt-dlp)', () => {
  test('~/.mcp-legendas-youtube', () => {
    expect(YtDlpExecutableLocator.privateFolder(HOME)).toBe(join(HOME, '.mcp-legendas-youtube'));
  });

  test('by default it uses the real home folder', () => {
    expect(YtDlpExecutableLocator.privateFolder()).toMatch(/\.mcp-legendas-youtube$/);
  });
});
