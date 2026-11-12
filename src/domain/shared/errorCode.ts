// Every error of the project is one of these codes.
// The code says WHAT went wrong; the infra layer turns it into a message for the LLM.

export enum ErrorCode {
  // Result itself
  RESULT_UNDEFINED = 'RESULT_UNDEFINED',
  UNEXPECTED = 'UNEXPECTED',

  // Input (value objects)
  INVALID_URL = 'INVALID_URL',
  INVALID_LANGUAGE = 'INVALID_LANGUAGE',

  // Video and captions
  VIDEO_UNAVAILABLE = 'VIDEO_UNAVAILABLE',
  // Cases seen in real yt-dlp outputs. The MCP only explains them; it never works around them.
  VIDEO_REMOVED = 'VIDEO_REMOVED',
  VIDEO_PRIVATE = 'VIDEO_PRIVATE',
  MEMBERS_ONLY = 'MEMBERS_ONLY',
  AGE_RESTRICTED = 'AGE_RESTRICTED',
  LIVE_NOT_STARTED = 'LIVE_NOT_STARTED',
  LIVE_IN_PROGRESS = 'LIVE_IN_PROGRESS',
  NO_CAPTIONS = 'NO_CAPTIONS',
  NO_CAPTIONS_FOR_LANGUAGE = 'NO_CAPTIONS_FOR_LANGUAGE',

  // Engine (yt-dlp)
  ENGINE_NOT_FOUND = 'ENGINE_NOT_FOUND',
  ENGINE_FAILED = 'ENGINE_FAILED',
  ENGINE_OUTPUT = 'ENGINE_OUTPUT',
  RATE_LIMITED = 'RATE_LIMITED',
  TIMEOUT = 'TIMEOUT',

  // Reading the subtitle file
  VTT_PARSE = 'VTT_PARSE',

  // Saving the transcript file
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',

  // Installer (npm run instalar): only happen while installing yt-dlp, never while getting a caption
  UNSUPPORTED_SYSTEM = 'UNSUPPORTED_SYSTEM',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  CHECKSUM_NOT_LISTED = 'CHECKSUM_NOT_LISTED',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
}

/** Captions that exist for a video, offered to the user when the requested one is missing. */
export interface AvailableCaptions {
  readonly manual: readonly string[];
  readonly automatic: readonly string[];
}

/** Extra data that travels with an error code. The code is still the error. */
export interface ErrorDetails {
  readonly available?: AvailableCaptions;
}
