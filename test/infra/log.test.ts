// Tests for the log: the most important rule of an MCP over stdio is that
// nothing but the protocol goes to stdout.

import { Log } from '../../src/infra/log.js';
import { silenceStderr } from '../support/silentLog.js';

describe('Log.write', () => {
  test('writes to stderr, with the project prefix and a line break', () => {
    const stderr: jest.SpyInstance = silenceStderr();
    Log.write('mensagem de teste');
    expect(stderr).toHaveBeenCalledWith('[mcp-legendas-youtube] mensagem de teste\n');
  });

  test('never writes to stdout', () => {
    silenceStderr();
    const stdout: jest.SpyInstance = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    Log.write('qualquer coisa');
    expect(stdout).not.toHaveBeenCalled();
  });
});
