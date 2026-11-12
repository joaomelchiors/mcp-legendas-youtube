// Tests for CanaryReportText: what João reads in the terminal, and the summary saved
// in canario/ultima-execucao.json to compare with the fixture info-ted.json.

import { CanaryReportText } from '../../../src/infra/canary/canaryReport-text.js';
import type { CanaryReport, CanaryStep } from '../../../src/infra/canary/canary.js';
import { VideoInfo } from '../../../src/domain/videoInfo-vo.js';

const OK_STEPS: CanaryStep[] = [
  { name: 'versão do yt-dlp', isOk: true, detail: '2026.10.26', seconds: 0.42 },
  { name: 'consulta do vídeo', isOk: true, detail: 'título ok; idioma original en; manuais en e pt-BR', seconds: 3.1 },
  { name: 'download da legenda pt-BR', isOk: true, detail: '300 trechos', seconds: 2 },
];
const TED: VideoInfo = new VideoInfo('Do schools kill creativity?', 'en', ['en', 'pt-BR'], ['en-orig', 'pt', 'es'], 1203, 'TED', '2007-01-07');
const OK: CanaryReport = { steps: OK_STEPS, info: TED, isOk: true };
const FAILED: CanaryReport = {
  steps: [OK_STEPS[0]!, { name: 'consulta do vídeo', isOk: false, detail: 'RATE_LIMITED: muitos pedidos', seconds: 1.5 }],
  info: null,
  isOk: false,
};
const WHEN: Date = new Date('2026-11-11T22:50:00Z');

describe('format (terminal)', () => {
  test('all ok: title line, one numbered line per step with time, and "Resultado: OK"', () => {
    expect(CanaryReportText.format(OK)).toBe(
      [
        'Canário do mcp-legendas-youtube (vídeo do TED iG9CE55wbtY)',
        '[ok]     1. versão do yt-dlp: 2026.10.26 (0.4 s)',
        '[ok]     2. consulta do vídeo: título ok; idioma original en; manuais en e pt-BR (3.1 s)',
        '[ok]     3. download da legenda pt-BR: 300 trechos (2.0 s)',
        'Resultado: OK',
        '',
      ].join('\n'),
    );
  });

  test('failure: the failed step is marked and the result names it', () => {
    const text: string = CanaryReportText.format(FAILED);
    expect(text).toContain('[FALHOU] 2. consulta do vídeo: RATE_LIMITED: muitos pedidos (1.5 s)');
    expect(text).toContain('Resultado: FALHOU na etapa 2 (consulta do vídeo)');
    expect(text).not.toContain('3.');
  });
});

describe('json (saved summary)', () => {
  test('date, result, steps and the consultation reduced (automatic only counted, "-orig" by name)', () => {
    expect(JSON.parse(CanaryReportText.json(OK, WHEN))).toEqual({
      quando: '2026-11-11T22:50:00.000Z',
      resultado: 'OK',
      etapas: OK_STEPS,
      consulta: {
        title: 'Do schools kill creativity?',
        originalLanguage: 'en',
        durationSeconds: 1203,
        channel: 'TED',
        uploadDate: '2007-01-07',
        isLive: false,
        manual: ['en', 'pt-BR'],
        automaticOriginals: ['en-orig'],
        automaticCount: 3,
      },
    });
  });

  test('failure without consultation: "consulta" is null', () => {
    const summary: { resultado: string; consulta: unknown } = JSON.parse(CanaryReportText.json(FAILED, WHEN));
    expect(summary.resultado).toBe('FALHOU');
    expect(summary.consulta).toBeNull();
  });

  test('ends with a line break, like the other files', () => {
    expect(CanaryReportText.json(OK, WHEN).endsWith('}\n')).toBe(true);
  });
});
