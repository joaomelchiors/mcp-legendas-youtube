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

describe('Result.trySync', () => {
  test('wraps the value returned by the function in an ok', () => {
    const result: Result<number> = Result.trySync<number>(() => 7);
    expect(result.isOk).toBe(true);
    expect(result.instance).toBe(7);
  });

  test('an exception becomes UNEXPECTED, and the original exception is kept as cause', () => {
    const failure: Error = new Error('boom');
    const result: Result<number> = Result.trySync<number>(() => {
      throw failure;
    });
    expect(result.errors).toEqual([ErrorCode.UNEXPECTED]);
    expect(result.cause).toBe(failure);
  });

  test('a result without exception has no cause', () => {
    expect(Result.trySync<number>(() => 1).cause).toBeUndefined();
  });
});

describe('throwIfFailed', () => {
  test('does nothing when ok', () => {
    expect(() => Result.ok<number>(1).throwIfFailed()).not.toThrow();
  });

  test('throws the errors list when failed', () => {
    let thrown: unknown;
    try {
      Result.fail<number>(ErrorCode.INVALID_URL).throwIfFailed();
    } catch (e: unknown) {
      thrown = e;
    }
    expect(thrown).toEqual([ErrorCode.INVALID_URL]);
  });
});

describe('withFail', () => {
  test('creates a new failure with the same errors, to return in another type', () => {
    const original: Result<number> = Result.fail<number>([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
    const forwarded: Result<string> = original.withFail;
    expect(forwarded.isFailure).toBe(true);
    expect(forwarded.errors).toEqual([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
  });
});

describe('Result.combine', () => {
  test('all ok: one ok with the instances in the same order', () => {
    const combined: Result<readonly [number, string]> = Result.combine([Result.ok<number>(1), Result.ok<string>('a')] as const);
    expect(combined.isOk).toBe(true);
    expect(combined.instance).toEqual([1, 'a']);
  });

  test('some failed: one failure with all errors of the failures, in order', () => {
    const combined: Result<readonly [number, string, boolean]> = Result.combine([
      Result.fail<number>(ErrorCode.INVALID_URL),
      Result.ok<string>('a'),
      Result.fail<boolean>(ErrorCode.INVALID_LANGUAGE),
    ] as const);
    expect(combined.isFailure).toBe(true);
    expect(combined.errors).toEqual([ErrorCode.INVALID_URL, ErrorCode.INVALID_LANGUAGE]);
  });
});

describe('Result.combineAsync', () => {
  test('waits for all and combines them', async () => {
    const combined: Result<number[]> = await Result.combineAsync<number>([
      Promise.resolve(Result.ok<number>(1)),
      Promise.resolve(Result.ok<number>(2)),
    ]);
    expect(combined.instance).toEqual([1, 2]);
  });

  test('a failure among them makes the combination fail', async () => {
    const combined: Result<number[]> = await Result.combineAsync<number>([
      Promise.resolve(Result.ok<number>(1)),
      Promise.resolve(Result.fail<number>(ErrorCode.UNEXPECTED)),
    ]);
    expect(combined.errors).toEqual([ErrorCode.UNEXPECTED]);
  });
});

describe('toString', () => {
  test('ok shows the instance', () => {
    expect(Result.ok<{ id: string }>({ id: 'x' }).toString()).toBe('Result.ok({"id":"x"})');
  });

  test('failure shows the codes', () => {
    expect(Result.fail<number>(ErrorCode.INVALID_URL).toString()).toBe('Result.fail(["INVALID_URL"])');
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

  test('withFail keeps the details', () => {
    const original: Result<number> = Result.fail<number>(ErrorCode.NO_CAPTIONS_FOR_LANGUAGE, details);
    expect(original.withFail.details).toEqual(details);
  });
});
