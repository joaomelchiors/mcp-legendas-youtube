// Entry point of the canary: npm run canario.
// Builds the same engine as the MCP (src/index.ts), runs the three checks on the TED video,
// shows the report in the terminal and saves the summary in canario/ultima-execucao.json.
// Ends with code 1 when a step fails. Like index.ts, it only connects pieces (no unit test).

import { join } from 'node:path';
import { Result } from './domain/shared/result.js';
import { YtDlpEngine } from './infra/engine/ytDlp-engine.js';
import { Canary, type CanaryReport } from './infra/canary/canary.js';
import { CanaryReportText } from './infra/canary/canaryReport-text.js';
import { ErrorText } from './infra/error-text.js';
import { FolderFileWriter } from './infra/storage/folderFile-writer.js';

const SUMMARY_FOLDER: string = 'canario';
const SUMMARY_FILE: string = 'ultima-execucao.json';

async function start(): Promise<void> {
  const engine: YtDlpEngine = YtDlpEngine.fromEnvironment(process.env);

  const report: CanaryReport = await new Canary(engine).run();
  process.stdout.write(CanaryReportText.format(report));

  const writer: FolderFileWriter = new FolderFileWriter(join(process.cwd(), SUMMARY_FOLDER));
  const savedReturn: Result<string> = await writer.save(SUMMARY_FILE, CanaryReportText.json(report, new Date()));
  process.stdout.write(savedReturn.isOk ? `Resumo salvo em ${savedReturn.instance}\n` : 'Não foi possível salvar o resumo.\n');

  process.exitCode = report.isOk ? 0 : 1;
}

start().catch((error: unknown) => {
  process.stdout.write(`Canário parou com erro inesperado: ${ErrorText.of(error)}\n`);
  process.exitCode = 1;
});
