// Result pattern (João's code, adapted to this project).
// A method that can fail returns Result<T>: either the instance, or a list of error codes.
// Adaptations: an error is only an ErrorCode (no createError); an exception caught by
// try becomes UNEXPECTED, and the exception itself is kept in `cause` for the log.
// A failure may also carry `details` (e.g. the available captions).

import { ErrorCode, type ErrorDetails } from './errorCode.js';

export type ResultError = ErrorCode;

export class Result<InstanceType> {
  constructor(
    private readonly _instance?: InstanceType | null,
    private readonly _errors?: ResultError[],
    private readonly _cause?: unknown,
    private readonly _details?: ErrorDetails,
  ) {}

  static ok<InstanceType>(instance?: InstanceType): Result<InstanceType> {
    return new Result<InstanceType>(instance ?? null);
  }

  static fail<InstanceType>(e: ResultError | ResultError[], details?: ErrorDetails): Result<InstanceType> {
    return Result.failWithCause<InstanceType>(e, undefined, details);
  }

  /** A failure that keeps what caused it (an exception, or a text), for the log. */
  static failWithCause<InstanceType>(e: ResultError | ResultError[], cause: unknown, details?: ErrorDetails): Result<InstanceType> {
    const errors: ResultError[] = Array.isArray(e) ? e : [e];
    return new Result<InstanceType>(undefined, errors, cause, details);
  }

  /** Runs an async step; an exception becomes UNEXPECTED (the exception goes to `cause`). */
  static async try<InstanceType>(fn: () => Promise<Result<InstanceType>>): Promise<Result<InstanceType>> {
    try {
      return await fn();
    } catch (e: unknown) {
      return Result.failWithCause<InstanceType>(ErrorCode.UNEXPECTED, e);
    }
  }

  /** Only meaningful when isOk. On a failure it is undefined: always check isFailure first. */
  get instance(): InstanceType {
    return this._instance!;
  }

  get errors(): ResultError[] | undefined {
    const withoutErrors: boolean = !this._errors || this._errors.length === 0;
    if (withoutErrors && this._instance === undefined) {
      return [ErrorCode.RESULT_UNDEFINED];
    }
    return this._errors;
  }

  /** What caused the failure (the exception caught by try, or a text), for the log. Undefined otherwise. */
  get cause(): unknown {
    return this._cause;
  }

  /** Extra data that came with the error. Undefined on success or when the failure has none. */
  get details(): ErrorDetails | undefined {
    return this._details;
  }

  get isOk(): boolean {
    return !this.errors;
  }

  get isFailure(): boolean {
    return !!this.errors;
  }

  /**
   * The same failure as a Result of another type, to return it one level up.
   * Keeps everything: the codes, the details and the cause. Only meaningful on a failure: check isFailure first.
   */
  propagate<OtherType>(): Result<OtherType> {
    return new Result<OtherType>(undefined, this.errors, this._cause, this._details);
  }
}
