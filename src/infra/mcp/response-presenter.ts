// Turns the use case Result into the text the LLM reads. The domain only has codes;
// the message of each code comes from ErrorMessages (in Portuguese, for the user).

import { TrackName, type Transcript } from '../../domain/transcript.js';
import { ErrorCode, type AvailableCaptions, type ErrorDetails } from '../../domain/shared/errorCode.js';
import type { Result } from '../../domain/shared/result.js';
import { ErrorMessages } from '../error-messages.js';
import { TranscriptFormatter } from './transcript-formatter.js';
import { UntrustedContent } from './untrusted-content.js';

export class ResponsePresenter {
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
    const messages: string[] = errors.map((code: ErrorCode) => ErrorMessages.of(code));
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
