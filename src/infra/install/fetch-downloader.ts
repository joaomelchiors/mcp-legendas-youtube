// Downloads a file and returns its bytes. The interface lets the installer be tested without network.
// FetchDownloader uses the fetch of Node (18+), follows redirects (GitHub sends files from another address)
// and has a time limit. Any failure becomes DOWNLOAD_FAILED with the cause, never an exception.

import { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';

export interface Downloader {
  download(url: string): Promise<Result<Buffer>>;
}

export class FetchDownloader implements Downloader {
  constructor(private readonly timeoutMs: number) {}

  async download(url: string): Promise<Result<Buffer>> {
    try {
      const response: Response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
      if (!response.ok) return Result.failWithCause<Buffer>(ErrorCode.DOWNLOAD_FAILED, `HTTP ${response.status} em ${url}`);
      return Result.ok<Buffer>(Buffer.from(await response.arrayBuffer()));
    } catch (error: unknown) {
      return Result.failWithCause<Buffer>(ErrorCode.DOWNLOAD_FAILED, error);
    }
  }
}
