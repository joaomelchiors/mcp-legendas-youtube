// Tests for ErrorText: the readable text of anything caught as an error, for the log and the terminal.
// It checks the SHAPE (an object with a text "message"), not instanceof Error: errors from Node
// (disk, network) may come from another copy of the Error class (seen in Jest).

import { ErrorText } from '../../src/infra/error-text.js';

describe('ErrorText.of', () => {
  test('an Error gives its message', () => {
    expect(ErrorText.of(new Error('disco cheio'))).toBe('disco cheio');
  });

  test('an object shaped like an error (another Error class) gives its message', () => {
    expect(ErrorText.of({ message: 'EACCES: permissão negada', code: 'EACCES' })).toBe('EACCES: permissão negada');
  });

  test.each([
    ['a text', 'nome de arquivo recusado', 'nome de arquivo recusado'],
    ['a number', 42, '42'],
    ['null', null, 'null'],
    ['undefined', undefined, 'undefined'],
    ['an object whose message is not text', { message: 7 }, '[object Object]'],
  ])('%s gives its text form', (_case: string, cause: unknown, expected: string) => {
    expect(ErrorText.of(cause)).toBe(expected);
  });
});
