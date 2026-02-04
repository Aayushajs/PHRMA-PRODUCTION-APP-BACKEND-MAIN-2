/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Utility: API Response Handler
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Request, Response } from 'express';

export const handleResponse = (
  req: Request,
  res: Response,
  statusCode: number,
  message: string,
  data: any = null
) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    statusCode,
    data,
    timestamp: new Date().toISOString(),
  });
};
