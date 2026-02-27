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
import { validatePincodeMatch } from "../Utils/pincodeService";
import { EmailTemplates } from "../Utils/emailTemplates";
import { DocumentUploadService } from "../Utils/documentUpload";
import { GSTVerificationService } from "../Utils/gstVerification";
import { LicenseOCRService } from "../Utils/licenseOcr";
import { VerificationStatus } from "../Databases/Entities/medicineStore.Interface";

export default class MedicineStoreService {
    /**
     * Register a new medicine store with complete verification
     * Validates GST Number, Pharmacy License, and Pincode-City-State match
     */
    public static storeRegistration = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { userName, email, phone, storeName, storeType, GSTNumber, pharmacyLicence, address, city, state, pincode } = req.body;

            // Check required fields
            const requiredFields = { userName, email, phone, storeName, storeType, GSTNumber, pharmacyLicence, address, city, state, pincode };
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

            // Create or find user (store owner)
            let ownerId: any;

            // Check if user already exists with BOTH email AND phone (same owner registering another store)
            let existingUser = await UserModel.findOne({
                email: email.toLowerCase().trim(),
                phone: phone.replace(/[\s\-()]/g, '')
            });

            if (existingUser) {
                // Same owner trying to register another store
                ownerId = existingUser._id;
            } else {
                // Check if email or phone is already taken by someone else
                const conflictingUser = await UserModel.findOne({
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

                // Send initial registration confirmation (without password)
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

            // Step 11: Verify GST with government API
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

            // Step 12: Process document uploads (if provided)
            const documents: Record<string, string> = {};
            const files = (req as Request & { files?: { [fieldname: string]: Express.Multer.File[] } }).files || {};

            if (files.drugLicense && files.drugLicense[0]) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.drugLicense[0].buffer,
                    files.drugLicense[0].originalname,
                    "medicine-store/licenses"
                );
                documents.drugLicense = uploadResult.url;
            }

            if (files.pharmacistCert && files.pharmacistCert[0]) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.pharmacistCert[0].buffer,
                    files.pharmacistCert[0].originalname,
                    "medicine-store/certificates"
                );
                documents.pharmacistCert = uploadResult.url;
            }

            if (files.storePhoto && files.storePhoto[0]) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.storePhoto[0].buffer,
                    
                    files.storePhoto[0].originalname,
                    "medicine-store/photos"
                );
                documents.storePhoto = uploadResult.url;
            }

            if (files.kycDoc && files.kycDoc[0]) {
                const uploadResult = await DocumentUploadService.uploadDocument(
                    files.kycDoc[0].buffer,
                    files.kycDoc[0].originalname,
                    "medicine-store/kyc"
                );
                documents.kycDoc = uploadResult.url;
            }

            // Step 13: Extract license expiry from OCR (if license document uploaded)
            let licenseExpiry: Date | undefined;
            let pharmacistVerified = false;

            if (documents.drugLicense || documents.pharmacistCert) {
                try {
                    const documentUrl = documents.drugLicense || documents.pharmacistCert;
                    if (documentUrl) {
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
                    }
                } catch (error: any) {
                    console.warn("OCR extraction warning:", error.message);
                    // Continue without expiry date if OCR fails
                }
            }

            // Step 14: Create medicine store record
            const newStore = await MedicineStoreModel.create({
                storeName,
                storeType,
                GSTNumber: GSTNumber.toUpperCase().trim(),
                pharmacyLicence: pharmacyLicence.toUpperCase().trim(),
                address: {
                    street: address,
                    city,
                    state,
                    pincode: String(pincode),
                },
                contactDetails: {
                    phone: phone.replace(/[\s\-()]/g, ''),
                    email: email.toLowerCase().trim(),
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

            // Step 14.1: Establish bidirectional connection between User and Store
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

            // Step 15: Send confirmation email
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
                message: "Your store registration has been submitted successfully. Our team will review and verify your documents shortly. You will be notified once approved.",
            });
        }
    );
}