// Tests for ErrorMessages: the one catalog of messages, one per error code.
// Used by the MCP response (ResponsePresenter) and by the canary report.

import { ErrorMessages } from '../../src/infra/error-messages.js';
import { ErrorCode } from '../../src/domain/shared/errorCode.js';

const INSTALLER_CODES: readonly ErrorCode[] = [
  ErrorCode.UNSUPPORTED_SYSTEM,
  ErrorCode.DOWNLOAD_FAILED,
  ErrorCode.CHECKSUM_NOT_LISTED,
  ErrorCode.CHECKSUM_MISMATCH,
  ErrorCode.VERSION_MISMATCH,
];

describe('ErrorMessages.of', () => {
  test.each(Object.values(ErrorCode))('%s has a message', (code: ErrorCode) => {
    expect(ErrorMessages.of(code).trim()).not.toBe('');
  });

  test('each code has its own message', () => {
    const messages: string[] = Object.values(ErrorCode).map((code: ErrorCode) => ErrorMessages.of(code));
    expect(new Set(messages).size).toBe(messages.length);
  });

  test.each(INSTALLER_CODES)('%s (installer only) is an internal error when it shows up outside the installer', (code: ErrorCode) => {
    expect(ErrorMessages.of(code)).toMatch(/^Erro interno: /);
  });

  test('the message tells the user what to do (example: yt-dlp missing)', () => {
    expect(ErrorMessages.of(ErrorCode.ENGINE_NOT_FOUND)).toBe(
      'O yt-dlp não foi encontrado. Rode "npm run instalar" na pasta do MCP, ou defina a variável YT_DLP_PATH com o caminho dele.',
    );
  });
});
