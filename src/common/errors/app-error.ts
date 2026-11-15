export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown[];

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: unknown[] = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details: unknown[] = [], code = 'VALIDATION_ERROR'): AppError {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHENTICATED'): AppError {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Access forbidden for current user role', code = 'FORBIDDEN'): AppError {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND'): AppError {
    return new AppError(message, 404, code);
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(message, 409, code);
  }

  static insufficientStock(message: string, details: unknown[] = []): AppError {
    return new AppError(message, 422, 'INSUFFICIENT_STOCK', details);
  }

  static idempotencyConflict(message = 'Idempotency key already used with different payload'): AppError {
    return new AppError(message, 409, 'IDEMPOTENCY_CONFLICT');
  }
}
