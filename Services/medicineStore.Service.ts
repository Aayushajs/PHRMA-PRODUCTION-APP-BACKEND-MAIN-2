import MedicineStoreModel from "../Databases/Models/medicineStore.Model";
import UserModel from "../Databases/Models/user.Model";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { Request, Response, NextFunction } from "express"
import { ApiError } from "../Middlewares/errorHandler";
import bcrypt from "bcryptjs";
import { handleResponse } from "../Utils/handleResponse";
import { mailClient } from "../Utils/mailClient";
import RoleIndex from "../Utils/Roles.enum";
import {
    validateGSTFormat,
    validatePharmacyLicenseFormat,
    validatePincodeFormat,
    validatePhoneNumber,
    validateEmail
} from "../Utils/validators";
import {
    validatePincodeMatch
} from "../Utils/pincodeService";
import { EmailTemplates } from "../Utils/emailTemplates";
import { DocumentUploadService } from "../Utils/documentUpload";
import { GSTVerificationService } from "../Utils/gstVerification";
import { LicenseOCRService } from "../Utils/licenseOcr";
import { VerificationStatus } from "../Databases/Entities/medicineStore.Interface";
import ItemModel from "../Databases/Models/item.Model";
import { calculateDistance } from "../Utils/miscelleneousCalcs";
import { Types } from "mongoose";

export default class MedicineStoreService {
    /**
     * Register a new medicine store with complete verification
     * Validates GST Number, Pharmacy License, and Pincode-City-State match
     */
    public static storeRegistration = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const {
                userName,
                storeName,
                storeType,
                GSTNumber,
                pharmacyLicence,
                drugLicenceNumber,
                address: {
                    street = '',
                    area = '',
                    city = '',
                    state = '',
                    pincode = '',
                    landmark = '',
                    location: {
                        type: locationType = 'Point',
                        coordinates: locationCoordinates = []
                    } = {}
                } = {},
                phone,
                alternatePhone,
                email,
                whatsappNumber,
                description
            } = req.body;

