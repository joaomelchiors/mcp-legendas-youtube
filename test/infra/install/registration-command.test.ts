// Tests for RegistrationCommand: the command that registers the MCP in Claude Code, ready to copy.
// Two scopes: "user" (the MCP works in any folder where Claude is opened) and "local" (only in the folder
// where the command is run). The installer shows both; the user chooses.

import { RegistrationCommand } from '../../../src/infra/install/registration-command.js';

describe('RegistrationCommand.for', () => {
  test('user: node with the full path of the server, between quotes', () => {
    expect(RegistrationCommand.for('C:\\Users\\joao\\mcp-legendas-youtube\\dist\\index.js', 'user')).toBe(
      'claude mcp add --scope user mcp-legendas-youtube -- node "C:\\Users\\joao\\mcp-legendas-youtube\\dist\\index.js"',
    );
  });

  test('local: the same command with the local scope', () => {
    expect(RegistrationCommand.for('C:\\mcp\\dist\\index.js', 'local')).toBe(
      'claude mcp add --scope local mcp-legendas-youtube -- node "C:\\mcp\\dist\\index.js"',
    );
  });

  test('a path with spaces stays whole, inside the quotes', () => {
    expect(RegistrationCommand.for('/home/joao/Meus Projetos/mcp/dist/index.js', 'user')).toBe(
      'claude mcp add --scope user mcp-legendas-youtube -- node "/home/joao/Meus Projetos/mcp/dist/index.js"',
    );
  });
});
