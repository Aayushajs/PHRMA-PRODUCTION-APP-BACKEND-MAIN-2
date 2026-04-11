import UserModel from "../Databases/Models/user.Model"
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { Request, Response, NextFunction } from "express"
import { ApiError } from "../Middlewares/errorHandler";
import bcrypt from "bcryptjs"
import { generateUserToken } from "../Utils/jwtToken"
import { handleResponse } from "../Utils/handleResponse";
import { redis } from "../config/redis";
import { generateOtp } from "../Utils/OtpGenerator";
import { mailClient } from "../Utils/mailClient";
import { Iuser, DeliveryAddress } from "@databases/Entities/user.Interface";
import mongoose from "mongoose";

export default class UserService {
    public static login = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { email, password, fcmToken } = req.body;

            const requiredFields = { email, password };
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

            const userExist = await UserModel.findOne({email}).select("+password");
            if (!userExist) {
                return next(new ApiError(400, "User doesn't exists"));
            }

            const isPasswordMatched = await bcrypt.compare(
                password,
                userExist.password
            )

            if (!isPasswordMatched) {
                return next(new ApiError(400, "Invalid email or password"));
            }

            userExist.lastLogin = new Date();

            if (fcmToken) {
                userExist.fcmToken = fcmToken;
            }

            const userObj = userExist.toObject();

            const userToken = generateUserToken({
                _id: userObj._id,
                email: userObj.email,
                role: userObj.role,
            });

            const userData = {
                _id: userObj._id,
                name: userObj.userName,
                email: userObj.email,
                phone: userObj.phone,
                fcmToken: userObj.fcmToken,
                lastLogin: userObj.lastLogin,
                address: userObj.address,
                role: userObj.role,
                ProfileImage: userObj.ProfileImage || [],
                createdAt: userObj.createdAt,
                updatedAt: userObj.updatedAt,
            };

