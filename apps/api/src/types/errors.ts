export class APIError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

export class ExternalAPIError extends APIError {
  constructor(message: string, originalError?: unknown) {
    super(`External API Error: ${message}`, 502);
    if (originalError && typeof originalError === 'object' && 'stack' in originalError) {
      this.stack = (originalError as Error).stack;
    }
  }
}
