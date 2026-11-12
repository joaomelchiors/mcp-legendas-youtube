// Domain service. WHAT goes in a transcript, shared by the two formats: the text of the response
// (TranscriptFormatter) and the Markdown file (TranscriptMarkdown). Each format only decides HOW to write it.
// Time markers at 10%, 25%, 50%, 75% and 90% of the duration, each one opening the block of the
// first segment that starts at or after its point.

import type { Transcript } from './getTranscript-usecase.js';
import { UrlVideo, type TranscriptSegment } from './generics-vo.js';

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

/** A block still being filled while the segments are read. */
interface OpenBlock {
  readonly markers: string[];
  readonly words: string[];
}

export class TranscriptLayout {
  static readonly FALLBACK_WARNING: string = 'a tradução pedida não pôde ser obtida; segue a legenda no idioma original do vídeo.';
  private static readonly MARKER_PERCENTS: readonly number[] = [10, 25, 50, 75, 90];

  /** The header fields the engine reported, in order; unknown ones are left out. */
  static headerFields(transcript: Transcript): HeaderField[] {
    const fields: HeaderField[] = [];
    if (transcript.channel !== null) fields.push({ label: 'Canal', value: transcript.channel });
    fields.push({ label: 'Link', value: UrlVideo.watchUrlOf(transcript.videoId) });
    if (transcript.uploadDate !== null) fields.push({ label: 'Publicado em', value: transcript.uploadDate });
    if (transcript.durationSeconds !== null) fields.push({ label: 'Duração', value: TranscriptLayout.time(transcript.durationSeconds) });
    fields.push({ label: 'Legenda', value: `${transcript.language}, ${TranscriptLayout.quality(transcript)}` });
    return fields;
  }

  /** The running text, split into blocks where the markers fall. Empty blocks are left out. */
  static blocks(transcript: Transcript): LayoutBlock[] {
    const markers: Marker[] = TranscriptLayout.markers(transcript);
    const blocks: OpenBlock[] = [{ markers: [], words: [] }];
    let nextMarker: number = 0;

    for (const segment of transcript.segments) {
      const due: string[] = TranscriptLayout.dueLabels(markers, nextMarker, segment.startSeconds);
      nextMarker += due.length;
      TranscriptLayout.place(blocks, due, segment.text);
    }
    // Markers after the last segment (or with no segments at all) close the text, without words of their own.
    TranscriptLayout.place(blocks, TranscriptLayout.labels(markers.slice(nextMarker)), null);

    return blocks
      .map((block: OpenBlock) => ({ markers: block.markers, text: block.words.join(' ') }))
      .filter((block: LayoutBlock) => block.markers.length > 0 || block.text !== '');
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

  /** The labels of the markers, from `from` on, whose point has been reached at `startSeconds`. Changes nothing. */
  private static dueLabels(markers: readonly Marker[], from: number, startSeconds: number): string[] {
    const pending: readonly Marker[] = markers.slice(from);
    const firstNotDue: number = pending.findIndex((marker: Marker) => marker.pointSeconds > startSeconds);
    return TranscriptLayout.labels(firstNotDue === -1 ? pending : pending.slice(0, firstNotDue));
  }

  private static labels(markers: readonly Marker[]): string[] {
    return markers.map((marker: Marker) => marker.label);
  }

  /**
   * Puts markers and a text in the last block. Markers that arrive after some text open a new block:
   * a marker always starts its block. A null text adds only the markers.
   */
  private static place(blocks: OpenBlock[], markerLabels: readonly string[], text: string | null): void {
    const last: OpenBlock = blocks[blocks.length - 1];
    const opensNewBlock: boolean = markerLabels.length > 0 && last.words.length > 0;
    if (opensNewBlock) blocks.push({ markers: [], words: [] });
    const target: OpenBlock = blocks[blocks.length - 1];
    target.markers.push(...markerLabels);
    if (text !== null) target.words.push(text);
  }
}
