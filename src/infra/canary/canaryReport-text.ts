// What the canary shows: the text João reads in the terminal, and the summary saved in
// canario/ultima-execucao.json to compare with the fixture info-ted.json when something changes.
// The summary has no URL: only what the MCP reads from the consultation.

import { TrackName, type VideoInfo } from '../../domain/generics-vo.js';
import { Canary, type CanaryReport, type CanaryStep } from './canary.js';
import { Project } from '../project.js';

export class CanaryReportText {
  static format(report: CanaryReport): string {
    const lines: string[] = [`Canário do ${Project.NAME} (vídeo do TED ${Canary.VIDEO_ID})`];
    report.steps.forEach((step: CanaryStep, index: number) => lines.push(CanaryReportText.stepLine(step, index + 1)));
    lines.push(CanaryReportText.resultLine(report));
    return `${lines.join('\n')}\n`;
  }

  static json(report: CanaryReport, when: Date): string {
    const summary: object = {
      quando: when.toISOString(),
      resultado: report.isOk ? 'OK' : 'FALHOU',
      etapas: report.steps,
      consulta: report.info === null ? null : CanaryReportText.infoSummary(report.info),
    };
    return `${JSON.stringify(summary, null, 2)}\n`;
  }

  private static stepLine(step: CanaryStep, number: number): string {
    const mark: string = step.isOk ? '[ok]    ' : '[FALHOU]';
    return `${mark} ${number}. ${step.name}: ${step.detail} (${step.seconds.toFixed(1)} s)`;
  }

  private static resultLine(report: CanaryReport): string {
    if (report.isOk) return 'Resultado: OK';
    const failed: number = report.steps.findIndex((step: CanaryStep) => !step.isOk);
    return `Resultado: FALHOU na etapa ${failed + 1} (${report.steps[failed]!.name})`;
  }

  /** Automatic captions only counted (TED has more than 160); the originals ("-orig") by name. */
  private static infoSummary(info: VideoInfo): object {
    return {
      title: info.title,
      originalLanguage: info.originalLanguage,
      durationSeconds: info.durationSeconds,
      channel: info.channel,
      uploadDate: info.uploadDate,
      isLive: info.isLive,
      manual: info.manual,
      automaticOriginals: info.automatic.filter((name: string) => TrackName.isOriginal(name)),
      automaticCount: info.automatic.length,
    };
  }
}
