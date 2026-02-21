/*
┌───────────────────────────────────────────────────────────────────────┐
│  Notification Service - Service 2                                      │
│  Business logic layer for notification operations                     │
│  Delegates to notificationClient for Service 1 communication          │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from 'express';
import { notificationClient } from '../Utils/notificationClient';
import { catchAsyncErrors } from '../Utils/catchAsyncErrors';
import { ApiError } from '../Utils/ApiError';
import { handleResponse } from '../Utils/handleResponse';

// ============================================================================
// TYPES
// ============================================================================

interface SendToUserParams {
  userId?: string;  // Optional - will come from req.user if not provided
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface SendToUsersParams {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface NotificationServiceResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  queued?: boolean;
  statusCode: number;
}

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

class NotificationService {
  /**
   * Check notification service health
   */
  async checkHealth(): Promise<NotificationServiceResult> {
    const result = await notificationClient.healthCheck();

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Notification service is healthy',
        data: result.data,
        statusCode: 200,
      };
    }

    throw new ApiError(503, 'Notification service unavailable');
  }

  /**
   * Send notification to a single user
   */
  async sendToUser(params: SendToUserParams): Promise<NotificationServiceResult> {
    // Validation
    if (!params.userId) {
      throw new ApiError(400, 'userId is required');
    }

    if (!params.title || !params.body) {
      throw new ApiError(400, 'title and body are required');
    }

    const result = await notificationClient.sendToUser({
      userId: params.userId,
      title: params.title,
      body: params.body,
      data: params.data,
    });

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Notification sent successfully',
        data: result.data,
        statusCode: 200,
      };
    }

    // Check if queued
    if (result.queued) {
      return {
        success: true,
        message: 'Notification queued (Service 1 unavailable)',
        queued: true,
        statusCode: 202,
      };
    }

    throw new ApiError(500, result.error || 'Failed to send notification');
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(params: SendToUsersParams): Promise<NotificationServiceResult> {
    // Validation
    if (!params.userIds || !Array.isArray(params.userIds)) {
      throw new ApiError(400, 'userIds must be an array');
    }

    if (params.userIds.length === 0) {
      throw new ApiError(400, 'userIds array cannot be empty');
    }

    if (!params.title || !params.body) {
      throw new ApiError(400, 'title and body are required');
    }

    const result = await notificationClient.sendToUsers({
      userIds: params.userIds,
      title: params.title,
      body: params.body,
      data: params.data,
    });

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Notifications sent successfully',
        data: result.data,
        statusCode: 200,
      };
    }

    if (result.queued) {
      return {
        success: true,
        message: 'Notifications queued (Service 1 unavailable)',
        queued: true,
        statusCode: 202,
      };
    }

    throw new ApiError(500, result.error || 'Failed to send notifications');
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotifications(params: SendToUsersParams): Promise<NotificationServiceResult> {
    // Validation
    if (!params.userIds || !Array.isArray(params.userIds)) {
      throw new ApiError(400, 'userIds must be an array');
    }

    if (params.userIds.length === 0) {
      throw new ApiError(400, 'userIds array cannot be empty');
    }

    if (!params.title || !params.body) {
      throw new ApiError(400, 'title and body are required');
    }

    const result = await notificationClient.sendBulkNotifications({
      userIds: params.userIds,
      title: params.title,
      body: params.body,
      data: params.data,
    });

    if (result.success) {
      return {
        success: true,
        message: result.message || 'Bulk notifications sent successfully',
        data: result.data,
        statusCode: 200,
      };
    }

    if (result.queued) {
      return {
        success: true,
        message: 'Bulk notifications queued (Service 1 unavailable)',
        queued: true,
        statusCode: 202,
      };
    }

    throw new ApiError(500, result.error || 'Failed to send bulk notifications');
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const notificationService = new NotificationService();
export default notificationService;

// ============================================================================
// CONTROLLER FUNCTIONS (HTTP Request/Response Handlers)
// ============================================================================

/**
 * Health check controller
 * GET /api/v2/notification/health
 */
export const checkHealth = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await notificationService.checkHealth();
    return handleResponse(
      req,
      res,
      result.statusCode,
      result.message || 'Health check successful',
      result.data
    );
  }
);

/**
 * Send notification to single user controller
 * POST /api/v2/notification/send-to-user
 * @auth Required - userId from req.user (authentication middleware)
 * @body { title, body, data }
 */
export const sendToUser = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Get userId from authenticated user (middleware)
    // console.log("REQUESTED-User : ",req.user);
    if (!req.user || !req.user._id) {
      throw new ApiError(401, 'Unauthorized: User authentication required');
    }

    const result = await notificationService.sendToUser({
      ...req.body,
      userId: req.user._id,  // Override with authenticated user's ID
    });

    console.log("Result from sendToUser 1: ", result);
    return handleResponse(
      req,
      res,
      result.statusCode,
      result.message || 'Notification sent successfully',
      result.data
    );
  }
);

/**
 * Send notifications to multiple users controller
 * POST /api/v2/notification/send-to-users
 * @body { userIds, title, body, data }
 */
export const sendToUsers = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await notificationService.sendToUsers(req.body);
    return handleResponse(
      req,
      res,
      result.statusCode,
      result.message || 'Notifications sent successfully',
      result.data
    );
  }
);

/**
 * Send bulk notifications controller
 * POST /api/v2/notification/send-bulk
 * @body { userIds, title, body, data }
 */
export const sendBulkNotifications = catchAsyncErrors(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const result = await notificationService.sendBulkNotifications(req.body);
    return handleResponse(
      req,
      res,
      result.statusCode,
      result.message || 'Bulk notifications sent successfully',
      result.data
    );
  }
);
