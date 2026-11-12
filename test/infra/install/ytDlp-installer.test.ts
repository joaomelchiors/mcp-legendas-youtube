// Tests for YtDlpInstaller: puts the official yt-dlp of the fixed version in the MCP's private folder.
// No network (FakeDownloader plays GitHub) and no real yt-dlp (FakeCommandRunner answers --version).
// The private folder is a real temporary folder, removed at the end.
// Rule: the file is only saved after its checksum matches the official list; a wrong file is never saved.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YtDlpInstaller, type InstallReport } from '../../../src/infra/install/ytDlp-installer.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';
import { FakeDownloader } from '../../support/fakeDownloader.js';
import { FakeCommandRunner, finished } from '../../support/fakeCommandRunner.js';

const VERSION: string = '2026.10.26';
const RELEASE: string = `https://github.com/yt-dlp/yt-dlp/releases/download/${VERSION}`;
const SUMS_URL: string = `${RELEASE}/SHA2-256SUMS`;
const EXE_URL: string = `${RELEASE}/yt-dlp.exe`;
const LINUX_URL: string = `${RELEASE}/yt-dlp_linux`;

const GOOD_EXE: Buffer = Buffer.from('yt-dlp oficial para Windows');
const GOOD_LINUX: Buffer = Buffer.from('yt-dlp oficial para Linux');
const TAMPERED: Buffer = Buffer.from('arquivo trocado no caminho');

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/** The official list, in the real format: "<checksum>  <name>". */
const SUMS: Buffer = Buffer.from(`${sha256(GOOD_EXE)}  yt-dlp.exe\n${sha256(GOOD_LINUX)}  yt-dlp_linux\n`);

/** yt-dlp answering --version with the given text. */
function versionRunner(stdout: string = `${VERSION}\n`, exitCode: number = 0): FakeCommandRunner {
  return new FakeCommandRunner(() => finished(exitCode, stdout, exitCode === 0 ? '' : 'ERROR: algo deu errado'));
}

let sandbox: string;
let folder: string;
beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'mcp-legendas-instalar-'));
  folder = join(sandbox, '.mcp-legendas-youtube');
});
afterEach(() => {
  rmSync(sandbox, { recursive: true, force: true });
});

function windowsInstaller(downloader: FakeDownloader, runner: FakeCommandRunner = versionRunner()): YtDlpInstaller {
  return new YtDlpInstaller(downloader, runner, folder, 'win32', 'x64');
}

describe('first installation (nothing in the private folder)', () => {
  test('downloads the list and the file, creates the folder, saves the exact bytes and reports where', async () => {
    const downloader: FakeDownloader = new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE });
    const installReturn: Result<InstallReport> = await windowsInstaller(downloader).install(VERSION);

    expect(installReturn.isOk).toBe(true);
    expect(installReturn.instance).toEqual({ path: join(folder, 'yt-dlp.exe'), version: VERSION, downloaded: true });
    expect(downloader.requested).toEqual([SUMS_URL, EXE_URL]);
    expect(readFileSync(join(folder, 'yt-dlp.exe'))).toEqual(GOOD_EXE);
  });

  test('leaves only the executable in the folder (no temporary file)', async () => {
    await windowsInstaller(new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE })).install(VERSION);
    expect(readdirSync(folder)).toEqual(['yt-dlp.exe']);
  });

  test('confirms by running the saved file with --ignore-config --version', async () => {
    const runner: FakeCommandRunner = versionRunner();
    await windowsInstaller(new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE }), runner).install(VERSION);
    expect(runner.calls).toHaveLength(1);
    expect(runner.calls[0]!.executable).toBe(join(folder, 'yt-dlp.exe'));
    expect(runner.calls[0]!.args).toEqual(['--ignore-config', '--version']);
  });
});

describe('the checksum does not match (file corrupted or swapped on the way)', () => {
  test('CHECKSUM_MISMATCH with both checksums; nothing saved and yt-dlp never run', async () => {
    const runner: FakeCommandRunner = versionRunner();
    const installReturn: Result<InstallReport> = await windowsInstaller(
      new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: TAMPERED }),
      runner,
    ).install(VERSION);

    expect(installReturn.errors).toEqual([ErrorCode.CHECKSUM_MISMATCH]);
    expect(String(installReturn.cause)).toBe(`esperado ${sha256(GOOD_EXE)}, baixado ${sha256(TAMPERED)}`);
    expect(existsSync(join(folder, 'yt-dlp.exe'))).toBe(false);
    expect(existsSync(folder) ? readdirSync(folder) : []).toEqual([]);
    expect(runner.calls).toHaveLength(0);
  });

  test('a yt-dlp already in the folder (older version) stays untouched', async () => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'yt-dlp.exe'), 'versão antiga');
    await windowsInstaller(new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: TAMPERED })).install(VERSION);
    expect(readFileSync(join(folder, 'yt-dlp.exe'), 'utf-8')).toBe('versão antiga');
  });
});

describe('a yt-dlp already in the private folder', () => {
  test('with the right checksum: no download of the file (only the list), still confirms the version', async () => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'yt-dlp.exe'), GOOD_EXE);
    const downloader: FakeDownloader = new FakeDownloader({ [SUMS_URL]: SUMS });
    const runner: FakeCommandRunner = versionRunner();

    const installReturn: Result<InstallReport> = await windowsInstaller(downloader, runner).install(VERSION);

    expect(installReturn.instance).toEqual({ path: join(folder, 'yt-dlp.exe'), version: VERSION, downloaded: false });
    expect(downloader.requested).toEqual([SUMS_URL]);
    expect(runner.calls).toHaveLength(1);
  });

  test('with another checksum (another version): downloads and replaces it', async () => {
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'yt-dlp.exe'), 'versão antiga');
    const installReturn: Result<InstallReport> = await windowsInstaller(
      new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE }),
    ).install(VERSION);

    expect(installReturn.instance.downloaded).toBe(true);
    expect(readFileSync(join(folder, 'yt-dlp.exe'))).toEqual(GOOD_EXE);
  });
});

