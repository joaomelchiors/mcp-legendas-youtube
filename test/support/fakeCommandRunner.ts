// Fake command runner: pretends to be yt-dlp in the YtDlpEngine tests.
// No process, no network. Each call is answered by the handler the test gives,
// which can also write a file (as yt-dlp would write the caption). Every call is recorded.

import type { CommandResult, CommandRunner } from '../../src/infra/engine/command-runner.js';

export interface RecordedCommand {
  readonly executable: string;
  readonly args: readonly string[];
  readonly timeoutMs: number;
}

export type CommandHandler = (args: readonly string[]) => CommandResult;

export class FakeCommandRunner implements CommandRunner {
  readonly calls: RecordedCommand[] = [];

  constructor(private readonly handler: CommandHandler) {}

  async run(executable: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
    this.calls.push({ executable, args, timeoutMs });
    return this.handler(args);
  }
}

/** A finished run, with the given exit code and outputs. */
export function finished(exitCode: number, stdout: string = '', stderr: string = ''): CommandResult {
  return { exitCode, stdout, stderr, timedOut: false, notFound: false };
}
