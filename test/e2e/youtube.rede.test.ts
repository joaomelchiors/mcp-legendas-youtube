// End-to-end test WITH network: the real server, the real yt-dlp (from the MCP's private folder) and the
// real YouTube, over stdio, like Claude Code. It is the manual test of phase 6.6, automated:
// ask for the transcript of the TED video (the canary's video, with stable manual captions) and check
// the answer and the saved Markdown file.
// NOT part of "npm test" (normal tests have no network). Run with: npm run e2e
// Like the canary, it never bypasses anything: if YouTube blocks, the test fails and says why.

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpProcess } from './support/mcpProcess.js';

const VIDEO_ID: string = 'iG9CE55wbtY';
const LANGUAGE: string = 'pt-BR';
const ENGINE_TIMEOUT_MS: number = 180_000;

let transcriptsFolder: string;
let mcp: McpProcess;
let result: CallToolResult;

beforeAll(async () => {
  transcriptsFolder = mkdtempSync(join(tmpdir(), 'mcp-legendas-e2e-rede-'));
  // No YT_DLP_PATH: the server looks in its private folder, where "npm run instalar" puts yt-dlp.
  mcp = await McpProcess.start({ LEGENDAS_DIR: transcriptsFolder });
  result = await mcp.getTranscript({ url: `https://www.youtube.com/watch?v=${VIDEO_ID}`, idioma: LANGUAGE }, ENGINE_TIMEOUT_MS);
}, ENGINE_TIMEOUT_MS + 20_000);

afterAll(async () => {
  await mcp.stop();
  rmSync(transcriptsFolder, { recursive: true, force: true });
});

function savedFiles(): string[] {
  return readdirSync(transcriptsFolder).filter((name: string) => name.endsWith('.md'));
}

test('the transcript arrives (if not, the answer and the server log say why)', () => {
  const answer: string = McpProcess.text(result);
  expect({ isError: result.isError ?? false, answer: answer.slice(0, 300), log: result.isError ? mcp.log : '' }).toMatchObject({ isError: false });
});

test('the answer names the saved file and brings the content between the untrusted-content markers', () => {
  const answer: string = McpProcess.text(result);
  expect(answer).toContain(`Arquivo salvo: ${join(transcriptsFolder, savedFiles()[0] ?? '')}`);
  expect(answer).toContain('<<<INÍCIO DO CONTEÚDO DO VÍDEO>>>');
  expect(answer).toContain('<<<FIM DO CONTEÚDO DO VÍDEO>>>');
});

test('exactly one Markdown file is saved, named date_title_language_ID.md', () => {
  expect(savedFiles()).toHaveLength(1);
  expect(savedFiles()[0]).toMatch(new RegExp(`^\\d{4}-\\d{2}-\\d{2}_.+_${LANGUAGE}_${VIDEO_ID}\\.md$`));
});

test('the file has the title, the manual caption in the asked language and the time markers', () => {
  const content: string = readFileSync(join(transcriptsFolder, savedFiles()[0]!), 'utf8');
  expect(content.startsWith('# ')).toBe(true);
  expect(content).toContain(`${LANGUAGE}, legenda revisada (feita por pessoa)`);
  for (const percent of [10, 25, 50, 75, 90]) expect(content).toContain(`## [${percent}% - `);
});
