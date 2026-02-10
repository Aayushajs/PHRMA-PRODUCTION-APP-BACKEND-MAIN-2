/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Main Router - Aggregates all API routes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import ordersRouter from './orders.Routes.js';
import paymentsRouter from './payments.Routes.js';
import { notificationQueue } from '../Services/notificationQueue.Service.js';
import notificationRoutes from './notification.Routes.js';
import { catchAsyncErrors } from '../Utils/catchAsyncErrors.js';
import { handleResponse } from '../Utils/handleResponse.js';


const mainRouter = Router();

// Health check
mainRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Service2 API is running',
    timestamp: new Date().toISOString(),
  });
});

// Notification routes (wraps Service 1's notification service)
mainRouter.use('/notification-service', notificationRoutes);

// Root endpoint
mainRouter.get('/', (req, res) => {
  res.status(200).json({
    message: 'Service2 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v2/health',
      orders: '/api/v2/orders',
      payments: '/api/v2/payments',
      notifications: '/api/v2/notification-service',
      notificationHealth: '/api/v2/notification-service/health',
      queueStats: '/api/v2/queue-stats',
    },
  });
});

// Business logic routes
mainRouter.use('/orders', ordersRouter);
mainRouter.use('/payments', paymentsRouter);

// Queue management endpoint
mainRouter.get('/queue-stats', catchAsyncErrors(async (req, res, next) => {
  const stats = await notificationQueue.getStats();
  const failedNotifications = await notificationQueue.getFailedNotifications(10);
  
  return handleResponse(req, res, 200, 'Queue statistics retrieved successfully', {
    stats,
    recentFailures: failedNotifications,
  });
}));

export default mainRouter;
