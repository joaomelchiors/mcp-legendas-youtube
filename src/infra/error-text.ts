// The readable text of anything caught as an error, for the log and the terminal.
// It checks the SHAPE (an object with a text "message"), not instanceof Error: errors from Node
// (disk, network) may come from another copy of the Error class (seen in Jest).

export class ErrorText {
  static of(cause: unknown): string {
    const hasMessage: boolean = typeof cause === 'object' && cause !== null && typeof (cause as { message?: unknown }).message === 'string';
    return hasMessage ? (cause as { message: string }).message : String(cause);
  }
}
