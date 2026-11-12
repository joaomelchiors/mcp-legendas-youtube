// Tests for NodeCommandRunner: runs a program WITHOUT shell, with a time limit.
// The program here is Node itself (process.execPath): no yt-dlp, no network.

import { NodeCommandRunner, type CommandResult } from '../../../src/infra/process/command-runner.js';

const NODE: string = process.execPath;
const runner: NodeCommandRunner = new NodeCommandRunner();

function node(script: string, timeoutMs: number = 10_000): Promise<CommandResult> {
  return runner.run(NODE, ['-e', script], timeoutMs);
}

describe('NodeCommandRunner', () => {
  test('captures stdout, stderr and the exit code 0', async () => {
    const result: CommandResult = await node('process.stdout.write("out"); process.stderr.write("err")');
    expect(result).toEqual({ exitCode: 0, stdout: 'out', stderr: 'err', timedOut: false, notFound: false });
  });

  test('reads the output as UTF-8 (accents are kept)', async () => {
    const result: CommandResult = await node('process.stdout.write(Buffer.from("Você ação 360°", "utf-8"))');
    expect(result.stdout).toBe('Você ação 360°');
  });

  test('a failure code comes back as it is', async () => {
    const result: CommandResult = await node('process.stderr.write("ERROR: x"); process.exit(3)');
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toBe('ERROR: x');
  });

  test('arguments go to the program as they are, without a shell interpreting them', async () => {
    const result: CommandResult = await runner.run(NODE, ['-e', 'process.stdout.write(process.argv.slice(1).join("|"))', '--', 'a b', '&&', '$HOME', '"q"'], 10_000);
    expect(result.stdout).toBe('a b|&&|$HOME|"q"');
  });

  test('passing the time limit kills the program and says so', async () => {
    const result: CommandResult = await node('setTimeout(() => {}, 20000)', 300);
    expect(result.timedOut).toBe(true);
  });

  test('a program that does not exist is reported as not found', async () => {
    const result: CommandResult = await runner.run('programa-que-nao-existe-xyz', ['--version'], 10_000);
    expect(result.notFound).toBe(true);
    expect(result.exitCode).toBeNull();
  });
});
