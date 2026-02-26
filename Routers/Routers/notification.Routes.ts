/*
┌───────────────────────────────────────────────────────────────────────┐
│  Notification Routes - Service 2                                       │
│  Pure routing - just maps endpoints to controllers                    │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router } from 'express';
import {
  checkHealth,
  sendToUser,
  sendToUsers,
  sendBulkNotifications,
} from '../../Services/notification.Service';
import { authenticatedUserMiddleware } from '../../Middlewares/auth';

const notificationRouter = Router();

// ============================================================================
// NOTIFICATION ENDPOINTS
// ============================================================================

/**
 * @route   GET /api/v2/notification/health
 * @desc    Check if notification service (Service 1) is healthy
 * @access  Public
 */
notificationRouter.get('/health', checkHealth);

/**
 * @route   POST /api/v2/notification/send-to-user
 * @desc    Send notification to authenticated user (self)
 * @access  Private (requires authentication)
 * @body    { title, body, data }
 * @note    userId is automatically extracted from req.user (JWT token)
 */
notificationRouter.post('/send-to-user', authenticatedUserMiddleware, sendToUser);

/**
 * @route   POST /api/v2/notification/send-to-users
 * @desc    Send notification to multiple users by userIds
 * @access  Public (add authentication middleware as needed)
 * @body    { userIds, title, body, data }
 */
notificationRouter.post('/send-to-users', sendToUsers);

/**
 * @route   POST /api/v2/notification/send-bulk
 * @desc    Send bulk notifications to multiple users
 * @access  Public (add authentication middleware as needed)
 * @body    { userIds, title, body, data }
 */
notificationRouter.post('/send-bulk', sendBulkNotifications);

export default notificationRouter;
