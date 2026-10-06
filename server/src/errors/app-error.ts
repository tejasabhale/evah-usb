export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request parameters', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required or invalid session', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class DeviceNotFoundError extends AppError {
  constructor(message = 'EVAH USB device marker not present on host', code = 'DEVICE_NOT_FOUND') {
    super(message, 503, code);
  }
}

export class CryptoError extends AppError {
  constructor(message = 'Cryptographic operation failed', code = 'CRYPTO_ERROR') {
    super(message, 400, code);
  }
}
