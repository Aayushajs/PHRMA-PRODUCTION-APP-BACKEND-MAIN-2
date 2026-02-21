/*
┌───────────────────────────────────────────────────────────────────────┐
│  Notification Client with Queue-First Architecture - Service 2        │
│  Client utility to interact with Service 1's notification service     │
│  All Firebase notifications are handled centrally by Service 1        │
│                                                                        │
│  QUEUE-FIRST DESIGN (when ENABLE_NOTIFICATION_QUEUE=true):            │
│  • All notifications routed through Redis queue immediately           │
│  • Provides full crash recovery protection (Service 1 or 2 crash)     │
│  • Queue processor handles retry logic automatically                  │
│  • Falls back to direct HTTP calls when queue is disabled             │
└───────────────────────────────────────────────────────────────────────┘
*/

import axios, { AxiosInstance, AxiosError } from 'axios';
import { notificationQueue } from '../Services/notificationQueue.Service.js';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

interface SendNotificationParams extends NotificationPayload {
  fcmToken: string;
}

interface SendBulkNotificationParams extends NotificationPayload {
  userIds: string[];
}

interface SendToUserParams extends NotificationPayload {
  userId: string;
}

interface SendToUsersParams extends NotificationPayload {
  userIds: string[];
}

interface NotificationResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  statusCode?: number;
  queued?: boolean; // Indicates if notification was queued for retry
}

// ============================================================================
// NOTIFICATION CLIENT CLASS
// ============================================================================

class NotificationClient {
  private client: AxiosInstance;
  private readonly SERVICE_1_URL: string;
  private readonly API_KEY: string;
  private readonly ENABLE_QUEUE: boolean;