            // Check required fields
            const requiredFields = {
                userName,
                storeName,
                storeType,
                GSTNumber,
                pharmacyLicence,
                street,
                city,
                state,
                pincode,
                phone,
                email
            };
            const missingFields = Object.entries(requiredFields)
                .filter(([__, value]) => !value)
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return next(
                    new ApiError(
                        400,
                        `Missing required fields: ${missingFields.join(", ")}`
                    )
                )
            }

            // Validate email format
            const emailValidation = validateEmail(email);
            if (!emailValidation.isValid) {
                return next(new ApiError(400, emailValidation.message));
            }

            // Validate phone number
            const phoneValidation = validatePhoneNumber(phone);
            if (!phoneValidation.isValid) {
                return next(new ApiError(400, phoneValidation.message));
            }

            // Validate alternate phone number (if provided)
            if (alternatePhone) {
                const altPhoneValidation = validatePhoneNumber(alternatePhone);
                if (!altPhoneValidation.isValid) {
                    return next(new ApiError(400, `Alternate phone: ${altPhoneValidation.message}`));
                }
            }

            // Validate WhatsApp number (if provided)
            if (whatsappNumber) {
                const whatsappValidation = validatePhoneNumber(whatsappNumber);
                if (!whatsappValidation.isValid) {
                    return next(new ApiError(400, `WhatsApp number: ${whatsappValidation.message}`));
                }
            }

            // Validate GST Number format
            const gstValidation = validateGSTFormat(GSTNumber);
            if (!gstValidation.isValid) {
                return next(new ApiError(400, gstValidation.message));
            }

            // Validate Pharmacy License format
            const licenseValidation = validatePharmacyLicenseFormat(pharmacyLicence, state);
            if (!licenseValidation.isValid) {
                return next(new ApiError(400, licenseValidation.message));
            }

            // Validate pincode format
            const pincodeFormatValidation = validatePincodeFormat(pincode);
            if (!pincodeFormatValidation.isValid) {
                return next(new ApiError(400, pincodeFormatValidation.message));
            }

            // Verify pincode matches city and state
            const pincodeMatchValidation = await validatePincodeMatch(pincode, city, state);
            if (!pincodeMatchValidation.isValid) {
                return next(new ApiError(400, pincodeMatchValidation.message));
            }

            // Validate location coordinates (if provided)
            if (locationCoordinates && locationCoordinates.length > 0) {
                if (!Array.isArray(locationCoordinates) || locationCoordinates.length !== 2) {
                    return next(new ApiError(400, "Coordinates must be an array with exactly 2 values: [longitude, latitude]"));
                }
                const [longitude, latitude] = locationCoordinates;

                if (typeof longitude !== 'number' || typeof latitude !== 'number') {
                    return next(new ApiError(400, "Longitude and latitude must be numbers"));
                }

                if (latitude < -90 || latitude > 90) {
                    return next(new ApiError(400, "Latitude must be between -90 and 90 degrees"));
                }

                if (longitude < -180 || longitude > 180) {
                    return next(new ApiError(400, "Longitude must be between -180 and 180 degrees"));
                }
            }

            // Validate location type format
            if (locationType && locationType !== 'Point') {
                return next(new ApiError(400, "Location type must be 'Point'"));
            }

            // Check if store with same GST or pharmacy license already exists
            const existingStore = await MedicineStoreModel.findOne({
                $or: [
                    { GSTNumber: GSTNumber.toUpperCase().trim() },
                    { pharmacyLicence: pharmacyLicence.toUpperCase().trim() }
                ]
            });

            if (existingStore) {
                if (existingStore.GSTNumber === GSTNumber.toUpperCase().trim()) {
                    return next(new ApiError(409, "A store with this GST Number is already registered"));
                }
                if (existingStore.pharmacyLicence === pharmacyLicence.toUpperCase().trim()) {
                    return next(new ApiError(409, "A store with this Pharmacy License is already registered"));
                }
            }

            // Check if email or phone already exists
            const existingContact = await MedicineStoreModel.findOne({
                $or: [
                    { "contactDetails.email": email.toLowerCase().trim() },
                    { "contactDetails.phone": phone.replace(/[\s\-()]/g, '') }
                ]
            });

            if (existingContact) {
                return next(new ApiError(409, "A store with this email or phone number is already registered"));
            }

            // Check if user already exists with BOTH email AND phone (same owner registering another store)
            let existingUser = await UserModel.findOne({
                email: email.toLowerCase().trim(),
                phone: phone.replace(/[\s\-()]/g, '')
            });

            // Check if email or phone is already taken by someone else
            let conflictingUser: any = null;
            if (!existingUser) {
                conflictingUser = await UserModel.findOne({
                    $or: [
                        { email: email.toLowerCase().trim() },
                        { phone: phone.replace(/[\s\-()]/g, '') }
                    ]
                });

                if (conflictingUser) {
                    if (conflictingUser.email === email.toLowerCase().trim()) {
                        return next(new ApiError(409, "A user with this email already exists. Please use a different email or provide the matching phone number."));
                    }
                    if (conflictingUser.phone === phone.replace(/[\s\-()]/g, '')) {
                        return next(new ApiError(409, "A user with this phone number already exists. Please use a different phone or provide the matching email."));
                    }
                }
            }

            // Verify GST with government API
            let gstVerified = false;
            try {
                const gstVerification = await GSTVerificationService.verifyGST(GSTNumber);
                if (!gstVerification.isActive) {
                    return next(new ApiError(400, "GST Number is not active. Please use an active GST Number."));
                }
                gstVerified = true;
            } catch (error: any) {
                console.warn("GST verification warning:", error.message);
                // Continue registration even if GST verification fails
            }

            // Process document uploads (if provided)
            const documents: any = {};
            const files = (req as any).files || {};

            if (files.drugLicense) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.drugLicense.buffer,
                    files.drugLicense.originalname,
                    "medicine-store/licenses"
                );
                documents.drugLicense = uploadResult.url;
            }

            if (files.pharmacistCert) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.pharmacistCert.buffer,
                    files.pharmacistCert.originalname,
                    "medicine-store/certificates"
                );
                documents.pharmacistCert = uploadResult.url;
            }

            if (files.storePhoto) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.storePhoto.buffer,
                    files.storePhoto.originalname,
                    "medicine-store/photos"
                );
                documents.storePhoto = uploadResult.url;
            }

            if (files.kycDoc) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.kycDoc.buffer,
                    files.kycDoc.originalname,
                    "medicine-store/kyc"
                );
                documents.kycDoc = uploadResult.url;
            }

            // Extract license expiry from OCR (if license document uploaded)
            let licenseExpiry: Date | undefined;
            let pharmacistVerified = false;

            if (documents.drugLicense || documents.pharmacistCert) {
                try {
                    const documentUrl = documents.drugLicense || documents.pharmacistCert;
                    const ocrResult = await LicenseOCRService.extractLicenseData(documentUrl);

                    if (ocrResult.isExpired) {
                        return next(
                            new ApiError(
                                400,
                                "Uploaded license has expired. Please upload a valid license."
                            )
                        );
                    }

                    licenseExpiry = ocrResult.expiryDate;
                    pharmacistVerified = true;
                } catch (error: any) {
                    console.warn("OCR extraction warning:", error.message);
                    // Continue without expiry date if OCR fails
                }
            }

            // ============================================================
            // USER CREATION LOGIC - Only executes if all validations pass
            // ============================================================
            let ownerId: any;

            if (existingUser) {
                // Same owner trying to register another store
                ownerId = existingUser._id;
                console.log("👤 Existing user found. Linking to new store.");
            } else {
                // Create new user (neither email nor phone exists)
                // User will receive actual password after admin approval
                const placeholderPassword = `pending_approval_${Date.now()}`;
                const hashedPassword = await bcrypt.hash(placeholderPassword, 12);

                const newUser = await UserModel.create({
                    userName: userName,
                    email: email.toLowerCase().trim(),
                    phone: phone.replace(/[\s\-()]/g, ''),
                    password: hashedPassword, // Placeholder - will be replaced upon approval
                    role: RoleIndex.OWNER,
                    dob: new Date(),
                    pharmacyInfo: {
                        designation: "Owner"
                    }
                });

                ownerId = newUser._id;
                console.log("👤 New user created. Password will be set upon approval.");

                // Send welcome email to new user only after successful user creation
                try {
                    const welcomeEmail = EmailTemplates.storeRegistrationPending({
                        userName,
                        storeName,
                        GSTNumber,
                        pharmacyLicence
                    });
                    await mailClient.sendNotificationEmail(
                        email,
                        "Store Registration Received",
                        welcomeEmail.body
                    );
                } catch (error) {
                    console.error("Registration confirmation email failed:", error);
                }
            }

            // Create medicine store record with all schema-aligned fields
            const newStore = await MedicineStoreModel.create({
                // Basic info
                storeName,
                storeType,
                description: description || undefined,

                // License/verification info
                GSTNumber: GSTNumber.toUpperCase().trim(),
                pharmacyLicence: pharmacyLicence.toUpperCase().trim(),
                drugLicenceNumber: drugLicenceNumber ? drugLicenceNumber.toUpperCase().trim() : undefined,

                // Complete address object aligned with schema
                address: {
                    street,
                    area: area || undefined,
                    city,
                    state,
                    pincode,
                    landmark: landmark || undefined,
                    // Location for geospatial queries
                    location: locationCoordinates && locationCoordinates.length === 2
                        ? {
                            type: locationType || 'Point',
                            coordinates: locationCoordinates
                        }
                        : undefined,
                },

                // Complete contact details aligned with schema
                contactDetails: {
                    phone: phone.replace(/[\s\-()]/g, ''),
                    alternatePhone: alternatePhone ? alternatePhone.replace(/[\s\-()]/g, '') : undefined,
                    email: email.toLowerCase().trim(),
                    whatsappNumber: whatsappNumber ? whatsappNumber.replace(/[\s\-()]/g, '') : undefined,
                },
                ownerId: ownerId,
                verificationStatus: VerificationStatus.PENDING,
                isVerified: false,
                isActive: true,
                gstVerified,
                pharmacistVerified,
                documents: Object.keys(documents).length > 0 ? documents : undefined,
                licenseExpiry,
            });

            // Establish bidirectional connection between User and Store
            await UserModel.findByIdAndUpdate(
                ownerId,
                {
                    $set: {
                        "pharmacyInfo.storeId": newStore._id,      // For pharmacy info reference
                        "pharmacyInfo.storeName": storeName,       // Store name for easy access
                        "pharmacyInfo.licenseNumber": pharmacyLicence, // License tracking
                        medicineStoreId: newStore._id              // For item ownership and permissions
                    }
                },
                { new: true }
            );

            // Send confirmation email
            try {
                const registrationEmail = EmailTemplates.storeRegistrationPending({
                    userName,
                    storeName,
                    GSTNumber,
                    pharmacyLicence
                });
                await mailClient.sendNotificationEmail(
                    email,
                    registrationEmail.subject,
                    registrationEmail.body
                );
            } catch (error) {
                console.error("Email sending failed:", error);
            }

            return handleResponse(req, res, 201, "Registration submitted. Awaiting verification.", {
                storeId: newStore._id,
                storeName: newStore.storeName,
                ownerInfo: {
                    userId: ownerId,
                    userName: userName,
                    email: email,
                    phone: phone
                },
                verificationStatus: newStore.verificationStatus,
                gstVerified: newStore.gstVerified,
                pharmacistVerified: newStore.pharmacistVerified,
                licenseExpiry: newStore.licenseExpiry,
                fastDeliveryAvailable: newStore.fastDeliveryAvailable,
                message: "Your store registration has been submitted successfully. Our team will review and verify your documents shortly. You will be notified once approved.",
            });
        }
    );

    // public static getStoreDetails = catchAsyncErrors(
    //     async (req: Request, res: Response, next: NextFunction) => {
    //         const storeId = req.params.storeId;
    //         const store = await MedicineStoreModel.findById(storeId).populate("ownerId", "userName email phone");

    //         if (!store) {
    //             return next(new ApiError(404, "Store not found"));
    //         }

    //         return handleResponse(req, res, 200, "Store details retrieved successfully", {
    //             storeId: store._id,
    //             storeName: store.storeName,
    //             storeType: store.storeType,
    //             GSTNumber: store.GSTNumber,
    //             pharmacyLicence: store.pharmacyLicence,
    //             address: store.address,
    //             contactDetails: store.contactDetails,
    //             ownerId: store.ownerId
    //         });
    //     }
    // );

    public static getAllStores = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { nearby, topRated, fastDelivery, openNow } = req.query;
            const filter: any = {};

            if (openNow === 'true') {
                filter.isStoreOpen = true;
            }

            if (fastDelivery === 'true') {
                filter.fastDeliveryAvailable = true;
            }

            if (topRated === 'true') {
                filter.averageRating = { $gte: 4 };
            }

            if (nearby === 'true') {
                const lat = parseFloat(req.query.latitude as string);
                const lng = parseFloat(req.query.longitude as string);
                const maxDistance = parseInt(req.query.maxDistance as string) || 5000;

                if (isNaN(lat) || isNaN(lng)) {
                    return next(new ApiError(400, "Invalid coordinates"));
                }

                filter["address.location"] = {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [lng, lat]
                        },
                        $maxDistance: maxDistance
                    }
                };
            }

            const stores = await MedicineStoreModel.find(filter).populate("ownerId", "userName email phone");
            return handleResponse(req, res, 200, "All stores retrieved successfully", {
                stores: stores.map(store => ({
                    storeId: store._id,
                    storeName: store.storeName,
                    storeImage: store.storeImages?.[0] || null,
                    storeType: store.storeType,
                    address: store.address,
                    contactDetails: store.contactDetails,
                    isStoreOpen: store.isStoreOpen,
                    storeReviews: store.storeReviews,
                    ownerId: store.ownerId,
                    description: store.description
                }))
            });
        }
    );

    public static deleteStore = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const storeId = req.params.storeId;
            const userId = req.user?._id;
            console.log("user : ", userId)
            if (!userId) {
                return next(new ApiError(401, "Unauthorized: User not authenticated"));
            }
            const store = await MedicineStoreModel.findById(storeId);
            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }
            await MedicineStoreModel.findByIdAndDelete(storeId);
            return handleResponse(req, res, 200, "Store deleted successfully", null);
        }
    );

    public static updateStore = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const storeId = req.params.storeId;
            const updateData = req.body;
            const store = await MedicineStoreModel.findById(storeId);
            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }
            // Only allow certain fields to be updated
            const allowedFields = ["storeName", "storeType", "address", "contactDetails", "isStoreOpen", "description", "fastDeliveryAvailable"];
            const filteredUpdate: any = {};
            for (const key of allowedFields) {
                if (updateData[key]) {
                    filteredUpdate[key] = updateData[key];
                }
            }
            const updatedStore = await MedicineStoreModel.findByIdAndUpdate(storeId, filteredUpdate, { new: true });
            return handleResponse(req, res, 200, "Store updated successfully", {
                storeId: updatedStore?._id,
                storeName: updatedStore?.storeName,
                storeType: updatedStore?.storeType,
                address: updatedStore?.address,
                contactDetails: updatedStore?.contactDetails,
                isStoreOpen: updatedStore?.isStoreOpen,
                description: updatedStore?.description,
                fastDeliveryAvailable: updatedStore?.fastDeliveryAvailable

            });
        }
    );
    public static getMedicineItemByStoreId = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const storeId = req.params.storeId;
            const userRole = req.user?.role;

            const store = await MedicineStoreModel.findById(storeId);
            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }

            const items = await ItemModel.find({ medicineStoreId: storeId });

            // Build response based on user role
            const itemsResponse = items.map(item => {
                const baseItem = {
                    itemId: item._id,
                    itemImage: item.itemImages?.[0] || null,
                    itemName: item.itemName,
                    price: item.itemFinalPrice,
                    description: item.itemDescription,
                    category: item.itemCategory,
                    stockStatus: item.stockStatus,
                    ratings: item.itemRatings,
                };

                // Add staff-only fields
                if (userRole === 'STAFF' || userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'PHARMACIST') {
                    return {
                        ...baseItem,
                        stockAvailability: item.stockAvailability,
                    };
                } else if (userRole === 'CUSTOMER') {
                    return baseItem
                }

                return baseItem;
            });

            return handleResponse(req, res, 200, "Items retrieved successfully", {
                storeId: store._id,
                storeName: store.storeName,
                items: itemsResponse,
            });
        }
    );
    public static giveStoreReviewAndRating = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const storeId = req.params.storeId;
            const userIdString = req.user?._id;
            const { rating, comment } = req.body;

            // Validate userId
            if (!userIdString) {
                return next(new ApiError(401, "User must be authenticated to add a review"));
            }

            // Convert userId to ObjectId
            const userId = new Types.ObjectId(userIdString);

            // Validate rating - handle both string and number formats
            const ratingNum = typeof rating === 'string' ? parseInt(rating) : rating;
            if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
                return next(new ApiError(400, "Rating is required and must be a number between 1 and 5"));
            }

            const store = await MedicineStoreModel.findById(storeId);
            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }

            // Add the new review to the store's reviews array
            if (!store.storeReviews) {
                store.storeReviews = [];
            }

            store.storeReviews.push({ userId, rating: ratingNum, comment });

            // Update totalReviews and recalculate averageRating
            store.totalReviews = store.storeReviews.length;
            const totalRating = store.storeReviews.reduce((sum: number, r: any) => sum + r.rating, 0);
            store.averageRating = totalRating / store.storeReviews.length;

            await store.save();

            return handleResponse(req, res, 201, "Review added successfully", {
                storeId: store._id,
                reviewCount: store.totalReviews,
                averageRating: store.averageRating.toFixed(2)
            });
        }
    );

    public static getReviewCountAndAverageRating = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const storeId = req.params.storeId;
            const store = await MedicineStoreModel.findById(storeId);
            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }
            const reviews = store.storeReviews || [];
            const reviewCount = reviews.length;
            const averageRating = reviewCount > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount : 0;
            return handleResponse(req, res, 200, "Review count and average rating retrieved successfully", {
                storeId: store._id,
                reviewCount,
                averageRating: averageRating.toFixed(2)
            });
        }
    );

    public static countAndgetDistancesToStores = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { longitude, latitude } = req.query;
            if (!longitude || !latitude) {
                return next(new ApiError(400, "Longitude and latitude are required"));
            }
            const stores = await MedicineStoreModel.find({
                "address.location": { $exists: true }
            });
            const storesWithDistance = stores.map(store => {
                if (store.address.location && store.address.location.coordinates) {
                    const distance = calculateDistance(
                        parseFloat(latitude as string),
                        parseFloat(longitude as string),
                        store.address.location.coordinates[1],
                        store.address.location.coordinates[0]
                    );
                    return {
                        storeId: store._id,
                        storeName: store.storeName,
                        distance: distance.toFixed(2) // Distance in kilometers
                    };
                }
                return {
                    storeId: store._id,
                    storeName: store.storeName,
                    distance: null // Location not available
                };
            }
            );
            return handleResponse(req, res, 200, "Distances to stores calculated successfully", {
                stores: storesWithDistance
            });
        }
    );
}


