// Puts the official yt-dlp of the fixed version in the MCP's private folder (~/.mcp-legendas-youtube/).
// Steps:
//   1. the official file of this system (YtDlpRelease);
//   2. the official checksum list of the same version, and the checksum of that file in it;
//   3. a yt-dlp already in the folder with that checksum is kept (nothing downloaded);
//   4. otherwise downloads the file and checks the checksum IN MEMORY: only a matching file is saved
//      (written under a temporary name and then renamed, so a half-written yt-dlp is never left);
//   5. runs the saved yt-dlp with --version and checks it answers the fixed version.
// Every failure is a Result with the cause, never an exception. A file that does not match is never saved.

import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';
import type { CommandResult, CommandRunner } from '../engine/command-runner.js';
import { YtDlpArgumentsBuilder } from '../engine/ytDlpArguments-builder.js';
import type { Downloader } from './fetch-downloader.js';
import { Sha256Sums } from './sha256-sums.js';
import { YtDlpRelease } from './ytDlp-release.js';

export interface InstallReport {
  /** Full path of the installed yt-dlp. */
  readonly path: string;
  readonly version: string;
  /** false when the yt-dlp already in the folder was kept. */
  readonly downloaded: boolean;
}

export class YtDlpInstaller {
  private static readonly VERSION_TIMEOUT_MS: number = 30_000;
  private static readonly TEMPORARY_SUFFIX: string = '.baixando';

  constructor(
    private readonly downloader: Downloader,
    private readonly runner: CommandRunner,
    private readonly folder: string,
    private readonly platform: NodeJS.Platform,
    private readonly arch: string,
  ) {}

  async install(version: string): Promise<Result<InstallReport>> {
    const assetReturn: Result<string> = YtDlpRelease.assetFor(this.platform, this.arch);
    if (assetReturn.isFailure) return assetReturn.propagate<InstallReport>();

    const expectedReturn: Result<string> = await this.expectedChecksum(version, assetReturn.instance);
    if (expectedReturn.isFailure) return expectedReturn.propagate<InstallReport>();

    const path: string = join(this.folder, YtDlpRelease.installedName(this.platform));
    const isInstalled: boolean = await YtDlpInstaller.hasChecksum(path, expectedReturn.instance);
    if (!isInstalled) {
      const savedReturn: Result<string> = await this.downloadAndSave(version, assetReturn.instance, path, expectedReturn.instance);
      if (savedReturn.isFailure) return savedReturn.propagate<InstallReport>();
    }

    const confirmedReturn: Result<string> = await this.confirmVersion(path, version);
    if (confirmedReturn.isFailure) return confirmedReturn.propagate<InstallReport>();
    return Result.ok<InstallReport>({ path, version, downloaded: !isInstalled });
  }

  /** Downloads the official list of the version and returns the checksum of the asset in it. */
  private async expectedChecksum(version: string, asset: string): Promise<Result<string>> {
    const sumsReturn: Result<Buffer> = await this.downloader.download(YtDlpRelease.url(version, YtDlpRelease.SUMS_FILE));
    if (sumsReturn.isFailure) return sumsReturn.propagate<string>();
    return Sha256Sums.expectedFor(sumsReturn.instance.toString('utf-8'), asset);
  }

  /** true when the file exists and its checksum is the expected one. A missing file is simply false. */
  private static async hasChecksum(path: string, expected: string): Promise<boolean> {
    try {
      return Sha256Sums.of(await readFile(path)) === expected;
    } catch {
      return false;
    }
  }

  private async downloadAndSave(version: string, asset: string, path: string, expected: string): Promise<Result<string>> {
    const fileReturn: Result<Buffer> = await this.downloader.download(YtDlpRelease.url(version, asset));
    if (fileReturn.isFailure) return fileReturn.propagate<string>();

    const downloaded: string = Sha256Sums.of(fileReturn.instance);
    const isOfficial: boolean = downloaded === expected;
    if (!isOfficial) {
      return Result.failWithCause<string>(ErrorCode.CHECKSUM_MISMATCH, `esperado ${expected}, baixado ${downloaded}`);
    }
    return this.save(path, fileReturn.instance);
  }

  /** Writes under a temporary name, marks as executable (outside Windows) and renames over the old file. */
  private async save(path: string, content: Buffer): Promise<Result<string>> {
    const temporary: string = `${path}${YtDlpInstaller.TEMPORARY_SUFFIX}`;
    try {
      await mkdir(this.folder, { recursive: true });
      await writeFile(temporary, content);
      await chmod(temporary, 0o755);
      await rename(temporary, path);
      return Result.ok<string>(path);
    } catch (error: unknown) {
      await YtDlpInstaller.discard(temporary);
      return Result.failWithCause<string>(ErrorCode.FILE_WRITE_FAILED, error);
    }
  }

  /** Removes a half-written temporary file. If even that fails, the write error above is the one that matters. */
  private static async discard(path: string): Promise<void> {
    try {
      await rm(path, { force: true });
    } catch {
      // nothing else to do
    }
  }

  private async confirmVersion(path: string, version: string): Promise<Result<string>> {
    const run: CommandResult = await this.runner.run(path, YtDlpArgumentsBuilder.version(), YtDlpInstaller.VERSION_TIMEOUT_MS);
    const hasRun: boolean = run.exitCode === 0;
    if (!hasRun) return Result.failWithCause<string>(ErrorCode.ENGINE_FAILED, run.stderr.trim());

    const answered: string = run.stdout.trim();
    const isFixedVersion: boolean = answered === version;
    if (!isFixedVersion) return Result.failWithCause<string>(ErrorCode.VERSION_MISMATCH, `esperada ${version}, respondeu ${answered}`);
    return Result.ok<string>(answered);
  }
}
