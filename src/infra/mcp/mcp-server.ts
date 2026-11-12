// The MCP server, with the SDK's low-level API (no zod in our code).
// It answers tools/list with the tool definition and sends tools/call to the tool.
// It knows nothing about the transport (stdio is connected in src/index.ts).

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GetTranscriptTool } from './getTranscript-tool.js';
import { Project } from '../project.js';

export class McpServerFactory {
  static create(tool: GetTranscriptTool): Server {
    const server: Server = new Server(
      { name: Project.NAME, version: Project.VERSION },
      { capabilities: { tools: {} } },
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [GetTranscriptTool.definition] }));

    server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const isGetTranscript: boolean = request.params.name === GetTranscriptTool.definition.name;
      if (isGetTranscript) return tool.call(request.params.arguments);
      return { isError: true, content: [{ type: 'text', text: `Ferramenta desconhecida: ${request.params.name}` }] };
    });

    return server;
  }
}
