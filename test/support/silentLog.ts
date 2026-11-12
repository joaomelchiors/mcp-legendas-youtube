// Silences the log during a test: Log writes to stderr, and the test output stays clean.
// Returns the spy, so a test can also check what was logged.

export function silenceStderr(): jest.SpyInstance {
  return jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
}
