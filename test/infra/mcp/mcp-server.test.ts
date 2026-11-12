// Tests for the MCP server (low-level SDK API).
// No stdio: a client and the server talk through the SDK's in-memory transport, inside the test.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpServerFactory } from '../../../src/infra/mcp/mcp-server.js';
import { GetTranscriptTool } from '../../../src/infra/mcp/getTranscript-tool.js';
import { GetTranscript } from '../../../src/domain/getTranscript-usecase.js';
import { FakeTranscriptEngine } from '../../support/fakeTranscriptEngine.js';
import { TranscriptFileWriter } from '../../../src/infra/storage/transcriptFile-writer.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function connectedClient(): Promise<Client> {
  // No call here reaches a successful transcript, so nothing is ever written to this folder.
  const writer: TranscriptFileWriter = new TranscriptFileWriter(join(tmpdir(), 'mcp-legendas-nunca-usada'));
  const tool: GetTranscriptTool = new GetTranscriptTool(new GetTranscript(new FakeTranscriptEngine({})), writer);
  const server: Server = McpServerFactory.create(tool);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client: Client = new Client({ name: 'teste', version: '0.0.0' });
  await server.connect(serverSide);
  await client.connect(clientSide);
  return client;
}

beforeEach(() => {
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

describe('McpServerFactory', () => {
  test('identifies itself with the project name and version', async () => {
    const client: Client = await connectedClient();
    expect(client.getServerVersion()).toEqual({ name: 'mcp-legendas-youtube', version: '0.1.0' });
  });

  test('tools/list returns exactly the get_transcript definition', async () => {
    const client: Client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({ name: 'get_transcript', inputSchema: GetTranscriptTool.definition.inputSchema });
  });

  test('tools/call get_transcript reaches the tool', async () => {
    const client: Client = await connectedClient();
    const result = (await client.callTool({ name: 'get_transcript', arguments: { url: 'https://vimeo.com/1' } })) as CallToolResult;
    expect(result.isError).toBe(true);
  });

  test('tools/call with an unknown tool name is refused', async () => {
    const client: Client = await connectedClient();
    const result = (await client.callTool({ name: 'other_tool', arguments: {} })) as CallToolResult;
    expect(result.isError).toBe(true);
  });
});
