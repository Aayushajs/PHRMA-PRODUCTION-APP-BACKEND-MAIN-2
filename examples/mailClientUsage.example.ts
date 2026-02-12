/*
┌───────────────────────────────────────────────────────────────────────┐
│  Example: Forgot Password Implementation (Service 2)                  │
│  Demonstrates how to use mailClient for password reset flow           │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from 'express';
import { mailClient } from '../Utils/mailClient';
// import catchAsyncErrors from '../Utils/catchAsyncErrors';
// import ApiError from '../Utils/ApiError';
// import handleResponse from '../Utils/handleResponse';
// import redis from '../config/redis'; // Your Redis instance
// import UserModel from '../models/User'; // Your User model

/**
 * EXAMPLE 1: Forgot Password - Send OTP
 * 
 * Route: POST /api/auth/forgot-password
 * Body: { email: string }
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if user exists (replace with your User model)
    // const user = await UserModel.findOne({ email });
    // if (!user) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'User not found'
    //   });
    // }

    // For demo purposes, using mock user
    const user = { _id: 'user123', email: email, name: 'John Doe' };

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis (expires in 3 minutes = 180 seconds)
    // await redis.set(`otp:${user._id}`, otp, { EX: 180 });

    // Send OTP via mail service
    const mailResult = await mailClient.sendOTP(email, otp);

    if (!mailResult.success) {
      // Clean up OTP if email failed
      // await redis.del(`otp:${user._id}`);
      
      return res.status(500).json({
        success: false,
        message: mailResult.error || 'Failed to send OTP'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully. Please check your email.',
      data: {
        provider: mailResult.data?.provider,
        expiresIn: '3 minutes'
      }
    });
  } catch (error: any) {
    console.error('Forgot Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * EXAMPLE 2: Verify OTP
 * 
 * Route: POST /api/auth/verify-otp
 * Body: { email: string, otp: string }
 */
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Find user
    // const user = await UserModel.findOne({ email });
    // if (!user) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'User not found'
    //   });
    // }

    const user = { _id: 'user123', email: email, name: 'John Doe' };

    // Get OTP from Redis
    // const storedOtp = await redis.get(`otp:${user._id}`);
    
    // For demo
    const storedOtp = otp; // In real implementation, get from Redis

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired or not found'
      });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Delete OTP from Redis
    // await redis.del(`otp:${user._id}`);

    // Set reset token verification (expires in 10 minutes)
    // await redis.set(`reset_verified:${user._id}`, '1', { EX: 600 });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
      data: {
        resetToken: true
      }
    });
  } catch (error: any) {
    console.error('Verify OTP Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * EXAMPLE 3: Reset Password
 * 
 * Route: POST /api/auth/reset-password
 * Body: { email: string, newPassword: string }
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Find user
    // const user = await UserModel.findOne({ email }).select('+password');
    // if (!user) {
    //   return res.status(404).json({
    //     success: false,
    //     message: 'User not found'
    //   });
    // }

    const user = {
      _id: 'user123',
      email: email,
      name: 'John Doe',
      password: 'oldHashedPassword'
    };

    // Check if reset was verified
    // const resetVerified = await redis.get(`reset_verified:${user._id}`);
    // if (!resetVerified) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Unauthorized. Please verify OTP first.'
    //   });
    // }

    // Update password (with bcrypt in real implementation)
    // const hashedPassword = await bcrypt.hash(newPassword, 10);
    // user.password = hashedPassword;
    // await user.save();

    // Clean up Redis keys
    // await redis.del(`reset_verified:${user._id}`);
    // await redis.del(`otp:${user._id}`);

    // Send confirmation email
    const mailResult = await mailClient.sendPasswordResetConfirmation(
      email,
      user.name
    );

    if (!mailResult.success) {
      console.error('Failed to send confirmation email:', mailResult.error);
      // Don't fail the password reset if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * EXAMPLE 4: User Registration with Welcome Email
 * 
 * Route: POST /api/auth/register
 * Body: { name: string, email: string, password: string }
 */
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Create user in database
    // const hashedPassword = await bcrypt.hash(password, 10);
    // const user = await UserModel.create({
    //   name,
    //   email,
    //   password: hashedPassword
    // });

    const user = { _id: 'newuser123', name, email };

    // Send welcome email (non-blocking - don't wait for it)
    mailClient.sendWelcomeEmail(email, name).catch((error) => {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error('Register User Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * EXAMPLE 5: Send Notification to Multiple Users
 * 
 * Route: POST /api/admin/notify-users
 * Body: { userEmails: string[], subject: string, message: string }
 */
export const notifyUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userEmails, subject, message } = req.body;

    if (!userEmails || !Array.isArray(userEmails) || userEmails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User emails array is required'
      });
    }

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    // Send bulk notification emails
    const mailResult = await mailClient.sendBulkEmail({
      recipients: userEmails,
      type: 'notification',
      data: { subject, message }
    });

    if (!mailResult.success) {
      return res.status(500).json({
        success: false,
        message: mailResult.error || 'Failed to send notifications'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Notifications sent to ${mailResult.data?.success} users`,
      data: {
        total: mailResult.data?.total,
        success: mailResult.data?.success,
        failed: mailResult.data?.failed
      }
    });
  } catch (error: any) {
    console.error('Notify Users Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * EXAMPLE 6: Check Mail Service Health
 * 
 * Route: GET /api/admin/mail-health
 */
export const checkMailHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const health = await mailClient.healthCheck();

    return res.status(health.healthy ? 200 : 503).json({
      success: health.healthy,
      message: health.healthy
        ? 'Mail service is operational'
        : 'Mail service is unavailable',
      data: {
        healthy: health.healthy,
        availableProviders: health.availableProviders,
        providerCount: health.providerCount
      }
    });
  } catch (error: any) {
    console.error('Mail Health Check Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check mail service health'
    });
  }
};

// Export all example handlers
export default {
  forgotPassword,
  verifyOTP,
  resetPassword,
  registerUser,
  notifyUsers,
  checkMailHealth
};