describe('network failure', () => {
  test('on the list: DOWNLOAD_FAILED, the file is not even requested, nothing saved', async () => {
    const downloader: FakeDownloader = new FakeDownloader({});
    const installReturn: Result<InstallReport> = await windowsInstaller(downloader).install(VERSION);

    expect(installReturn.errors).toEqual([ErrorCode.DOWNLOAD_FAILED]);
    expect(String(installReturn.cause)).toBe(`sem rede: ${SUMS_URL}`);
    expect(downloader.requested).toEqual([SUMS_URL]);
    expect(existsSync(join(folder, 'yt-dlp.exe'))).toBe(false);
  });

  test('on the file: DOWNLOAD_FAILED, nothing saved', async () => {
    const installReturn: Result<InstallReport> = await windowsInstaller(new FakeDownloader({ [SUMS_URL]: SUMS })).install(VERSION);
    expect(installReturn.errors).toEqual([ErrorCode.DOWNLOAD_FAILED]);
    expect(existsSync(join(folder, 'yt-dlp.exe'))).toBe(false);
  });
});

describe('before downloading the file', () => {
  test('the list does not have the file of this system: CHECKSUM_NOT_LISTED, the file is not requested', async () => {
    const downloader: FakeDownloader = new FakeDownloader({ [SUMS_URL]: Buffer.from(`${sha256(GOOD_LINUX)}  yt-dlp_linux\n`) });
    const installReturn: Result<InstallReport> = await windowsInstaller(downloader).install(VERSION);

    expect(installReturn.errors).toEqual([ErrorCode.CHECKSUM_NOT_LISTED]);
    expect(downloader.requested).toEqual([SUMS_URL]);
  });

  test('a system without an official yt-dlp: UNSUPPORTED_SYSTEM, nothing downloaded', async () => {
    const downloader: FakeDownloader = new FakeDownloader({});
    const installReturn: Result<InstallReport> = await new YtDlpInstaller(downloader, versionRunner(), folder, 'freebsd', 'x64').install(
      VERSION,
    );

    expect(installReturn.errors).toEqual([ErrorCode.UNSUPPORTED_SYSTEM]);
    expect(downloader.requested).toEqual([]);
  });
});

describe('Linux (and macOS): another file on GitHub, saved as "yt-dlp"', () => {
  test('downloads yt-dlp_linux and saves it as yt-dlp, marked as executable', async () => {
    const downloader: FakeDownloader = new FakeDownloader({ [SUMS_URL]: SUMS, [LINUX_URL]: GOOD_LINUX });
    const installReturn: Result<InstallReport> = await new YtDlpInstaller(downloader, versionRunner(), folder, 'linux', 'x64').install(
      VERSION,
    );

    expect(installReturn.instance.path).toBe(join(folder, 'yt-dlp'));
    expect(downloader.requested).toEqual([SUMS_URL, LINUX_URL]);
    expect(readFileSync(join(folder, 'yt-dlp'))).toEqual(GOOD_LINUX);
    // Windows does not keep the "executable" mark, so it is only checked on the other systems.
    const isMarkKept: boolean = process.platform !== 'win32';
    if (isMarkKept) expect(statSync(join(folder, 'yt-dlp')).mode & 0o111).toBe(0o111);
  });
});

describe('the saved yt-dlp does not confirm', () => {
  test('--version fails: ENGINE_FAILED with what yt-dlp wrote', async () => {
    const installReturn: Result<InstallReport> = await windowsInstaller(
      new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE }),
      versionRunner('', 1),
    ).install(VERSION);

    expect(installReturn.errors).toEqual([ErrorCode.ENGINE_FAILED]);
    expect(String(installReturn.cause)).toBe('ERROR: algo deu errado');
  });

  test('--version answers another version: VERSION_MISMATCH with both', async () => {
    const installReturn: Result<InstallReport> = await windowsInstaller(
      new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE }),
      versionRunner('2025.01.01\n'),
    ).install(VERSION);

    expect(installReturn.errors).toEqual([ErrorCode.VERSION_MISMATCH]);
    expect(String(installReturn.cause)).toBe(`esperada ${VERSION}, respondeu 2025.01.01`);
  });
});

describe('the private folder cannot be written', () => {
  test('its path is a file: FILE_WRITE_FAILED with the cause, no exception, no temporary file left', async () => {
    writeFileSync(folder, 'sou um arquivo');
    let installReturn: Result<InstallReport> | undefined;
    await expect(
      (async () => {
        installReturn = await windowsInstaller(new FakeDownloader({ [SUMS_URL]: SUMS, [EXE_URL]: GOOD_EXE })).install(VERSION);
      })(),
    ).resolves.toBeUndefined();

    expect(installReturn!.errors).toEqual([ErrorCode.FILE_WRITE_FAILED]);
    expect((installReturn!.cause as { code?: string }).code).toMatch(/^E[A-Z]+$/);
    expect(readdirSync(sandbox)).toEqual(['.mcp-legendas-youtube']);
  });
});
