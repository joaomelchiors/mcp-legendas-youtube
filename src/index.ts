// Entry point (composition root): builds the pieces and connects the server to stdio.
// engine (yt-dlp) -> use case -> tool (+ file writer) -> server -> stdio.
// Only this file knows every layer.

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetTranscript } from './domain/getTranscript-usecase.js';
import type { TranscriptEngine } from './domain/transcriptEngine-ports.js';
import { YtDlpEngine } from './infra/engine/ytDlp-engine.js';
import { YtDlpExecutableLocator } from './infra/engine/ytDlpExecutable-locator.js';
import { GetTranscriptTool } from './infra/mcp/getTranscript-tool.js';
import { McpServerFactory } from './infra/mcp/mcp-server.js';
import { FolderFileWriter } from './infra/storage/folderFile-writer.js';
import { TranscriptsFolder } from './infra/storage/transcripts-folder.js';
import { Log } from './infra/log.js';
import { ErrorText } from './infra/error-text.js';
import { Project } from './infra/project.js';

async function start(): Promise<void> {
  const isYtDlpFound: boolean = YtDlpExecutableLocator.locate(process.env).isOk;
  Log.write(`yt-dlp: ${YtDlpExecutableLocator.whereItLooked(process.env)}${isYtDlpFound ? '' : ' (não encontrado)'}`);

  const writer: FolderFileWriter = new FolderFileWriter(TranscriptsFolder.from(process.env));
  Log.write(`legendas: ${writer.folder}`);

  const engine: TranscriptEngine = YtDlpEngine.fromEnvironment(process.env);
  const tool: GetTranscriptTool = new GetTranscriptTool(new GetTranscript(engine), writer);
  const server: Server = McpServerFactory.create(tool);
  await server.connect(new StdioServerTransport());
  Log.write(`versão ${Project.VERSION} iniciada (stdio)`);
}

start().catch((error: unknown) => {
  Log.write(`falha ao iniciar: ${ErrorText.of(error)}`);
  process.exit(1);
});
