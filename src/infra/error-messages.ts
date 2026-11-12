// The message of each error code, in Portuguese, for the user.
// One catalog for every place that shows an error: the MCP response (ResponsePresenter) and the canary report.

import { ErrorCode } from '../domain/shared/errorCode.js';

export class ErrorMessages {
  /** Record<ErrorCode, ...>: the compiler refuses a new code without a message. */
  private static readonly MESSAGES: Readonly<Record<ErrorCode, string>> = {
    [ErrorCode.RESULT_UNDEFINED]: 'Erro interno: o resultado veio vazio.',
    [ErrorCode.UNEXPECTED]: 'Erro inesperado ao obter a legenda. O detalhe está no log do servidor.',
    [ErrorCode.INVALID_URL]:
      'Link inválido. Envie um link do YouTube (youtube.com/watch?v=..., youtu.be/..., /shorts/... ou /embed/...) ou o ID de 11 caracteres do vídeo.',
    [ErrorCode.INVALID_LANGUAGE]:
      'Idioma inválido. Envie um único código de idioma, como "pt", "pt-BR" ou "en" (converta o nome do idioma para o código), ou deixe vazio para o idioma original do vídeo.',
    [ErrorCode.VIDEO_UNAVAILABLE]: 'Vídeo indisponível: ele não existe, é privado ou foi removido.',
    [ErrorCode.VIDEO_REMOVED]: 'Este vídeo foi removido pelo autor e não existe mais no YouTube.',
    [ErrorCode.VIDEO_PRIVATE]: 'Este vídeo é privado. O MCP não usa conta do YouTube, então não consegue obter esta legenda. Não tente obter a legenda por outro caminho.',
    [ErrorCode.MEMBERS_ONLY]: 'Este vídeo é exclusivo para membros do canal. O MCP não usa conta do YouTube, então não consegue obter esta legenda. Não tente obter a legenda por outro caminho.',
    [ErrorCode.AGE_RESTRICTED]:
      'Este vídeo tem restrição de idade, e o YouTube pede login para confirmar a idade. O MCP não usa conta do YouTube, então não consegue obter esta legenda. Não tente obter a legenda por outro caminho.',
    [ErrorCode.LIVE_NOT_STARTED]: 'Esta transmissão ao vivo ainda não começou. A legenda só existe depois que a transmissão terminar; peça de novo depois disso.',
    [ErrorCode.LIVE_IN_PROGRESS]: 'Este vídeo é uma transmissão ao vivo em andamento. A legenda só existe depois que a transmissão terminar; peça de novo depois disso.',
    [ErrorCode.NO_CAPTIONS]: 'Este vídeo não tem nenhuma legenda no YouTube.',
    [ErrorCode.NO_CAPTIONS_FOR_LANGUAGE]: 'Não há legenda no idioma pedido.',
    [ErrorCode.RATE_LIMITED]:
      'O YouTube recusou o pedido por excesso de requisições (429). Não tente de novo agora: repetir piora o bloqueio. Aguarde alguns minutos.',
    [ErrorCode.ENGINE_NOT_FOUND]: 'O yt-dlp não foi encontrado. Rode "npm run instalar" na pasta do MCP, ou defina a variável YT_DLP_PATH com o caminho dele.',
    [ErrorCode.ENGINE_FAILED]: 'O motor de legendas (yt-dlp) falhou. O detalhe está no log do servidor.',
    [ErrorCode.ENGINE_OUTPUT]: 'O motor de legendas devolveu uma resposta inesperada.',
    [ErrorCode.TIMEOUT]: 'O motor de legendas demorou demais para responder. Não tente de novo agora; tente mais tarde.',
    [ErrorCode.VTT_PARSE]: 'Não foi possível ler o arquivo da legenda.',
    [ErrorCode.FILE_WRITE_FAILED]: 'Não foi possível salvar o arquivo da legenda. O detalhe está no log do servidor.',
    // Installer codes: getting a caption never returns them (the installer has its own texts, in InstallReportText).
    // They are here only because every code needs a message; if one ever shows up, it is an internal error.
    [ErrorCode.UNSUPPORTED_SYSTEM]: 'Erro interno: sistema não suportado pelo instalador do yt-dlp.',
    [ErrorCode.DOWNLOAD_FAILED]: 'Erro interno: falha ao baixar o yt-dlp na instalação.',
    [ErrorCode.CHECKSUM_NOT_LISTED]: 'Erro interno: o arquivo do yt-dlp não está na lista de checksums.',
    [ErrorCode.CHECKSUM_MISMATCH]: 'Erro interno: o checksum do yt-dlp baixado não confere.',
    [ErrorCode.VERSION_MISMATCH]: 'Erro interno: o yt-dlp instalado não tem a versão esperada.',
  };

  static of(code: ErrorCode): string {
    return ErrorMessages.MESSAGES[code];
  }
}
