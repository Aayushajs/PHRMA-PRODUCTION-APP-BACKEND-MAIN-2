/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Store Context Middleware - Inject medicineStoreId from authenticated user
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from './errorHandler';
import userModel from '../Databases/Models/user.Model';

/**
 * Middleware: Fetch and inject user's medicineStoreId
 * Requires authenticatedUserMiddleware to run first
 */
export const storeContextMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user || !req.user._id) {
      return next(new ApiError(401, 'User not authenticated'));
    }

    // Fetch user from database to get their pharmacy info
    const user = await userModel
      .findById(req.user._id)
      .select('pharmacyInfo role')
      .lean();

    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    // Check if user has a store ID
    const medicineStoreId = user.pharmacyInfo?.storeId;

    if (!medicineStoreId) {
      return next(
        new ApiError(
          403,
          'No medicine store associated with your account. Please contact admin.'
        )
      );
    }

    // Inject medicineStoreId into req.user
    req.user.medicineStoreId = medicineStoreId.toString();

    next();
  } catch (error) {
    console.error('Store context middleware error:', error);
    return next(new ApiError(500, 'Failed to fetch store context'));
  }
};
