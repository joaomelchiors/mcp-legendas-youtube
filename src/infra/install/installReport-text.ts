// What the installer shows at the end of "npm run instalar": where yt-dlp is and the two registration commands,
// or why the installation did not finish (a sentence per error code, plus the detail).

import type { Result } from '../../domain/shared/result.js';
import { ErrorCode } from '../../domain/shared/errorCode.js';
import type { InstallReport } from './ytDlp-installer.js';
import type { RegistrationCommands } from './registration-command.js';

export class InstallReportText {
  private static readonly UNEXPECTED: string = 'Erro inesperado no instalador.';

  private static readonly MESSAGES: Readonly<Partial<Record<ErrorCode, string>>> = {
    [ErrorCode.UNSUPPORTED_SYSTEM]: 'Este sistema não tem um yt-dlp oficial que o instalador conheça.',
    [ErrorCode.DOWNLOAD_FAILED]: 'Não foi possível baixar do GitHub. Confira a internet e rode de novo.',
    [ErrorCode.CHECKSUM_NOT_LISTED]: 'A lista de checksums da versão não tem o arquivo deste sistema. Nada foi instalado.',
    [ErrorCode.CHECKSUM_MISMATCH]:
      'O checksum do arquivo baixado não confere: ele não é o publicado pelo projeto e foi descartado. Nada foi instalado.',
    [ErrorCode.FILE_WRITE_FAILED]:
      'Não foi possível gravar o yt-dlp na pasta privada. Se o Claude estiver aberto, feche-o (o MCP usa o arquivo) e rode de novo.',
    [ErrorCode.ENGINE_FAILED]: 'O yt-dlp instalado não respondeu ao --version.',
    [ErrorCode.VERSION_MISMATCH]: 'O yt-dlp instalado respondeu outra versão.',
    [ErrorCode.UNEXPECTED]: InstallReportText.UNEXPECTED,
  };

  static success(report: InstallReport, commands: RegistrationCommands): string {
    const how: string = report.downloaded ? 'baixado do GitHub oficial' : 'já estava instalado';
    return [
      `yt-dlp ${report.version} pronto em ${report.path}`,
      `(${how}; checksum conferido)`,
      '',
      'Para registrar o MCP no Claude Code, escolha UM dos comandos:',
      '',
      '  Em qualquer pasta onde abrir o Claude (recomendado):',
      `    ${commands.user}`,
      '',
      '  Só em uma pasta (rode o comando dentro dela):',
      `    ${commands.local}`,
      '',
      'Depois, abra uma conversa nova no Claude.',
      '',
    ].join('\n');
  }

  static failure(failed: Result<unknown>): string {
    const code: ErrorCode = failed.errors![0]!;
    const known: string | undefined = InstallReportText.MESSAGES[code];
    const message: string = known ?? `${InstallReportText.UNEXPECTED} (${code})`;
    const hasCause: boolean = failed.cause !== undefined;
    const detail: string = hasCause ? `Detalhe: ${InstallReportText.describe(failed.cause)}\n` : '';
    return `Instalação NÃO concluída: ${message}\n${detail}`;
  }

  /** The message of an exception (checked by shape: errors from Node may come from another Error class), or the text. */
  private static describe(cause: unknown): string {
    const hasMessage: boolean = typeof cause === 'object' && cause !== null && typeof (cause as { message?: unknown }).message === 'string';
    return hasMessage ? (cause as { message: string }).message : String(cause);
  }
}
