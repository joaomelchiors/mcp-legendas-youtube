// Tests for InstallReportText: what João reads in the terminal at the end of "npm run instalar".

import { InstallReportText } from '../../../src/infra/install/installReport-text.js';
import type { InstallReport } from '../../../src/infra/install/ytDlp-installer.js';
import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode } from '../../../src/domain/shared/errorCode.js';

const COMMAND: string = 'claude mcp add --scope user mcp-legendas-youtube -- node "C:\\mcp\\dist\\index.js"';

describe('InstallReportText.success', () => {
  test('downloaded now: version, path, checksum checked, and the registration command', () => {
    const report: InstallReport = { path: 'C:\\Users\\joao\\.mcp-legendas-youtube\\yt-dlp.exe', version: '2026.10.26', downloaded: true };
    expect(InstallReportText.success(report, COMMAND)).toBe(
      [
        'yt-dlp 2026.10.26 pronto em C:\\Users\\joao\\.mcp-legendas-youtube\\yt-dlp.exe',
        '(baixado do GitHub oficial; checksum conferido)',
        '',
        'Para registrar o MCP no Claude Code, rode:',
        `  ${COMMAND}`,
        '',
      ].join('\n'),
    );
  });

  test('already installed: says it was not downloaded again', () => {
    const report: InstallReport = { path: 'x', version: '2026.10.26', downloaded: false };
    expect(InstallReportText.success(report, COMMAND)).toContain('(já estava instalado; checksum conferido)');
  });
});

describe('InstallReportText.failure', () => {
  test.each([
    [ErrorCode.UNSUPPORTED_SYSTEM, 'Este sistema não tem um yt-dlp oficial que o instalador conheça.'],
    [ErrorCode.DOWNLOAD_FAILED, 'Não foi possível baixar do GitHub. Confira a internet e rode de novo.'],
    [ErrorCode.CHECKSUM_NOT_LISTED, 'A lista de checksums da versão não tem o arquivo deste sistema. Nada foi instalado.'],
    [
      ErrorCode.CHECKSUM_MISMATCH,
      'O checksum do arquivo baixado não confere: ele não é o publicado pelo projeto e foi descartado. Nada foi instalado.',
    ],
    [
      ErrorCode.FILE_WRITE_FAILED,
      'Não foi possível gravar o yt-dlp na pasta privada. Se o Claude estiver aberto, feche-o (o MCP usa o arquivo) e rode de novo.',
    ],
    [ErrorCode.ENGINE_FAILED, 'O yt-dlp instalado não respondeu ao --version.'],
    [ErrorCode.VERSION_MISMATCH, 'O yt-dlp instalado respondeu outra versão.'],
    [ErrorCode.UNEXPECTED, 'Erro inesperado no instalador.'],
  ])('%s', (code: ErrorCode, message: string) => {
    const text: string = InstallReportText.failure(new Result<unknown>(undefined, [code], 'o detalhe'));
    expect(text).toBe(`Instalação NÃO concluída: ${message}\nDetalhe: o detalhe\n`);
  });

  test('a code the installer does not use: the unexpected message, with the code', () => {
    const text: string = InstallReportText.failure(Result.fail<unknown>(ErrorCode.VTT_PARSE));
    expect(text).toBe('Instalação NÃO concluída: Erro inesperado no instalador. (VTT_PARSE)\n');
  });

  test('a cause with "message" (an exception): shows the message', () => {
    const text: string = InstallReportText.failure(
      new Result<unknown>(undefined, [ErrorCode.FILE_WRITE_FAILED], { message: 'EPERM: operation not permitted' }),
    );
    expect(text).toContain('\nDetalhe: EPERM: operation not permitted\n');
  });

  test('a cause of another kind: shown as text', () => {
    const text: string = InstallReportText.failure(new Result<unknown>(undefined, [ErrorCode.DOWNLOAD_FAILED], 42));
    expect(text).toContain('\nDetalhe: 42\n');
  });
});
