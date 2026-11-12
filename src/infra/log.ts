// Log of the project. Rule: ALWAYS stderr.
// stdout belongs to the MCP protocol; anything else written there breaks the communication.
// Only the infra layer logs; the domain does not know the log exists.

import { Project } from './project.js';

export class Log {
  private static readonly PREFIX: string = `[${Project.NAME}]`;

  static write(message: string): void {
    process.stderr.write(`${Log.PREFIX} ${message}\n`);
  }
}
