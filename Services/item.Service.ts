/*
┌───────────────────────────────────────────────────────────────────────┐
│  Item Service - Business logic for Item/Product management.           │
│  Handles creation, updates, delete for store-specific items.          │
│  Tracks medicineStoreId to identify which store added the item.       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Response, Request, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors.js";
import { ApiError } from "../Utils/ApiError.js";
import { handleResponse } from "../Utils/handleResponse.js";
import { redis } from "../config/redis.js";
import ItemModel from "../Databases/Models/item.Model.js";
import ChildUnitModel from "../Databases/Models/childUnit.model.js";
import ParentUnitModel from "../Databases/Models/parentUnit.model.js";
import { uploadToCloudinary } from "../Utils/cloudinaryUpload.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import { MRPVerificationService } from './mrpVerification.Service.js';
import { gstModel } from '../Databases/Models/gst.Model.js';

export default class ItemServices {

    /**
     * Create a new item (with MRP verification, store tracking)
     * Performs real-time MRP verification against market data
     */
    public static createItem = catchAsyncErrors(
        async (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            const {
                itemName,
                itemInitialPrice,
                itemDescription,
                itemCategory,
                itemMfgDate,
                itemExpiryDate,
                itemParentUnit,
                itemChildUnit,
                itemGST,
                code,
                formula,
                HSNCode,
                weight,
                otherInformation
            } = req.body;

            // Get medicineStoreId from authenticated user context
            const medicineStoreId = req.user?.medicineStoreId;

            if (!medicineStoreId) {
                return next(new ApiError(403, "No medicine store associated with your account"));
            }

            console.log("Create Item Request Body:", req.body);
            console.log("Medicine Store ID from user:", medicineStoreId);

            // Validation
            const fields = {
                itemName,
                itemInitialPrice,
                itemCategory,
                itemMfgDate,
                itemExpiryDate,
                itemChildUnit,
                code,
                HSNCode,
                weight,
                itemGST
            };

            const missing = (Object.keys(fields) as Array<keyof typeof fields>)
                .filter(key => !fields[key]);

            if (missing.length > 0) {
                const message =
                    missing.length === 1
                        ? `${missing[0]} is required`
                        : `${missing.join(", ")} are required`;
                return next(new ApiError(400, message));
            }

            // Date validations
            const mfgDate = new Date(itemMfgDate);
            const expiryDate = new Date(itemExpiryDate);
            const now = new Date();

            if (isNaN(mfgDate.getTime()) || isNaN(expiryDate.getTime())) {
                return next(new ApiError(400, "Invalid Date Format for Mfg or Expiry Date"));
            }

            if (mfgDate > now) {
                return next(new ApiError(400, "Manufacturing Date cannot be in the future"));
            }

            if (expiryDate <= mfgDate) {
                return next(new ApiError(400, "Expiry Date must be strictly after Manufacturing Date"));
            }

            // Check for duplicate item name within the same store
            const existingItem = await ItemModel.findOne({
                itemName: itemName,
                medicineStoreId: medicineStoreId
            });
            if (existingItem) {
                return next(new ApiError(409, `Item with name "${itemName}" already exists in your store`));
            }

            // Validate child unit
            const childUnit = await ChildUnitModel.findById(itemChildUnit);
            if (!childUnit) {
                return next(new ApiError(404, "Child Unit not found"));
            }

            // Validate parent unit if provided
            let finalParentUnit = undefined;
            if (itemParentUnit) {
                const parentUnitId = await ParentUnitModel.findById(itemParentUnit);
                if (!parentUnitId) return next(new ApiError(404, "Parent Unit not found"));
                finalParentUnit = parentUnitId._id;
            }

            // Handle image uploads
            let imageUrls: string[] = [];

            if (req.files && Array.isArray(req.files)) {
                try {
                    const uploadResults = await Promise.all(
                        (req.files as Express.Multer.File[]).map(file =>
                            uploadToCloudinary(file.buffer, "Epharma/items")
                        )
                    );
                    imageUrls = uploadResults.map(r => r.secure_url);
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return next(new ApiError(500, "Failed to upload item images"));
                }
            }
            else if (req.body.itemImages) {
                if (Array.isArray(req.body.itemImages)) {
                    imageUrls = req.body.itemImages;
                } else if (typeof req.body.itemImages === "string") {
                    imageUrls = [req.body.itemImages];
                }
            }

            // Calculate final price (including GST)
            const gstId = await gstModel.findById(itemGST).select('gstRate').lean();
            const gstRate = gstId?.gstRate ?? 0;

            const calculatedFinalPrice = +(itemInitialPrice * (1 + (Number(gstRate) || 0) / 100)).toFixed(2);

            // Process otherInformation
            const processedOtherInfo: any = {};
            if (otherInformation) {
                const info = typeof otherInformation === 'string' ? JSON.parse(otherInformation) : otherInformation;

                if (info.keyFeatures) processedOtherInfo.keyFeatures = Array.isArray(info.keyFeatures) ? info.keyFeatures : [info.keyFeatures];
                if (info.benefits) processedOtherInfo.benefits = Array.isArray(info.benefits) ? info.benefits : [info.benefits];
                if (info.precautions) processedOtherInfo.precautions = Array.isArray(info.precautions) ? info.precautions : [info.precautions];
                if (info.allergyInfo) processedOtherInfo.allergyInfo = Array.isArray(info.allergyInfo) ? info.allergyInfo : [info.allergyInfo];
                if (info.sideEffects) processedOtherInfo.sideEffects = Array.isArray(info.sideEffects) ? info.sideEffects : [info.sideEffects];
                if (info.howToUse) processedOtherInfo.howToUse = String(info.howToUse).trim();
                if (info.safetyAdvice) processedOtherInfo.safetyAdvice = Array.isArray(info.safetyAdvice) ? info.safetyAdvice : [info.safetyAdvice];
                if (info.ingredients) processedOtherInfo.ingredients = Array.isArray(info.ingredients) ? info.ingredients : [info.ingredients];
            }

            // === MRP VERIFICATION (REAL-TIME) ===
            let mrpVerificationData: any = { status: 'pending', needsAdminReview: true };
            try {
                const verificationResult = await MRPVerificationService.verifyMRP({
                    itemName,
                    itemCompany: req.body.itemCompany,
                    formula: req.body.formula || formula,
                    userEnteredPrice: calculatedFinalPrice,
                    packSize: req.body.packSize,
                    category: itemCategory
                });

                mrpVerificationData = {
                    status: verificationResult.status,
                    systemFinalMRP: verificationResult.systemFinalMRP,
                    userEnteredPrice: verificationResult.userEnteredPrice,
                    maxAllowedPrice: verificationResult.maxAllowedPrice,
                    finalScore: verificationResult.finalScore,
                    reason: verificationResult.reason,
                    difference: verificationResult.difference,
                    stageUsed: verificationResult.stageUsed,
                    needsAdminReview: verificationResult.needsAdminReview,
                    verifiedAt: new Date(),
                    realtimeReferences: verificationResult.realtimeReferences
                };
                console.log('✅ MRP Verified:', verificationResult.status);
            } catch (error) {
                console.error('❌ MRP Verification Failed:', error);
            }

            const newItemData: any = {
                itemName,
                itemInitialPrice: Number(itemInitialPrice),
                itemFinalPrice: Number(calculatedFinalPrice),
                itemDescription,
                itemImages: imageUrls,
                itemCategory,
                itemMfgDate,
                itemParentUnit: finalParentUnit,
                itemChildUnit,
                itemExpiryDate,
                code,
                HSNCode,
                weight,
                itemGST,
                medicineStoreId: medicineStoreId,  // Track store ownership
                createdBy: req.user?._id,
                createdAt: Date.now(),
                mrpVerification: mrpVerificationData,
                otherInformation: processedOtherInfo
            };

            console.log("New Item Data:", newItemData);

            const newItem: any = await ItemModel.create(newItemData);
            await redis.del("deals:of-the-day");

            // Clear relevant cache
            await redis.del(`items:store:${medicineStoreId}`);

            return handleResponse(req, res, 201, "Item created successfully", {
                item: newItem,
                priceVerification: mrpVerificationData
            });
        }
    );

    /**
     * Create premium item (no MRP verification - store can set any price)
     */
    public static createPremiumItem = catchAsyncErrors(
        async (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            const {
                itemName,
                itemInitialPrice,
                itemDescription,
                itemCategory,
                itemMfgDate,
                itemExpiryDate,
                itemParentUnit,
                itemChildUnit,
                itemGST,
                code,
                HSNCode,
                weight,
                otherInformation
            } = req.body;

            // Get medicineStoreId from authenticated user context
            const medicineStoreId = req.user?.medicineStoreId;

            if (!medicineStoreId) {
                return next(new ApiError(403, "No medicine store associated with your account"));
            }

            console.log("Create Premium Item Request Body:", req.body);
            console.log("Medicine Store ID from user:", medicineStoreId);

            // Validation
            const fields = {
                itemName,
                itemInitialPrice,
                itemCategory,
                itemMfgDate,
                itemExpiryDate,
                itemChildUnit,
                code,
                HSNCode,
                weight,
                itemGST
            };

            const missing = (Object.keys(fields) as Array<keyof typeof fields>)
                .filter(key => !fields[key]);

            if (missing.length > 0) {
                const message =
                    missing.length === 1
                        ? `${missing[0]} is required`
                        : `${missing.join(", ")} are required`;
                return next(new ApiError(400, message));
            }

            // Date validations
            const mfgDate = new Date(itemMfgDate);
            const expiryDate = new Date(itemExpiryDate);
            const now = new Date();

            if (isNaN(mfgDate.getTime()) || isNaN(expiryDate.getTime())) {
                return next(new ApiError(400, "Invalid Date Format for Mfg or Expiry Date"));
            }

            if (mfgDate > now) {
                return next(new ApiError(400, "Manufacturing Date cannot be in the future"));
            }

            if (expiryDate <= mfgDate) {
                return next(new ApiError(400, "Expiry Date must be strictly after Manufacturing Date"));
            }

            // Check for duplicate item name within the same store
            const existingItem = await ItemModel.findOne({
                itemName: itemName,
                medicineStoreId: medicineStoreId
            });
            if (existingItem) {
                return next(new ApiError(409, `Item with name "${itemName}" already exists in your store`));
            }

            // Validate child unit
            const childUnit = await ChildUnitModel.findById(itemChildUnit);
            if (!childUnit) {
                return next(new ApiError(404, "Child Unit not found"));
            }

            // Validate parent unit if provided
            let finalParentUnit = undefined;
            if (itemParentUnit) {
                const parentUnitId = await ParentUnitModel.findById(itemParentUnit);
                if (!parentUnitId) return next(new ApiError(404, "Parent Unit not found"));
                finalParentUnit = parentUnitId._id;
            }

            // Handle image uploads
            let imageUrls: string[] = [];

            if (req.files && Array.isArray(req.files)) {
                try {
                    const uploadResults = await Promise.all(
                        (req.files as Express.Multer.File[]).map(file =>
                            uploadToCloudinary(file.buffer, "Epharma/items")
                        )
                    );
                    imageUrls = uploadResults.map(r => r.secure_url);
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return next(new ApiError(500, "Failed to upload item images"));
                }
            }
            else if (req.body.itemImages) {
                if (Array.isArray(req.body.itemImages)) {
                    imageUrls = req.body.itemImages;
                } else if (typeof req.body.itemImages === "string") {
                    imageUrls = [req.body.itemImages];
                }
            }

            // Calculate final price (including GST)
            const gstId = await gstModel.findById(itemGST).select('gstRate').lean();
            const gstRate = gstId?.gstRate ?? 0;
            const calculatedFinalPrice = +(itemInitialPrice * (1 + (Number(gstRate) || 0) / 100)).toFixed(2);

            // Process otherInformation
            const processedOtherInfo: any = {};
            if (otherInformation) {
                const info = typeof otherInformation === 'string' ? JSON.parse(otherInformation) : otherInformation;

                if (info.keyFeatures) processedOtherInfo.keyFeatures = Array.isArray(info.keyFeatures) ? info.keyFeatures : [info.keyFeatures];
                if (info.benefits) processedOtherInfo.benefits = Array.isArray(info.benefits) ? info.benefits : [info.benefits];
                if (info.precautions) processedOtherInfo.precautions = Array.isArray(info.precautions) ? info.precautions : [info.precautions];
                if (info.allergyInfo) processedOtherInfo.allergyInfo = Array.isArray(info.allergyInfo) ? info.allergyInfo : [info.allergyInfo];
                if (info.sideEffects) processedOtherInfo.sideEffects = Array.isArray(info.sideEffects) ? info.sideEffects : [info.sideEffects];
                if (info.howToUse) processedOtherInfo.howToUse = String(info.howToUse).trim();
                if (info.safetyAdvice) processedOtherInfo.safetyAdvice = Array.isArray(info.safetyAdvice) ? info.safetyAdvice : [info.safetyAdvice];
                if (info.ingredients) processedOtherInfo.ingredients = Array.isArray(info.ingredients) ? info.ingredients : [info.ingredients];
            }

            const newItemData: any = {
                itemName,
                itemInitialPrice: Number(itemInitialPrice),
                itemFinalPrice: Number(calculatedFinalPrice),
                itemDescription,
                itemImages: imageUrls,
                itemCategory,
                itemMfgDate,
                itemParentUnit: finalParentUnit,
                itemChildUnit,
                itemExpiryDate,
                code,
                HSNCode,
                weight,
                itemGST,
                medicineStoreId: medicineStoreId,  // Track store ownership
                createdBy: req.user?._id,
                createdAt: Date.now(),
                otherInformation: processedOtherInfo
            };

            console.log("New Premium Item Data:", newItemData);

            const newItem: any = await ItemModel.create(newItemData);

            // Clear relevant cache
            await redis.del(`items:store:${medicineStoreId}`);

            return handleResponse(req, res, 201, "Premium item created successfully", newItem);
        }
    );

    /**
     * Update an existing item
     */
    public static updateItem = catchAsyncErrors(
        async (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            const { itemId } = req.params;
            const updateData = req.body;

            if (
                updateData.otherInformation &&
                typeof updateData.otherInformation === "string"
            ) {
                try {
                    updateData.otherInformation = JSON.parse(updateData.otherInformation);
                } catch (err) {
                    return next(
                        new ApiError(400, "Invalid otherInformation format")
                    );
                }
            }

            const existingItem = await ItemModel.findById(itemId);
            if (!existingItem) {
                return next(new ApiError(404, "Item not found"));
            }

            // Get medicineStoreId from authenticated user context
            const medicineStoreId = req.user?.medicineStoreId;

            if (!medicineStoreId) {
                return next(new ApiError(403, "No medicine store associated with your account"));
            }

            // Security: Verify that the item belongs to the requesting store
            if (existingItem.medicineStoreId.toString() !== medicineStoreId.toString()) {
                return next(new ApiError(403, "You can only update items from your own store"));
            }

            // Handle image uploads
            let imageUrls: string[] = existingItem.itemImages || [];
            if (req.files && Array.isArray(req.files) && req.files.length > 0) {
                try {
                    const uploadResults = await Promise.all(
                        (req.files as Express.Multer.File[]).map(file =>
                            uploadToCloudinary(file.buffer, "Epharma/items")
                        )
                    );
                    imageUrls = uploadResults.map(r => r.secure_url);
                } catch (error) {
                    console.error("Cloudinary upload error:", error);
                    return next(new ApiError(500, "Failed to upload item images"));
                }
            }
            else if (req.body.itemImages) {
                if (Array.isArray(req.body.itemImages)) {
                    imageUrls = req.body.itemImages;
                } else if (typeof req.body.itemImages === "string") {
                    imageUrls = [req.body.itemImages];
                }
            }

            // Recalculate final price if needed
            let { itemFinalPrice } = existingItem;
            if (updateData.itemInitialPrice || updateData.itemGST) {
                const basePrice = Number(updateData.itemInitialPrice ?? existingItem.itemInitialPrice);
                const gstId = updateData.itemGST ?? existingItem.itemGST;

                let gstRate = 0;
                if (gstId) {
                    const gstData = await gstModel.findById(gstId).select("gstRate").lean();
                    gstRate = gstData?.gstRate ?? 0;
                }

                itemFinalPrice = +((basePrice + (basePrice * gstRate) / 100)).toFixed(2);
            }

            const updatedItem: any = await ItemModel.findByIdAndUpdate(
                itemId,
                {
                    ...updateData,
                    itemImages: imageUrls,
                    itemFinalPrice,
                    updatedBy: req.user?._id,
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!updatedItem) {
                return next(new ApiError(404, "Item not found"));
            }

            // Clear cache
            await redis.del(`items:store:${updatedItem.medicineStoreId}`);

            handleResponse(req, res, 200, "Item updated successfully", updatedItem);
        }
    );

    /**
     * Delete a single item
     */
    public static deleteItem = catchAsyncErrors(
        async (
            req: Request,
            res: Response,
            next: NextFunction
        ) => {
            const { itemId } = req.params;

            const existingItem = await ItemModel.findById(itemId);
            if (!existingItem) {
                return next(new ApiError(404, "Item not found"));
            }

            // Delete images from Cloudinary
            if (existingItem.itemImages && existingItem.itemImages.length > 0) {
                try {
                    const publicIds = existingItem.itemImages.map((url: string) => {
                        const parts = url.split("/");
                        const fileName = parts[parts.length - 1];
                        const publicId = fileName ? fileName.split(".")[0] : "";
                        return `Epharma/items/${publicId}`;
                    });

                    await Promise.all(
                        publicIds.map(async (pid) => {
                            try {
                                await cloudinary.uploader.destroy(pid);
                            } catch (err) {
                                console.warn(`Cloudinary delete failed for ${pid}:`, err);
                            }
                        })
                    );

                    console.log(`Deleted ${publicIds.length} images from Cloudinary`);
                } catch (err) {
                    console.error("Error deleting images from Cloudinary:", err);
                }
            }

            const deletedItem: any = await ItemModel.findByIdAndDelete(itemId);
            if (!deletedItem) {
                return next(new ApiError(404, "Item not found"));
            }

            // Clear cache
            try {
                await redis.del(`items:store:${deletedItem.medicineStoreId}`);
                const redisKeys = await redis.keys("items:*");
                if (redisKeys.length > 0) {
                    await redis.del(redisKeys);
                    console.log(`Cleared ${redisKeys.length} Redis cache keys`);
                }
            } catch (err) {
                console.error("Redis cache cleanup failed:", err);
            }

            handleResponse(req, res, 200, "Item deleted successfully", deletedItem);
        }
    );

    /**
     * Delete all items (admin only)
     */
    public static deleteAllItems = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const items = await ItemModel.find({}, { itemImages: 1 });

            if (!items.length) {
                return next(new ApiError(404, "No items found"));
            }

            // Collect all image public IDs
            const publicIds: string[] = [];

            items.forEach(item => {
                if (item.itemImages && item.itemImages.length > 0) {
                    item.itemImages.forEach((url: string) => {
                        const parts = url.split("/");
                        const fileName = parts[parts.length - 1];
                        const publicId = fileName ? fileName.split(".")[0] : "";
                        if (publicId) {
                            publicIds.push(`Epharma/items/${publicId}`);
                        }
                    });
                }
            });

            // Delete images from Cloudinary
            if (publicIds.length > 0) {
                try {
                    await Promise.all(
                        publicIds.map(pid =>
                            cloudinary.uploader.destroy(pid).catch(err => {
                                console.warn(`Cloudinary delete failed for ${pid}`, err);
                            })
                        )
                    );
                    console.log(`Deleted ${publicIds.length} images from Cloudinary`);
                } catch (err) {
                    console.error("Cloudinary bulk delete failed:", err);
                }
            }

            // Delete all items from database
            const deleteResult = await ItemModel.deleteMany({});
            if (!deleteResult.deletedCount) {
                return next(new ApiError(404, "No items found to delete"));
            }

            // Clear cache
            try {
                const redisKeys = await redis.keys("items:*");
                if (redisKeys.length > 0) {
                    await redis.del(redisKeys);
                    console.log(`Cleared ${redisKeys.length} Redis cache keys`);
                }
            } catch (err) {
                console.error("Redis cache cleanup failed:", err);
            }

            const deleteItemsCount = {
                deletedItems: deleteResult.deletedCount,
                deletedImages: publicIds.length
            };

            handleResponse(req, res, 200, "All items deleted successfully", deleteItemsCount);
        }
    );
}
