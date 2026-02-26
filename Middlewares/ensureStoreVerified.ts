/*
┌───────────────────────────────────────────────────────────────────────┐
│  Store Verification Middleware - Ensures store is approved            │
│  Blocks operations if store verification status is not approved       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { ApiError } from "./errorHandler";
import MedicineStoreModel from "../Databases/Models/medicineStore.Model";
import { VerificationStatus } from "../Databases/Entities/medicineStore.Interface";

/**
 * Middleware to ensure medicine store is verified and approved
 * Blocks access if verificationStatus is not "approved"
 */
export const ensureStoreVerified = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        // Extract store ID from request
        // This assumes store ID comes from authenticated user or request params
        const storeId = req.body.storeId || req.params.storeId || (req as any).store?._id;

        if (!storeId) {
            return next(
                new ApiError(
                    400,
                    "Store ID is required"
                )
            );
        }

        // Fetch store from database
        const store = await MedicineStoreModel.findById(storeId);

        if (!store) {
            return next(
                new ApiError(
                    404,
                    "Medicine store not found"
                )
            );
        }

        // Check verification status
        if (store.verificationStatus !== VerificationStatus.APPROVED) {
            const statusMessages: Record<string, string> = {
                [VerificationStatus.PENDING]: 
                    "Your store registration is pending verification. Please wait for admin approval.",
                [VerificationStatus.REJECTED]: 
                    "Your store registration has been rejected. Please contact support for details.",
                [VerificationStatus.SUSPENDED]: 
                    "Your store has been suspended. Please contact support immediately.",
            };

            return next(
                new ApiError(
                    403,
                    statusMessages[store.verificationStatus] || 
                    "Store is not verified. Cannot perform this operation."
                )
            );
        }

        // Check if store is active
        if (!store.isActive) {
            return next(
                new ApiError(
                    403,
                    "Store is currently inactive. Cannot perform this operation."
                )
            );
        }

        // Attach store to request for downstream use
        (req as any).verifiedStore = store;

        next();
    }
);

/**
 * Middleware to check if license is not expired
 */
export const ensureLicenseValid = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        const store = (req as any).verifiedStore || (req as any).store;

        if (!store) {
            return next(
                new ApiError(
                    400,
                    "Store information not found in request"
                )
            );
        }

        // Check license expiry
        if (store.licenseExpiry) {
            const now = new Date();
            if (store.licenseExpiry < now) {
                return next(
                    new ApiError(
                        403,
                        "Pharmacy license has expired. Please renew to continue operations."
                    )
                );
            }

            // Warning if expiring within 30 days
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            if (store.licenseExpiry < thirtyDaysFromNow) {
                // Add warning header but allow request
                res.setHeader(
                    "X-License-Warning",
                    "License expires within 30 days. Please renew soon."
                );
            }
        }

        next();
    }
);

/**
 * Combined middleware for complete store verification
 * Checks both verification status and license validity
 */
export const ensureStoreOperational = [
    ensureStoreVerified,
    ensureLicenseValid,
];
