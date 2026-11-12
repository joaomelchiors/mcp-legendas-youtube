// HOW the transcript is written in the saved Markdown file.
// "# title", the header fields as a list, a quoted warning when it is a fallback,
// then the running text with the markers as subtitles "## [10% - 02:00]". Ends with one line break.

import type { Transcript } from '../../domain/transcript.js';
import { TranscriptLayout, type HeaderField, type LayoutBlock } from '../../domain/transcriptLayout-service.js';

export class TranscriptMarkdown {
  static format(transcript: Transcript): string {
    const sections: string[] = [`# ${transcript.title}`, TranscriptMarkdown.headerList(transcript)];
    if (transcript.isOriginalFallback) sections.push(`> **Aviso:** ${TranscriptLayout.FALLBACK_WARNING}`);
    sections.push(...TranscriptLayout.blocks(transcript).map(TranscriptMarkdown.block));
    return `${sections.join('\n\n')}\n`;
  }

  private static headerList(transcript: Transcript): string {
    return TranscriptLayout.headerFields(transcript)
      .map((field: HeaderField) => `- ${field.label}: ${field.value}`)
      .join('\n');
  }

  /** Each marker as a subtitle, then the text, separated by blank lines (Markdown needs them). */
  private static block(block: LayoutBlock): string {
    const markers: string[] = block.markers.map((marker: string) => `## [${marker}]`);
    return [...markers, block.text].filter((part: string) => part !== '').join('\n\n');
  }
}
