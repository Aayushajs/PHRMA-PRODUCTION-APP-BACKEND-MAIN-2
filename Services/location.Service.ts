/*
┌───────────────────────────────────────────────────────────────────────┐
│  Location Service - Handles location and pincode utilities            │
│  Provides state, city, and pincode information APIs                   │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { ApiError } from "../Middlewares/errorHandler";
import { handleResponse } from "../Utils/handleResponse";
import { 
    getAllStates, 
    getCitiesByState as getCitiesByStateName,
    getPincodeInfo as getPincodeData
} from "../Utils/pincodeService";
import { validatePincodeFormat } from "../Utils/validators";

export default class LocationService {
    /**
     * Get list of all Indian states
     */
    public static getStates = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const states = getAllStates();
            
            return handleResponse(req, res, 200, "States fetched successfully", states);
        }
    );

    /**
     * Get cities/districts for a specific state
     */
    public static getCitiesByState = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const state = req.params.state as string;

            if (!state) {
                return next(new ApiError(400, "State name is required"));
            }

            const cities = await getCitiesByStateName(state);

            if (cities.length === 0) {
                return next(new ApiError(404, "No cities found for the specified state"));
            }

            return handleResponse(req, res, 200, "Cities fetched successfully", {
                state: state.toUpperCase(),
                cities: cities
            });
        }
    );

    /**
     * Get pincode information (city, district, state)
     */
    public static getPincodeInfo = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const pincode = req.params.pincode as string;

            if (!pincode) {
                return next(new ApiError(400, "Pincode is required"));
            }

            // Validate pincode format first
            const pincodeValidation = validatePincodeFormat(pincode);
            if (!pincodeValidation.isValid) {
                return next(new ApiError(400, pincodeValidation.message));
            }

            const pincodeInfo = await getPincodeData(pincode);

            if (!pincodeInfo) {
                return next(new ApiError(404, "Pincode not found or invalid"));
            }

            return handleResponse(req, res, 200, "Pincode information fetched successfully", pincodeInfo);
        }
    );
}
