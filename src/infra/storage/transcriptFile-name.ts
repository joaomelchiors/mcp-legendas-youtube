// The standard name of the saved file:
// "publicationDate_title_language_ID.md", e.g. "2007-01-07_do-schools-kill-creativity-sir-ken-robinson-ted_pt-BR_iG9CE55wbtY.md".
// Only letters, digits, "-" and "_": safe on Windows, Linux and Mac.

import type { Transcript } from '../../domain/transcript.js';

export class TranscriptFileName {
  private static readonly MAX_TITLE_LENGTH: number = 60;
  private static readonly NO_DATE: string = 'sem-data';
  private static readonly NO_TITLE: string = 'sem-titulo';
  private static readonly EXTENSION: string = '.md';

  static for(transcript: Transcript): string {
    const date: string = transcript.uploadDate ?? TranscriptFileName.NO_DATE;
    const title: string = TranscriptFileName.slug(transcript.title);
    const language: string = transcript.language.replace(/[^A-Za-z0-9-]/g, '-');
    return `${date}_${title}_${language}_${transcript.videoId}${TranscriptFileName.EXTENSION}`;
  }

  /** "Você ainda usa o Claude (2.0)" -> "voce-ainda-usa-o-claude-2-0". */
  private static slug(title: string): string {
    const plain: string = title
      .normalize('NFD')
      .replace(/\p{M}/gu, '') // accents and cedilla: "ç" -> "c", "ã" -> "a"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const short: string = TranscriptFileName.cut(plain);
    return short === '' ? TranscriptFileName.NO_TITLE : short;
  }

  /** At most 60 letters, cut at the last hyphen before the limit so no word is cut in half. */
  private static cut(slug: string): string {
    if (slug.length <= TranscriptFileName.MAX_TITLE_LENGTH) return slug;
    const limited: string = slug.slice(0, TranscriptFileName.MAX_TITLE_LENGTH);
    const lastHyphen: number = limited.lastIndexOf('-');
    return lastHyphen > 0 ? limited.slice(0, lastHyphen) : limited;
  }
}
