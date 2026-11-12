// Turns the use case Result into the text the LLM reads (the domain only has codes;
// the infra layer turns each code into a message). Messages are in Portuguese, for the user.

import { TrackName, type Transcript } from '../../domain/transcript.js';
import { ErrorCode, type AvailableCaptions, type ErrorDetails } from '../../domain/shared/errorCode.js';
import type { Result } from '../../domain/shared/result.js';
import { TranscriptFormatter } from './transcript-formatter.js';
import { UntrustedContent } from './untrusted-content.js';

export class ResponsePresenter {
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
    // Installer codes: the tool never returns them; the messages exist only because every code has one.
    [ErrorCode.UNSUPPORTED_SYSTEM]: 'Erro interno: sistema não suportado pelo instalador do yt-dlp.',
    [ErrorCode.DOWNLOAD_FAILED]: 'Erro interno: falha ao baixar o yt-dlp na instalação.',
    [ErrorCode.CHECKSUM_NOT_LISTED]: 'Erro interno: o arquivo do yt-dlp não está na lista de checksums.',
    [ErrorCode.CHECKSUM_MISMATCH]: 'Erro interno: o checksum do yt-dlp baixado não confere.',
    [ErrorCode.VERSION_MISMATCH]: 'Erro interno: o yt-dlp instalado não tem a versão esperada.',
  };

  /** Header and running text with time markers (TranscriptFormatter), inside the block of video content. */
  static success(transcript: Transcript): string {
    return UntrustedContent.wrap(TranscriptFormatter.format(transcript));
  }

  /** First line of the response: where the file was saved, or a warning that it was not. */
  static fileLine(savedReturn: Result<string>): string {
    if (savedReturn.isOk) return `Arquivo salvo: ${savedReturn.instance}`;
    return `Aviso: ${ResponsePresenter.failure(savedReturn.errors!, undefined)}`;
  }

  static failure(errors: readonly ErrorCode[], details: ErrorDetails | undefined): string {
    const messages: string[] = errors.map((code: ErrorCode) => ResponsePresenter.MESSAGES[code]);
    if (details?.available !== undefined) messages.push(ResponsePresenter.availableText(details.available));
    return messages.join('\n');
  }

  /** Manual and automatic originals by name; translations only counted (TED has more than 160). */
  private static availableText(available: AvailableCaptions): string {
    const originals: string[] = available.automatic.filter((name: string) => TrackName.isOriginal(name));
    const translations: number = available.automatic.length - originals.length;
    return [
      `Legendas revisadas (manuais): ${ResponsePresenter.listOrNone(available.manual)}.`,
      `Geradas automaticamente do áudio: ${ResponsePresenter.listOrNone(originals)}.`,
      `Há também ${translations} traduções automáticas.`,
      'Peça de novo com um desses códigos de idioma.',
    ].join('\n');
  }

  private static listOrNone(names: readonly string[]): string {
    return names.length > 0 ? names.join(', ') : 'nenhuma';
  }
}
