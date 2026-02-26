/*
┌───────────────────────────────────────────────────────────────────────┐
│  Admin Service - Store verification and management endpoints          │
│  Handles approval, rejection, and suspension of medicine stores       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { ApiError } from "../Middlewares/errorHandler";
import { handleResponse } from "../Utils/handleResponse";
import MedicineStoreModel from "../Databases/Models/medicineStore.Model";
import { VerificationStatus } from "../Databases/Entities/medicineStore.Interface";
import { mailClient } from "../Utils/mailClient";
import { EmailTemplates } from "../Utils/emailTemplates";
import { generateSecurePassword } from "../Utils/generatePassword";
import bcrypt from "bcryptjs";
import UserModel from "../Databases/Models/user.Model";

export default class AdminStoreService {
    /**
     * Get all stores pending verification
     */
    public static getPendingStores = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const skip = (page - 1) * limit;

            const stores = await MedicineStoreModel.find({
                verificationStatus: VerificationStatus.PENDING,
            })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 })
                .populate("ownerId", "name email phone");

            const total = await MedicineStoreModel.countDocuments({
                verificationStatus: VerificationStatus.PENDING,
            });

            return handleResponse(req, res, 200, "Pending stores fetched successfully", {
                stores,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
    );

    /**
     * Update store verification status (approve/reject/suspend)
     * Combines approveStore, rejectStore, and suspendStore into a single endpoint
     */
    public static updateStoreStatus = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { storeId } = req.params;
            const { action, adminRemarks } = req.body;
            const adminId = (req as any).user?._id;

            // Validate action
            const validActions = ['approve', 'reject', 'suspend'];
            if (!action || !validActions.includes(action)) {
                return next(new ApiError(400, `Invalid action. Must be one of: ${validActions.join(', ')}`));
            }

            // Validate remarks for reject and suspend actions
            if ((action === 'reject' || action === 'suspend') && !adminRemarks) {
                return next(new ApiError(400, `Admin remarks are required for ${action} action`));
            }

            const store = await MedicineStoreModel.findById(storeId);

            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }

            // Check if already approved (only for approve action)
            if (action === 'approve' && store.verificationStatus === VerificationStatus.APPROVED) {
                return next(new ApiError(400, "Store is already approved"));
            }

            // Update store based on action
            let emailTemplate: { subject: string; body: string };
            let successMessage = '';
            let recipientEmail = store.contactDetails.email; // Default to store email

            switch (action) {
                case 'approve':
                    store.verificationStatus = VerificationStatus.APPROVED;
                    store.isVerified = true;
                    store.verifiedAt = new Date();
                    store.verifiedBy = adminId;
                    store.adminRemarks = adminRemarks || "Store approved after verification";
                    
                    // Fetch owner information and check if this is a new account (needs password)
                    const populatedStore = await MedicineStoreModel.findById(storeId)
                        .populate('ownerId', '_id userName email');
                    
                    const ownerInfo = populatedStore?.ownerId as any;
                    let newPassword: string | undefined;
                    
                    // Check if this is the first store for this owner (new account needs activation password)
                    if (ownerInfo) {
                        const ownerStoresCount = await MedicineStoreModel.countDocuments({
                            ownerId: ownerInfo._id,
                            verificationStatus: VerificationStatus.APPROVED
                        });
                        
                        // If this is the first approved store, generate and set password
                        if (ownerStoresCount === 0) {
                            newPassword = generateSecurePassword();
                            console.log("newPassword : ", newPassword);
                            const hashedPassword = await bcrypt.hash(newPassword, 12);
                            
                            // Update user's password
                            await UserModel.findByIdAndUpdate(
                                ownerInfo._id,
                                { password: hashedPassword },
                                { new: true }
                            );
                            
                            console.log('🔑 New password generated and set for first-time owner');
                        } else {
                            console.log('👤 Existing owner with approved stores - using existing credentials');
                        }
                    }
                    
                    // Set recipient email to owner's email (important for login credentials)
                    if (ownerInfo && ownerInfo.email) {
                        recipientEmail = ownerInfo.email;
                        console.log(`📧 Email will be sent to owner: ${recipientEmail}`);
                    }
                    
                    // Send approval email with credentials if new password was generated
                    if (newPassword && ownerInfo) {
                        emailTemplate = EmailTemplates.storeApprovedWithCredentials({
                            userName: ownerInfo.userName,
                            storeName: store.storeName,
                            email: ownerInfo.email,
                            password: newPassword,
                            GSTNumber: store.GSTNumber,
                            verifiedDate: new Date().toLocaleDateString(),
                            adminRemarks
                        });
                    } else {
                        // Existing owner with approved stores, no new password needed
                        emailTemplate = EmailTemplates.storeApproved({
                            storeName: store.storeName,
                            GSTNumber: store.GSTNumber,
                            verifiedDate: new Date().toLocaleDateString(),
                            adminRemarks
                        });
                    }
                    
                    successMessage = "Store approved successfully";
                    break;

                case 'reject':
                    store.verificationStatus = VerificationStatus.REJECTED;
                    store.isVerified = false;
                    store.verifiedBy = adminId;
                    store.adminRemarks = adminRemarks;
                    
                    emailTemplate = EmailTemplates.storeRejected({
                        storeName: store.storeName,
                        adminRemarks
                    });
                    successMessage = "Store rejected";
                    break;

                case 'suspend':
                    store.verificationStatus = VerificationStatus.SUSPENDED;
                    store.isActive = false;
                    store.verifiedBy = adminId;
                    store.adminRemarks = adminRemarks;
                    
                    emailTemplate = EmailTemplates.storeSuspended({
                        storeName: store.storeName,
                        adminRemarks
                    });
                    successMessage = "Store suspended";
                    break;

                default:
                    return next(new ApiError(400, "Invalid action specified"));
            }

            await store.save();

            // Send notification email
            let emailSent = false;
            let emailError: string | null = null;
            
            try {
                console.log(`📧 Sending ${action} email to: ${recipientEmail}`);
                const emailResult = await mailClient.sendNotificationEmail(
                    recipientEmail,
                    emailTemplate.subject,
                    emailTemplate.body
                );
                
                if (emailResult.success) {
                    emailSent = true;
                    console.log(`✅ ${action} email sent successfully to ${recipientEmail}`);
                } else {
                    emailError = emailResult.message || 'Unknown error';
                    console.error(`❌ ${action} email failed for ${recipientEmail}: ${emailError}`);
                }
            } catch (error: any) {
                emailError = error.message || 'Email service unavailable';
                console.error(`❌ ${action} email exception for ${recipientEmail}:`, error);
                console.error(`   Make sure Service 1 (mail service) is running on: ${process.env.SERVICE_1_URL || 'http://localhost:5000'}`);
            }

            return handleResponse(req, res, 200, successMessage, {
                storeId: store._id,
                storeName: store.storeName,
                action: action,
                verificationStatus: store.verificationStatus,
                verifiedAt: action === 'approve' ? store.verifiedAt : undefined,
                adminRemarks: store.adminRemarks,
                emailNotification: {
                    sent: emailSent,
                    recipient: recipientEmail,
                    error: emailError,
                },
            });
        }
    );

    /**
     * Get store details for admin review
     */
    public static getStoreDetails = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { storeId } = req.params;

            const store = await MedicineStoreModel.findById(storeId)
                .populate("ownerId", "name email phone")
                .populate("verifiedBy", "name email");

            if (!store) {
                return next(new ApiError(404, "Store not found"));
            }

            return handleResponse(req, res, 200, "Store details fetched successfully", store);
        }
    );

    /**
     * Get verification statistics
     */
    public static getVerificationStats = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const stats = await Promise.all([
                MedicineStoreModel.countDocuments({ verificationStatus: VerificationStatus.PENDING }),
                MedicineStoreModel.countDocuments({ verificationStatus: VerificationStatus.APPROVED }),
                MedicineStoreModel.countDocuments({ verificationStatus: VerificationStatus.REJECTED }),
                MedicineStoreModel.countDocuments({ verificationStatus: VerificationStatus.SUSPENDED }),
                MedicineStoreModel.countDocuments({ gstVerified: true }),
                MedicineStoreModel.countDocuments({ pharmacistVerified: true }),
            ]);

            return handleResponse(req, res, 200, "Verification statistics fetched successfully", {
                pending: stats[0],
                approved: stats[1],
                rejected: stats[2],
                suspended: stats[3],
                gstVerified: stats[4],
                pharmacistVerified: stats[5],
                total: stats[0] + stats[1] + stats[2] + stats[3],
            });
        }
    );
}
