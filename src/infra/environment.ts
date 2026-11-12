// The environment variables of the process (process.env), as the pieces that read them receive it.
// Receiving it as a parameter, instead of reading process.env inside, lets the tests pass any environment.

export type Environment = Readonly<Record<string, string | undefined>>;
