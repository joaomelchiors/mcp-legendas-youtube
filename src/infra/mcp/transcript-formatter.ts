// HOW the transcript is written in the response the LLM receives (the layout is shared with the Markdown file).
// "Título: ...", one "Campo: valor" line per header field, "Aviso: ..." when it is a fallback,
// then the running text with the markers as "[10% - 02:00]".

import type { Transcript } from '../../domain/getTranscript-usecase.js';
import { TranscriptLayout, type HeaderField, type LayoutBlock } from '../../domain/transcriptLayout-service.js';

export class TranscriptFormatter {
  static format(transcript: Transcript): string {
    const header: string = TranscriptFormatter.header(transcript).join('\n');
    const body: string = TranscriptLayout.blocks(transcript).map(TranscriptFormatter.block).join('\n\n');
    return body === '' ? header : `${header}\n\n${body}`;
  }

  private static header(transcript: Transcript): string[] {
    const lines: string[] = [`Título: ${transcript.title}`];
    lines.push(...TranscriptLayout.headerFields(transcript).map((field: HeaderField) => `${field.label}: ${field.value}`));
    if (transcript.isOriginalFallback) lines.push(`Aviso: ${TranscriptLayout.FALLBACK_WARNING}`);
    return lines;
  }

  /** The markers, each in its own line as "[10% - 02:00]", then the text of the block. */
  private static block(block: LayoutBlock): string {
    const markers: string[] = block.markers.map((marker: string) => `[${marker}]`);
    return [...markers, block.text].filter((part: string) => part !== '').join('\n');
  }
}
