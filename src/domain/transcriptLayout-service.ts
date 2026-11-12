// Domain service. WHAT goes in a transcript, shared by the two formats: the text of the response
// (TranscriptFormatter) and the Markdown file (TranscriptMarkdown). Each format only decides HOW to write it.
// Time markers at 10%, 25%, 50%, 75% and 90% of the duration, each one opening the block of the
// first segment that starts at or after its point.

import type { Transcript } from './getTranscript-usecase.js';
import type { TranscriptSegment } from './generics-vo.js';

/** One line of the header, e.g. { label: 'Canal', value: 'TED' }. The title is not a field. */
export interface HeaderField {
  readonly label: string;
  readonly value: string;
}

/** A piece of the running text, with the markers that open it ("10% - 02:00"). */
export interface LayoutBlock {
  readonly markers: readonly string[];
  readonly text: string;
}

interface Marker {
  readonly pointSeconds: number;
  readonly label: string;
}

export class TranscriptLayout {
  static readonly FALLBACK_WARNING: string = 'a tradução pedida não pôde ser obtida; segue a legenda no idioma original do vídeo.';
  private static readonly MARKER_PERCENTS: readonly number[] = [10, 25, 50, 75, 90];

  /** The header fields the engine reported, in order; unknown ones are left out. */
  static headerFields(transcript: Transcript): HeaderField[] {
    const fields: HeaderField[] = [];
    if (transcript.channel !== null) fields.push({ label: 'Canal', value: transcript.channel });
    fields.push({ label: 'Link', value: `https://www.youtube.com/watch?v=${transcript.videoId}` });
    if (transcript.uploadDate !== null) fields.push({ label: 'Publicado em', value: transcript.uploadDate });
    if (transcript.durationSeconds !== null) fields.push({ label: 'Duração', value: TranscriptLayout.time(transcript.durationSeconds) });
    fields.push({ label: 'Legenda', value: `${transcript.language}, ${TranscriptLayout.quality(transcript)}` });
    return fields;
  }

  /** The running text, split into blocks where the markers fall. Empty blocks are left out. */
  static blocks(transcript: Transcript): LayoutBlock[] {
    const markers: Marker[] = TranscriptLayout.markers(transcript);
    const blocks: LayoutBlock[] = [];
    let currentMarkers: string[] = [];
    let currentWords: string[] = [];

    for (const segment of transcript.segments) {
      const due: string[] = TranscriptLayout.takeDue(markers, segment.startSeconds);
      if (due.length > 0 && currentWords.length > 0) {
        blocks.push({ markers: currentMarkers, text: currentWords.join(' ') });
        currentMarkers = [];
        currentWords = [];
      }
      currentMarkers.push(...due);
      currentWords.push(segment.text);
    }

    const remaining: string[] = markers.map((marker: Marker) => marker.label);
    if (remaining.length > 0 && currentWords.length > 0) {
      blocks.push({ markers: currentMarkers, text: currentWords.join(' ') });
      currentMarkers = [];
      currentWords = [];
    }
    currentMarkers.push(...remaining);
    blocks.push({ markers: currentMarkers, text: currentWords.join(' ') });

    return blocks.filter((block: LayoutBlock) => block.markers.length > 0 || block.text !== '');
  }

  /** 100 -> "01:40"; 4000 -> "1:06:40". */
  static time(totalSeconds: number): string {
    const seconds: number = Math.floor(totalSeconds);
    const hours: number = Math.floor(seconds / 3600);
    const minutes: number = Math.floor((seconds % 3600) / 60);
    const rest: number = seconds % 60;
    const mmss: string = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${mmss}` : mmss;
  }

  private static quality(transcript: Transcript): string {
    if (transcript.kind === 'manual') return 'legenda revisada (feita por pessoa)';
    return 'gerada automaticamente (pode conter erros, principalmente em nomes próprios)';
  }

  /** The five markers; the total is the duration, or the start of the last segment when it is unknown. */
  private static markers(transcript: Transcript): Marker[] {
    const lastSegment: TranscriptSegment | undefined = transcript.segments[transcript.segments.length - 1];
    const total: number = transcript.durationSeconds ?? lastSegment?.startSeconds ?? 0;
    if (total <= 0) return [];
    return TranscriptLayout.MARKER_PERCENTS.map((percent: number) => {
      const pointSeconds: number = (total * percent) / 100;
      return { pointSeconds, label: `${percent}% - ${TranscriptLayout.time(pointSeconds)}` };
    });
  }

  /** Removes from the list, in order, the markers whose point has been reached, and returns their labels. */
  private static takeDue(markers: Marker[], startSeconds: number): string[] {
    const due: string[] = [];
    while (markers.length > 0 && markers[0].pointSeconds <= startSeconds) due.push(markers.shift()!.label);
    return due;
  }
}
