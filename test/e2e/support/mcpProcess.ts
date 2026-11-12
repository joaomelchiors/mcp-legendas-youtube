// Starts the real MCP server (node dist/index.js) as a child process and talks to it over stdio,
// exactly like Claude Code does. Used only by the end-to-end tests.
// The server is the built one: run "npm run build" first (npm test does it on its own, in "pretest").

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export class McpProcess {
  static readonly SERVER: string = join(__dirname, '..', '..', '..', 'dist', 'index.js');

  private stderrText: string = '';

  private constructor(private readonly client: Client) {}

  /** Starts the server with the safe default environment plus the given variables. */
  static async start(variables: Readonly<Record<string, string>>): Promise<McpProcess> {
    const isBuilt: boolean = existsSync(McpProcess.SERVER);
    if (!isBuilt) throw new Error(`Servidor não compilado: ${McpProcess.SERVER}. Rode "npm run build".`);

    const transport: StdioClientTransport = new StdioClientTransport({
      command: process.execPath,
      args: [McpProcess.SERVER],
      env: { ...getDefaultEnvironment(), ...variables },
      stderr: 'pipe',
    });
    const client: Client = new Client({ name: 'teste-e2e', version: '0.0.0' });
    const mcp: McpProcess = new McpProcess(client);
    (transport.stderr as Readable).on('data', (chunk: Buffer) => {
      mcp.stderrText += chunk.toString('utf8');
    });
    await client.connect(transport);
    return mcp;
  }

  get serverVersion(): { name: string; version: string } | undefined {
    return this.client.getServerVersion();
  }

  async toolNames(): Promise<string[]> {
    const { tools } = await this.client.listTools();
    return tools.map((tool: { name: string }) => tool.name);
  }

  async getTranscript(args: Readonly<Record<string, string>>, timeoutMs: number = 60_000): Promise<CallToolResult> {
    return (await this.client.callTool({ name: 'get_transcript', arguments: args }, undefined, { timeout: timeoutMs })) as CallToolResult;
  }

  /** The text of the first content block of a tool result. */
  static text(result: CallToolResult): string {
    const first: { type: string; text?: string } | undefined = result.content[0] as { type: string; text?: string } | undefined;
    return first?.text ?? '';
  }

  /** Everything the server wrote to stderr (its log) so far. */
  get log(): string {
    return this.stderrText;
  }

  async stop(): Promise<void> {
    await this.client.close();
  }
}
