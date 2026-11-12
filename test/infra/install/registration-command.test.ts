// Tests for RegistrationCommand: the command that registers the MCP in Claude Code, ready to copy.
// "--scope user": the MCP works in any folder where Claude is opened (and saves the captions there).

import { RegistrationCommand } from '../../../src/infra/install/registration-command.js';

describe('RegistrationCommand.for', () => {
  test('uses node with the full path of the server, between quotes', () => {
    expect(RegistrationCommand.for('C:\\Users\\joao\\mcp-legendas-youtube\\dist\\index.js')).toBe(
      'claude mcp add --scope user mcp-legendas-youtube -- node "C:\\Users\\joao\\mcp-legendas-youtube\\dist\\index.js"',
    );
  });

  test('a path with spaces stays whole, inside the quotes', () => {
    expect(RegistrationCommand.for('/home/joao/Meus Projetos/mcp/dist/index.js')).toBe(
      'claude mcp add --scope user mcp-legendas-youtube -- node "/home/joao/Meus Projetos/mcp/dist/index.js"',
    );
  });
});
