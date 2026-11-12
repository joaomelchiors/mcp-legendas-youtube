// Runs an external program (today yt-dlp, for the engine and for the installer). The interface lets both be tested with a fake runner.
// NodeCommandRunner runs WITHOUT a shell: the arguments reach the program exactly as given,
// nothing is interpreted (no "&&", no "$VAR"). On Windows this finds ".exe", not ".cmd".

import { spawn, type ChildProcess } from 'node:child_process';

export interface CommandResult {
  /** null when the program did not end by itself (not found, or killed by the time limit). */
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly notFound: boolean;
}

export interface CommandRunner {
  run(executable: string, args: readonly string[], timeoutMs: number): Promise<CommandResult>;
}

export class NodeCommandRunner implements CommandRunner {
  run(executable: string, args: readonly string[], timeoutMs: number): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve) => {
      const child: ChildProcess = spawn(executable, [...args], { shell: false, windowsHide: true });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let timedOut: boolean = false;
      const timer: NodeJS.Timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);

      child.stdout!.on('data', (chunk: Buffer) => stdout.push(chunk));
      child.stderr!.on('data', (chunk: Buffer) => stderr.push(chunk));

      child.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        resolve({ exitCode: null, stdout: '', stderr: error.message, timedOut: false, notFound: error.code === 'ENOENT' });
      });

      child.on('close', (exitCode: number | null) => {
        clearTimeout(timer);
        resolve({
          exitCode,
          stdout: Buffer.concat(stdout).toString('utf-8'),
          stderr: Buffer.concat(stderr).toString('utf-8'),
          timedOut,
          notFound: false,
        });
      });
    });
  }
}
