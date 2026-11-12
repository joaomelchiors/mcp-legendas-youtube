// Fake downloader: plays the part of GitHub in the installer tests. No network.
// Each address answers what the test gave; an address the test did not give fails with DOWNLOAD_FAILED.
// Every requested address is recorded, so a test can check what was (and was not) downloaded.

import type { Downloader } from '../../src/infra/install/fetch-downloader.js';
import { Result } from '../../src/domain/shared/result.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

export class FakeDownloader implements Downloader {
  readonly requested: string[] = [];

  constructor(private readonly files: Readonly<Record<string, Buffer>>) {}

  async download(url: string): Promise<Result<Buffer>> {
    this.requested.push(url);
    const content: Buffer | undefined = this.files[url];
    if (content === undefined) return Result.failWithCause<Buffer>(ErrorCode.DOWNLOAD_FAILED, `sem rede: ${url}`);
    return Result.ok<Buffer>(content);
  }
}
