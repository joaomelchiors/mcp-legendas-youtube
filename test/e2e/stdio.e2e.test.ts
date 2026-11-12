// End-to-end test WITHOUT network: the real server (node dist/index.js) as a child process, over stdio,
// exactly like Claude Code starts it. It covers what no other automatic test covers: index.ts (the
// composition root, where every piece is assembled) and the stdio transport.
// yt-dlp is never run: YT_DLP_PATH points to a file that does not exist, and the folder of the
// transcripts is a temporary one that must stay empty.

import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpProcess } from './support/mcpProcess.js';
import { Project } from '../../src/infra/project.js';

const VALID_URL: string = 'https://www.youtube.com/watch?v=iG9CE55wbtY';

let transcriptsFolder: string;
let missingYtDlp: string;
let mcp: McpProcess;

beforeAll(async () => {
  transcriptsFolder = mkdtempSync(join(tmpdir(), 'mcp-legendas-e2e-'));
  missingYtDlp = join(transcriptsFolder, 'nao-existe', 'yt-dlp.exe');
  mcp = await McpProcess.start({ LEGENDAS_DIR: transcriptsFolder, YT_DLP_PATH: missingYtDlp });
}, 20_000);

afterAll(async () => {
  await mcp.stop();
  rmSync(transcriptsFolder, { recursive: true, force: true });
});

describe('the server starts over stdio', () => {
  test('identifies itself with the project name and version', () => {
    expect(mcp.serverVersion).toEqual({ name: Project.NAME, version: Project.VERSION });
  });

  test('tools/list returns only get_transcript', async () => {
    expect(await mcp.toolNames()).toEqual(['get_transcript']);
  });
});

describe('get_transcript through the whole assembly (no network)', () => {
  test('an invalid link is refused before any engine run', async () => {
    const result: CallToolResult = await mcp.getTranscript({ url: 'https://vimeo.com/123' });
    expect(result.isError).toBe(true);
    expect(McpProcess.text(result)).toContain('Link inválido');
  });

  test('a valid link reaches the engine, which reports yt-dlp missing (locator -> engine -> presenter)', async () => {
    const result: CallToolResult = await mcp.getTranscript({ url: VALID_URL, idioma: 'pt-BR' });
    expect(result.isError).toBe(true);
    expect(McpProcess.text(result)).toContain('O yt-dlp não foi encontrado');
  });

  test('no file is written when there is no transcript', () => {
    expect(readdirSync(transcriptsFolder).filter((name: string) => name.endsWith('.md'))).toEqual([]);
  });
});

describe('the log goes to stderr (stdout belongs to the protocol)', () => {
  test('says where it looked for yt-dlp, where the transcripts go, and that it started', () => {
    expect(mcp.log).toContain(`yt-dlp: YT_DLP_PATH="${missingYtDlp}" (não encontrado)`);
    expect(mcp.log).toContain(`legendas: ${transcriptsFolder}`);
    expect(mcp.log).toContain(`versão ${Project.VERSION} iniciada (stdio)`);
  });

  test('logs each call', () => {
    expect(mcp.log).toContain('get_transcript chamada: url="https://vimeo.com/123"');
    expect(mcp.log).toContain('get_transcript falhou: ENGINE_NOT_FOUND');
  });
});
