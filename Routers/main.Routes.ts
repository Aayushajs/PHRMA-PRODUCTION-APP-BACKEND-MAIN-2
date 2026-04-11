/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Main Router - Aggregates all API routes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import ordersRouter from './Routers/orders.Routes';
import paymentsRouter from './Routers/payments.Routes';
import { notificationQueue } from '../Services/notificationQueue.Service';
import notificationRoutes from './Routers/notification.Routes';
import { catchAsyncErrors } from '../Utils/catchAsyncErrors';
import { handleResponse } from '../Utils/handleResponse';
import userRouter from "./Routers/user.Routes"
import medicineStoreRouter from "./Routers/medicineStore.Routes"
import adminStoreRouter from "./Routers/adminStore.Routes"
import locationRouter from "./Routers/location.Routes"
import itemsRouter from "./Routers/item.Routes"
import unitRouter from "./Routers/unit.Routes"
import gstRouter from "./Routers/gst.Routes"


const mainRouter = Router();

mainRouter.use('/user', userRouter);
mainRouter.use('/medicine-store', medicineStoreRouter);
mainRouter.use('/admin/stores', adminStoreRouter);
mainRouter.use('/location', locationRouter);
mainRouter.use('/items', itemsRouter);
mainRouter.use('/units', unitRouter);
mainRouter.use('/gst', gstRouter);

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
      user: '/api/v2/user',
      medicineStore: '/api/v2/medicine-store',
      adminStores: '/api/v2/admin/stores',
      location: '/api/v2/location',
      units: '/api/v2/units',
      gst: '/api/v2/gst',
      items: '/api/v2/items',
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
