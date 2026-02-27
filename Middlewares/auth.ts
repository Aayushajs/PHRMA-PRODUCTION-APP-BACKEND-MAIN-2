/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Authentication Middleware - JWT verification and user context
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { ApiError } from './errorHandler';

dotenv.config({ path: './config/.env' });

// Extend Express Request with user object
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        role: string;
        email: string;
        medicineStoreId?: string;
      };
    }
  }
}

// JWT Payload type
interface JWTPayload {
  _id: string;
  role: string;
  email: string;
  medicineStoreId?: string;
}

/**
 * Extract user from JWT token or headers (Gateway mode)
 */
const getUserInfo = (req: Request) => {
  try {
    // Gateway mode: headers
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const userEmail = req.headers['x-user-email'] as string;

    if (userId && userRole) {
      return {
        _id: userId,
        role: userRole,
        email: userEmail || '',
      };
    }

    // Direct mode: JWT token
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.cookies?.userToken) {
      token = req.cookies.userToken;
    }

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.USER_SECRET_KEY as string) as JWTPayload;
    return {
      _id: decoded._id,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Middleware: Require any authenticated user
 */
export const authenticatedUserMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUserInfo(req);
    if (!user) {
      return next(new ApiError(401, 'Unauthorized: Please login first'));
    }
    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(500, 'Internal server error'));
  }
};

/**
 * Middleware: Require admin role
 */
export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = getUserInfo(req);
    if (!user) {
      return next(new ApiError(401, 'Unauthorized: Please login first'));
    }
    if (user.role !== 'admin') {
      return next(new ApiError(403, 'Forbidden: Admin access required'));
    }
    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(500, 'Internal server error'));
  }
};
