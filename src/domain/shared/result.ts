// Result pattern (João's code, adapted to this project).
// A method that can fail returns Result<T>: either the instance, or a list of error codes.
// Adaptations: an error is only an ErrorCode (no createError); an exception caught by
// try/trySync becomes UNEXPECTED, and the exception itself is kept in `cause` for the log.
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
    const errors: ResultError[] = Array.isArray(e) ? e : [e];
    return new Result<InstanceType>(undefined, errors, undefined, details);
  }

  /** Runs an async step; an exception becomes UNEXPECTED (the exception goes to `cause`). */
  static async try<InstanceType>(fn: () => Promise<Result<InstanceType>>): Promise<Result<InstanceType>> {
    try {
      return await fn();
    } catch (e: unknown) {
      return new Result<InstanceType>(undefined, [ErrorCode.UNEXPECTED], e);
    }
  }

  /** Runs a sync function; its value becomes ok, an exception becomes UNEXPECTED. */
  static trySync<InstanceType>(fn: () => InstanceType): Result<InstanceType> {
    try {
      return Result.ok<InstanceType>(fn());
    } catch (e: unknown) {
      return new Result<InstanceType>(undefined, [ErrorCode.UNEXPECTED], e);
    }
  }

  throwIfFailed(): never | void {
    if (this.isFailure) {
      throw this.errors;
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

  /** The exception caught by try/trySync, for the log. Undefined otherwise. */
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

  get withFail(): Result<any> {
    return Result.fail<any>(this.errors!, this._details);
  }

  static combine<const R extends readonly Result<any>[]>(
    results: R,
  ): Result<{ [K in keyof R]: R[K] extends Result<infer T> ? T : never }> {
    const errors: Result<any>[] = results.filter((r: Result<any>) => r.isFailure);
    if (errors.length) {
      return Result.fail(errors.flatMap((r: Result<any>) => r.errors!));
    }

    const instances = results.map((r: Result<any>) => r._instance) as unknown as {
      [K in keyof R]: R[K] extends Result<infer T> ? T : never;
    };

    return Result.ok(instances);
  }

  static async combineAsync<T>(results: Promise<Result<T>>[]): Promise<Result<T[]>> {
    const rs: Result<T>[] = await Promise.all(results);
    return Result.combine(rs);
  }

  toString(): string {
    if (this.isOk) {
      return `Result.ok(${JSON.stringify(this._instance)})`;
    } else {
      return `Result.fail(${JSON.stringify(this._errors)})`;
    }
  }
}
