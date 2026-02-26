/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Error Handler Middleware - Global exception handling
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Request, Response, NextFunction } from 'express';

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  requestId?: string;
  timestamp: string;
  path?: string;
  error?: {
    code?: string;
    details?: string;
  };
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message || 'Internal Server Error';

  const errorLog = {
    method: req.method,
    path: req.path,
    statusCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
  } else {
    console.warn('[WARN]', JSON.stringify(errorLog, null, 2));
  }

  const errorResponse: ApiErrorResponse = {
    success: false,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  if (process.env.NODE_ENV === 'development' && error.stack) {
    errorResponse.error = {
      details: error.stack,
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
