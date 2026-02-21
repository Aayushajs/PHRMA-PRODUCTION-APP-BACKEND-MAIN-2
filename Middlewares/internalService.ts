/*
┌───────────────────────────────────────────────────────────────────────┐
│  Internal Service Authentication Middleware                           │
│  Validates INTERNAL_SERVICE_API_KEY for service-to-service calls      │
│  Use this to protect endpoints that should only be called internally  │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from "express";
import { ApiError } from "./errorHandler";

/**
 * Middleware to verify internal service authentication
 * 
 * Checks for x-internal-api-key header and validates against environment variable
 * Use this for endpoints that should only be accessible by internal services
 * 
 * @example
 * ```typescript
 * // In your routes
 * router.post('/internal/sync', verifyInternalService, syncController);
 * ```
 */
export const verifyInternalService = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const apiKey = req.headers['x-internal-api-key'] as string;
    const expectedKey = process.env.INTERNAL_SERVICE_API_KEY;

    // Check if internal API key is configured
    if (!expectedKey) {
        console.error('❌ INTERNAL_SERVICE_API_KEY not configured in environment');
        return next(new ApiError(500, "Internal service authentication not configured"));
    }

    // Check if API key is provided
    if (!apiKey) {
        return next(new ApiError(401, "Internal service API key required"));
    }

    // Validate API key
    if (apiKey !== expectedKey) {
        return next(new ApiError(403, "Invalid internal service API key"));
    }

    // API key is valid, proceed
    next();
};

/**
 * Optional: Validate internal service key without throwing error
 * Returns true if valid, false otherwise
 * 
 * @param req - Express request object
 * @returns boolean indicating if internal service is authenticated
 */
export const isInternalService = (req: Request): boolean => {
    const apiKey = req.headers['x-internal-api-key'] as string;
    const expectedKey = process.env.INTERNAL_SERVICE_API_KEY;
    
    return !!(expectedKey && apiKey && apiKey === expectedKey);
};
