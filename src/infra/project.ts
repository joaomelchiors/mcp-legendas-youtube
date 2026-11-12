// The name and the version of the MCP, in one place.
// The server tells them to Claude (McpServerFactory), the log uses the name as prefix (Log) and the
// installer uses it in the registration command (RegistrationCommand).
// They must match package.json; test/infra/project.test.ts fails when one changes alone.

export class Project {
  static readonly NAME: string = 'mcp-legendas-youtube';
  static readonly VERSION: string = '0.1.0';
}
