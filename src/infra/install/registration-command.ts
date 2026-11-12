// The command that registers the MCP in Claude Code, ready to copy.
// Two scopes: "user" (the MCP works in any folder where Claude is opened, recommended) and
// "local" (only in the folder where the command is run). The installer shows both; the user chooses.

import { Project } from '../project.js';

export type RegistrationScope = 'user' | 'local';

/** One ready command per scope. */
export type RegistrationCommands = Readonly<Record<RegistrationScope, string>>;

export class RegistrationCommand {
  /** serverPath: the full path of dist/index.js. */
  static for(serverPath: string, scope: RegistrationScope): string {
    return `claude mcp add --scope ${scope} ${Project.NAME} -- node "${serverPath}"`;
  }
}
