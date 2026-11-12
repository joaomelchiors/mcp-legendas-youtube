// Entry point (composition root): builds the pieces and connects the server to stdio.
// runner + executable -> engine (yt-dlp) -> use case -> tool (+ file writer) -> server -> stdio.
// Only this file knows every layer.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetTranscript } from './domain/getTranscript-usecase.js';
import type { TranscriptEngine } from './domain/transcriptEngine-ports.js';
import { Result } from './domain/shared/result.js';
import { NodeCommandRunner } from './infra/engine/command-runner.js';
import { YtDlpEngine } from './infra/engine/ytDlp-engine.js';
import { YtDlpExecutableLocator } from './infra/engine/ytDlpExecutable-locator.js';
import { GetTranscriptTool } from './infra/mcp/getTranscript-tool.js';
import { McpServerFactory } from './infra/mcp/mcp-server.js';
import { TranscriptFileWriter } from './infra/storage/transcriptFile-writer.js';
import { Log } from './infra/log.js';

/** Time limit for each yt-dlp run. The consultations in the engine tests took a few seconds. */
const ENGINE_TIMEOUT_MS: number = 90_000;

async function start(): Promise<void> {
  const executable: Result<string> = YtDlpExecutableLocator.locate(process.env);
  Log.write(`yt-dlp: ${YtDlpExecutableLocator.whereItLooked(process.env)}${executable.isFailure ? ' (não encontrado)' : ''}`);

  const writer: TranscriptFileWriter = new TranscriptFileWriter(TranscriptFileWriter.folderFrom(process.env));
  Log.write(`legendas: ${writer.folder}`);

  const engine: TranscriptEngine = new YtDlpEngine(new NodeCommandRunner(), executable, ENGINE_TIMEOUT_MS);
  const tool: GetTranscriptTool = new GetTranscriptTool(new GetTranscript(engine), writer);
  const server: Server = McpServerFactory.create(tool);
  await server.connect(new StdioServerTransport());
  Log.write(`versão ${McpServerFactory.VERSION} iniciada (stdio)`);
}

start().catch((error: unknown) => {
  Log.write(`falha ao iniciar: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