            res.cookie("userToken", userToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 14 * 24 * 60 * 60 * 1000,
            });

            return handleResponse(req, res, 200, "Login Successful", {
                user: userData,
                token: userToken,
            });
        }
    )


    public static logout = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            res.cookie("userToken", null, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 14 * 24 * 60 * 60 * 1000,
            });

            return handleResponse(req, res, 200, "Logout Successful");
        }
    );

    public static forgotPassword = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { email } = req.body;

            if (!email) {
                return next(new ApiError(400, "Email is required"));
            }

            const Existeduser = await UserModel.findOne({ email });
            if (!Existeduser) {
                return next(new ApiError(400, "User not found"));
            }

            const otp = generateOtp(6).toString();

            await redis.set(`otp:${Existeduser._id}`, otp, { EX: 180 });

            try {
                // mailClient automatically includes INTERNAL_SERVICE_API_KEY in all requests
                // via axios instance headers configured during initialization
                let result = await mailClient.sendCustomOTP(email, otp);

                // Fallback to notification email if sendCustomOTP fails
                if (!result.success && result.statusCode === 404) {
                    console.log('⚠️ sendCustomOTP endpoint not found, falling back to sendNotificationEmail');
                    result = await mailClient.sendNotificationEmail(
                        email,
                        'Password Reset OTP',
                        `Your OTP for password reset is: ${otp}. This OTP will expire in 3 minutes.`
                    );
                }

                if (!result.success) {
                    await redis.del(`otp:${Existeduser._id}`);
                    return next(new ApiError(500, result.error || "Failed to send OTP"));
                }

                const message = result.data?.alternated
                    ? `OTP sent via ${result.data?.provider} (backup used)`
                    : `OTP sent successfully`;

                return handleResponse(req, res, 200, message, {
                    provider: result.data?.provider,
                    alternated: result.data?.alternated,
                    expiresIn: '3 minutes'
                });
            } catch (emailError: unknown) {
                await redis.del(`otp:${Existeduser._id}`);
                return next(new ApiError(500, "Failed to send OTP. Please try again."));
            }
        }
    );

    public static verifyOtp = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { otp, email } = req.body;

            if (!otp || !email) {
                return next(new ApiError(400, "OTP and email are required"));
            }

            const normalizedEmail = email.toLowerCase().trim();
            const user = await UserModel.findOne({ email: normalizedEmail }).select("_id email").lean();

            if (!user) {
                return next(new ApiError(400, "Invalid request"));
            }

            const SystemGeneratedOtp = await redis.get(`otp:${user._id}`);

            if (!SystemGeneratedOtp) {
                return next(new ApiError(400, "OTP expired or invalid"));
            }

            if (SystemGeneratedOtp !== otp) {
                return next(new ApiError(400, "Invalid OTP"));
            }

            await redis.del(`otp:${user._id}`);
            await redis.set(`reset_verified:${user._id}`, "1", { EX: 600 });

            return handleResponse(req, res, 200, "OTP verified successfully", {
                resetToken: true,
            });
        }
    );

    public static ResetPassword = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { password, email } = req.body;

            if (!email || !password) {
                return next(new ApiError(400, "Email and password are required"));
            }

            if (password.length < 4) {
                return next(new ApiError(400, "Password must be at least 4 characters"));
            }

            const normalizedEmail = email.toLowerCase().trim();

            const user = await UserModel.findOne({ email: normalizedEmail }).select("+password");

            if (!user) {
                return next(new ApiError(400, "Invalid request"));
            }

            const resetVerified = await redis.get(`reset_verified:${user._id}`);
            if (!resetVerified) {
                return next(new ApiError(403, "Unauthorized. Please verify OTP first"));
            }

            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                return next(new ApiError(400, "New password cannot be same as old password"));
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            user.password = hashedPassword;
            await user.save({ validateBeforeSave: false });

            await redis.del(`reset_verified:${user._id}`);
            await redis.del(`otp:${user._id}`);

            // Send password reset confirmation email with security details
            try {
                // Extract security context from request
                const ipAddress = req.ip || 
                                req.headers['x-forwarded-for'] as string || 
                                req.socket.remoteAddress || 
                                'Unknown';
                const userAgent = req.headers['user-agent'] || 'Unknown device';
                
                // mailClient automatically includes INTERNAL_SERVICE_API_KEY in all requests
                // via axios instance headers configured during initialization
                await mailClient.sendPasswordResetConfirmation(normalizedEmail, {
                    userName: user.userName,
                    resetTime: new Date(),
                    ipAddress: ipAddress,
                    deviceInfo: userAgent,
                });
            } catch (emailError) {
                console.error("Failed to send confirmation email:", emailError);
            }

            return handleResponse(req, res, 200, "Password reset successfully");
        }
    );

    // ================================================================
    // DELIVERY ADDRESS MANAGEMENT
    // ================================================================

    /**
     * Add a new delivery address
     */
    public static addDeliveryAddress = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;
            const {
                recipientName,
                recipientPhone,
                street,
                area,
                city,
                state,
                pincode,
                landmark,
                location,
                addressType,
                isDefault
            } = req.body;

            // Validate required fields
            const requiredFields = { recipientName, recipientPhone, street, city, state, pincode };
            const missingFields = Object.entries(requiredFields)
                .filter(([__, value]) => !value)
                .map(([key]) => key);

            if (missingFields.length > 0) {
                return next(
                    new ApiError(400, `Missing required fields: ${missingFields.join(", ")}`)
                );
            }

            // Validate pincode format
            if (!/^[0-9]{6}$/.test(pincode.toString())) {
                return next(new ApiError(400, "Invalid pincode format"));
            }

            // Validate phone format
            if (!/^[0-9]{10}$/.test(recipientPhone.replace(/\D/g, ""))) {
                return next(new ApiError(400, "Invalid phone number format"));
            }

            const user = await UserModel.findById(userId);
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            // If this is set as default, unset other default addresses
            if (isDefault) {
                user.deliveryAddresses = user.deliveryAddresses?.map((addr) => {
                    const addrObj = (addr as mongoose.Document & DeliveryAddress).toObject();
                    return {
                        ...addrObj,
                        isDefault: false
                    };
                }) || [];
            }

            // Create new address
            const newAddress = {
                recipientName,
                recipientPhone,
                street,
                area,
                city,
                state,
                pincode: Number(pincode),
                landmark,
                location,
                addressType: addressType || "Home",
                isDefault: isDefault || false,
                createdAt: new Date()
            };

            user.deliveryAddresses = user.deliveryAddresses || [];
            user.deliveryAddresses.push(newAddress as DeliveryAddress);
            await user.save();

            return handleResponse(req, res, 201, "Delivery address added successfully", {
                address: user.deliveryAddresses[user.deliveryAddresses.length - 1]
            });
        }
    );

    /**
     * Get all delivery addresses for a user
     */
    public static getDeliveryAddresses = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;

            const user = await UserModel.findById(userId).select("deliveryAddresses");
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            return handleResponse(req, res, 200, "Delivery addresses retrieved", {
                addresses: user.deliveryAddresses || []
            });
        }
    );

    /**
     * Update a delivery address
     */
    public static updateDeliveryAddress = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;
            const { addressId } = req.params;
            const updateData = req.body;

            const user = await UserModel.findById(userId);
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            const addressIndex = user.deliveryAddresses?.findIndex(
                (addr) => (addr as mongoose.Document & DeliveryAddress)._id?.toString() === addressId
            );

            if (addressIndex === -1 || addressIndex === undefined) {
                return next(new ApiError(404, "Address not found"));
            }

            // If setting as default, unset other defaults
            if (updateData.isDefault === true) {
                user.deliveryAddresses = user.deliveryAddresses?.map((addr, idx: number) => {
                    if (idx !== addressIndex) {
                        const addrObj = (addr as mongoose.Document & DeliveryAddress).toObject();
                        return { ...addrObj, isDefault: false };
                    }
                    return addr;
                }) || [];
            }

            // Update the address
            const currentAddress = user.deliveryAddresses![addressIndex] as mongoose.Document & DeliveryAddress;
            Object.assign(currentAddress, updateData);

            await user.save();

            return handleResponse(req, res, 200, "Delivery address updated successfully", {
                address: user.deliveryAddresses![addressIndex]
            });
        }
    );

    /**
     * Delete a delivery address
     */
    public static deleteDeliveryAddress = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;
            const { addressId } = req.params;

            const user = await UserModel.findById(userId);
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            const addressIndex = user.deliveryAddresses?.findIndex(
                (addr) => (addr as mongoose.Document & DeliveryAddress)._id?.toString() === addressId
            );

            if (addressIndex === -1 || addressIndex === undefined) {
                return next(new ApiError(404, "Address not found"));
            }

            user.deliveryAddresses?.splice(addressIndex, 1);
            await user.save();

            return handleResponse(req, res, 200, "Delivery address deleted successfully");
        }
    );

    /**
     * Set an address as default
     */
    public static setDefaultAddress = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;
            const { addressId } = req.params;

            const user = await UserModel.findById(userId);
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            const addressIndex = user.deliveryAddresses?.findIndex(
                (addr) => (addr as mongoose.Document & DeliveryAddress)._id?.toString() === addressId
            );

            if (addressIndex === -1 || addressIndex === undefined) {
                return next(new ApiError(404, "Address not found"));
            }

            // Unset all defaults and set new one
            user.deliveryAddresses = user.deliveryAddresses?.map((addr, idx: number) => {
                const addrObj = (addr as mongoose.Document & DeliveryAddress).toObject();
                return {
                    ...addrObj,
                    isDefault: idx === addressIndex
                };
            }) || [];

            await user.save();

            return handleResponse(req, res, 200, "Default address updated successfully", {
                address: user.deliveryAddresses![addressIndex]
            });
        }
    );
}