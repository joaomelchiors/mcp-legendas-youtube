// The command that registers the MCP in Claude Code, ready to copy.
// "--scope user": registered for the user, so it works in any folder where Claude is opened.

export class RegistrationCommand {
  private static readonly NAME: string = 'mcp-legendas-youtube';

  /** serverPath: the full path of dist/index.js. */
  static for(serverPath: string): string {
    return `claude mcp add --scope user ${RegistrationCommand.NAME} -- node "${serverPath}"`;
  }
}
