// Tests for Result.
// Result is the João's Result pattern, adapted: an error is only an ErrorCode.

import { Result } from '../../../src/domain/shared/result.js';
import { ErrorCode, type ErrorDetails } from '../../../src/domain/shared/errorCode.js';

describe('Result.ok', () => {
  test('holds the instance and has no errors', () => {
    const result: Result<number> = Result.ok<number>(42);
    expect(result.isOk).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.instance).toBe(42);
    expect(result.errors).toBeUndefined();
  });

  test('without instance is still ok, with null as instance', () => {
    const result: Result<void> = Result.ok<void>();
    expect(result.isOk).toBe(true);
    expect(result.instance).toBeNull();
  });
});

describe('Result.fail', () => {
  test('with one code: the errors list has that code', () => {
    const result: Result<number> = Result.fail<number>(ErrorCode.INVALID_URL);
    expect(result.isFailure).toBe(true);
    expect(result.isOk).toBe(false);
    expect(result.errors).toEqual([ErrorCode.INVALID_URL]);
  });

  test('with a list of codes: keeps all of them, in order', () => {
    const result: Result<number> = Result.fail<number>([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
    expect(result.errors).toEqual([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
  });

  test('instance of a failure is undefined (whoever reads it must check isFailure first)', () => {
    const result: Result<number> = Result.fail<number>(ErrorCode.INVALID_URL);
    expect(result.instance).toBeUndefined();
  });
});

describe('RESULT_UNDEFINED', () => {
  test('a Result built with neither instance nor errors reports RESULT_UNDEFINED', () => {
    const result: Result<number> = new Result<number>(undefined, []);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([ErrorCode.RESULT_UNDEFINED]);
  });
});

describe('Result.try (async)', () => {
  test('returns the Result produced by the function', async () => {
    const result: Result<string> = await Result.try<string>(async () => Result.ok<string>('done'));
    expect(result.instance).toBe('done');
  });

  test('an exception becomes UNEXPECTED, and the original exception is kept as cause', async () => {
    const failure: Error = new Error('boom');
    const result: Result<string> = await Result.try<string>(async () => {
      throw failure;
    });
    expect(result.errors).toEqual([ErrorCode.UNEXPECTED]);
    expect(result.cause).toBe(failure);
  });
});

describe('Result.failWithCause: a failure that keeps what caused it, for the log', () => {
  test('keeps the code and the cause', () => {
    const cause: Error = new Error('EACCES: permissão negada');
    const result: Result<string> = Result.failWithCause<string>(ErrorCode.FILE_WRITE_FAILED, cause);
    expect(result.isFailure).toBe(true);
    expect(result.errors).toEqual([ErrorCode.FILE_WRITE_FAILED]);
    expect(result.cause).toBe(cause);
    expect(result.details).toBeUndefined();
  });

  test('the cause may be a text, and details may come too', () => {
    const details: ErrorDetails = { available: { manual: ['en'], automatic: [] } };
    const result: Result<string> = Result.failWithCause<string>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, 'motivo em texto', details);
    expect(result.cause).toBe('motivo em texto');
    expect(result.details).toEqual(details);
  });
});

describe('propagate: the same failure, returned as a Result of another type', () => {
  test('keeps every code, in order', () => {
    const original: Result<number> = Result.fail<number>([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
    const forwarded: Result<string> = original.propagate<string>();
    expect(forwarded.isFailure).toBe(true);
    expect(forwarded.errors).toEqual([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
  });

  test('keeps the details and the cause together (nothing is lost on the way up)', () => {
    const details: ErrorDetails = { available: { manual: ['en'], automatic: ['en-orig'] } };
    const cause: Error = new Error('saída inesperada');
    const original: Result<number> = Result.failWithCause<number>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, cause, details);
    const forwarded: Result<string> = original.propagate<string>();
    expect(forwarded.details).toEqual(details);
    expect(forwarded.cause).toBe(cause);
  });

  test('keeps the cause of an exception caught by Result.try', async () => {
    const cause: Error = new Error('caiu');
    const caught: Result<number> = await Result.try<number>(async () => {
      throw cause;
    });
    expect(caught.propagate<string>().cause).toBe(cause);
    expect(caught.propagate<string>().errors).toEqual([ErrorCode.UNEXPECTED]);
  });
});

describe('details: extra data carried with the error code', () => {
  const details: ErrorDetails = { available: { manual: ['en', 'de'], automatic: ['en'] } };

  test('fail with details keeps the code and the details', () => {
    const result: Result<number> = Result.fail<number>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, details);
    expect(result.errors).toEqual([ErrorCode.NO_CAPTIONS_FOR_LANGUAGE]);
    expect(result.details).toEqual(details);
  });

  test('fail without details has no details', () => {
    expect(Result.fail<number>(ErrorCode.INVALID_URL).details).toBeUndefined();
  });

  test('ok has no details', () => {
    expect(Result.ok<number>(1).details).toBeUndefined();
  });

  test('forwarding with fail(errors, details) keeps the details in the new type', () => {
    const original: Result<number> = Result.fail<number>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, details);
    const forwarded: Result<string> = Result.fail<string>(original.errors!, original.details);
    expect(forwarded.details).toEqual(details);
  });
});
