export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_TOKEN'
  | 'USER_NOT_FOUND'
  | 'USER_EXISTS'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'SERVER_ERROR';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
