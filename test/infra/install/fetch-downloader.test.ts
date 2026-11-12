// Tests for FetchDownloader: downloads a file and returns its bytes; any failure becomes DOWNLOAD_FAILED.
// No internet: a small HTTP server on this computer (127.0.0.1) plays the part of GitHub.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { FetchDownloader } from '../../../src/infra/install/fetch-downloader.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

let server: Server;
let address: string;

beforeAll(async () => {
  server = createServer((request: IncomingMessage, response: ServerResponse) => {
    if (request.url === '/arquivo') {
      response.end(Buffer.from([0, 1, 2, 255]));
    } else if (request.url === '/redireciona') {
      response.writeHead(302, { location: '/arquivo' }).end();
    } else if (request.url === '/demora') {
      // Never answers: the time limit must stop the download.
    } else {
      response.writeHead(404).end('não existe');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  address = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('FetchDownloader.download', () => {
  test('returns the exact bytes (binary file)', async () => {
    const downloadReturn: Result<Buffer> = await new FetchDownloader(5_000).download(`${address}/arquivo`);
    expect(downloadReturn.isOk).toBe(true);
    expect([...downloadReturn.instance]).toEqual([0, 1, 2, 255]);
  });

  test('follows redirects (GitHub sends the file from another address)', async () => {
    const downloadReturn: Result<Buffer> = await new FetchDownloader(5_000).download(`${address}/redireciona`);
    expect([...downloadReturn.instance]).toEqual([0, 1, 2, 255]);
  });

  test('HTTP error (e.g. 404, a version that does not exist): DOWNLOAD_FAILED with the status and the address', async () => {
    const downloadReturn: Result<Buffer> = await new FetchDownloader(5_000).download(`${address}/nao-existe`);
    expect(downloadReturn.errors).toEqual([ErrorCode.DOWNLOAD_FAILED]);
    expect(String(downloadReturn.cause)).toBe(`HTTP 404 em ${address}/nao-existe`);
  });

  test('no connection (nobody at the address): DOWNLOAD_FAILED with the cause, no exception', async () => {
    const closed: Server = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const port: number = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));

    const downloadReturn: Result<Buffer> = await new FetchDownloader(5_000).download(`http://127.0.0.1:${port}/arquivo`);
    expect(downloadReturn.errors).toEqual([ErrorCode.DOWNLOAD_FAILED]);
    expect(downloadReturn.cause).toBeDefined();
  });

  test('no answer within the time limit: DOWNLOAD_FAILED', async () => {
    const downloadReturn: Result<Buffer> = await new FetchDownloader(200).download(`${address}/demora`);
    expect(downloadReturn.errors).toEqual([ErrorCode.DOWNLOAD_FAILED]);
  });
});