  constructor() {
    // Validate configuration
    this.SERVICE_1_URL = process.env.SERVICE_1_URL || 'http://localhost:5000';
    this.API_KEY = process.env.INTERNAL_SERVICE_API_KEY || '';
    this.ENABLE_QUEUE = process.env.ENABLE_NOTIFICATION_QUEUE !== 'false'; // Default: enabled

    if (!this.API_KEY) {
      console.error('❌ INTERNAL_SERVICE_API_KEY not configured in environment');
      console.error('   Notification service will not work properly');
    }

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: `${this.SERVICE_1_URL}/api/v1/notification-service`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': this.API_KEY,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`📤 Notification request to Service 1: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Notification request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ Notification response from Service 1: ${response.status}`);
        return response;
      },
      (error: AxiosError) => {
        if (error.response) {
          console.error(`❌ Service 1 notification error: ${error.response.status}`, error.response.data);
        } else if (error.request) {
          console.error('❌ No response from Service 1 notification service');
        } else {
          console.error('❌ Notification request setup error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send a single push notification via FCM token
   * QUEUE-FIRST APPROACH: Routes through Redis queue when enabled for crash recovery
   */
  async sendNotification(params: SendNotificationParams): Promise<NotificationResponse> {
    const { fcmToken, title, body, data } = params;

    // QUEUE-FIRST: If queue is enabled, add to queue immediately
    if (this.ENABLE_QUEUE) {
      try {
        await this.queueNotification('single', params);
        console.log(`📥 Notification to FCM token queued for processing (queue-first mode)`);
        return {
          success: true,
          message: 'Notification queued successfully',
          queued: true,
          statusCode: 202,
        };
      } catch (error: any) {
        console.error('❌ Failed to queue notification:', error);
        return {
          success: false,
          message: 'Failed to queue notification',
          error: error.message,
          statusCode: 500,
        };
      }
    }

    // FALLBACK: Direct HTTP call when queue is disabled
    try {
      const response = await this.client.post('/send', {
        fcmToken,
        title,
        body,
        data,
      });

      return {
        success: response.data.success ?? true,
        message: response.data.message,
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Send bulk notifications to multiple users by userIds
   * Service 1 will fetch users' FCM tokens from database
   * QUEUE-FIRST APPROACH: Routes through Redis queue when enabled for crash recovery
   */
  async sendBulkNotifications(params: SendBulkNotificationParams): Promise<NotificationResponse> {
    const { userIds, title, body, data } = params;

    // QUEUE-FIRST: If queue is enabled, add to queue immediately
    if (this.ENABLE_QUEUE) {
      try {
        await this.queueNotification('bulk', params);
        console.log('📥 Bulk notification queued for processing (queue-first mode)');
        return {
          success: true,
          message: `Bulk notification queued successfully for ${userIds.length} users`,
          queued: true,
        };
      } catch (error: any) {
        console.error('❌ Failed to queue bulk notification:', error);
        return {
          success: false,
          error: 'Failed to queue notification',
        };
      }
    }

    // FALLBACK: Direct HTTP call when queue is disabled
    try {
      const response = await this.client.post('/send-bulk', {
        userIds,
        title,
        body,
        data,
      });

      return {
        success: response.data.success ?? true,
        message: response.data.message,
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Send notification to a specific user by userId
   * Service 1 will fetch the user's FCM token from database
   * QUEUE-FIRST APPROACH: Routes through Redis queue when enabled for crash recovery
   */
  async sendToUser(params: SendToUserParams): Promise<NotificationResponse> {
    const { userId, title, body, data } = params;

    // QUEUE-FIRST: If queue is enabled, add to queue immediately
    if (this.ENABLE_QUEUE) {
      try {
        await this.queueNotification('user', params);
        console.log(`📥 Notification to user ${userId} queued for processing (queue-first mode)`);
        return {
          success: true,
          message: 'Notification queued successfully',
          queued: true,
          statusCode: 202,
        };
      } catch (error: any) {
        console.error('❌ Failed to queue notification:', error);
        return {
          success: false,
          message: 'Failed to queue notification',
          error: error.message,
          statusCode: 500,
        };
      }
    }

    // FALLBACK: Direct HTTP call when queue is disabled
    try {
      const response = await this.client.post('/send-to-user', {
        userId,
        title,
        body,
        data,
      });

      return {
        success: response.data.success ?? true,
        message: response.data.message,
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Send notifications to multiple users by userIds
   * Service 1 will fetch users' FCM tokens from database
   * QUEUE-FIRST APPROACH: Routes through Redis queue when enabled for crash recovery
   */
  async sendToUsers(params: SendToUsersParams): Promise<NotificationResponse> {
    const { userIds, title, body, data } = params;

    // QUEUE-FIRST: If queue is enabled, add to queue immediately
    if (this.ENABLE_QUEUE) {
      try {
        await this.queueNotification('users', params);
        console.log(`📥 Notification to ${userIds.length} users queued for processing (queue-first mode)`);
        return {
          success: true,
          message: `Notification queued successfully for ${userIds.length} users`,
          queued: true,
          statusCode: 202,
        };
      } catch (error: any) {
        console.error('❌ Failed to queue notification:', error);
        return {
          success: false,
          message: 'Failed to queue notification',
          error: error.message,
          statusCode: 500,
        };
      }
    }

    // FALLBACK: Direct HTTP call when queue is disabled
    try {
      const response = await this.client.post('/send-to-users', {
        userIds,
        title,
        body,
        data,
      });

      return {
        success: response.data.success ?? true,
        message: response.data.message,
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Check health status of notification service
   */
  async healthCheck(): Promise<NotificationResponse> {
    try {
      const response = await this.client.get('/health');

      return {
        success: response.data.success ?? true,
        message: response.data.message,
        data: response.data.data,
        statusCode: response.status,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Queue notification for retry
   * Used by queue-first architecture to persist all notifications
   */
  private async queueNotification(
    type: 'single' | 'bulk' | 'user' | 'users',
    params: any
  ): Promise<void> {
    try {
      await notificationQueue.enqueue({
        type,
        title: params.title,
        body: params.body,
        data: params.data,
        fcmToken: params.fcmToken,
        userIds: params.userIds, // Used for bulk, users types
        userId: params.userId,   // Used for user type
        maxAttempts: 3,
      });
      console.log('📥 Notification queued for retry');
    } catch (error) {
      console.error('❌ Failed to queue notification:', error);
    }
  }

  /**
   * Centralized error handler
   */
  private handleError(error: any): NotificationResponse {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        message: error.response.data?.message || 'Notification service error',
        error: error.response.data?.error || error.message,
        data: error.response.data?.data,
        statusCode: error.response.status,
      };
    } else if (error.request) {
      // No response received
      return {
        success: false,
        message: 'Cannot reach notification service',
        error: 'Service 1 (notification-service) is not responding',
        statusCode: 503,
      };
    } else {
      // Request setup error
      return {
        success: false,
        message: 'Failed to send notification',
        error: error.message || 'Failed to send notification request',
        statusCode: 500,
      };
    }
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const notificationClient = new NotificationClient();

// ============================================================================
// CONVENIENCE FUNCTIONS (Optional - for backward compatibility)
// ============================================================================

/**
 * Send a single push notification
 * @param fcmToken - FCM token
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data payload
 */
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationResponse> => {
  return notificationClient.sendNotification({ fcmToken, title, body, data });
};

/**
 * Send notification to a user by userId
 * @param userId - User ID
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data payload
 */
export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationResponse> => {
  return notificationClient.sendToUser({ userId, title, body, data });
};

/**
 * Send notifications to multiple users
 * @param userIds - Array of user IDs
 * @param title - Notification title
 * @param body - Notification body
 * @param data - Additional data payload
 */
export const sendNotificationToUsers = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<NotificationResponse> => {
  return notificationClient.sendToUsers({ userIds, title, body, data });
};
