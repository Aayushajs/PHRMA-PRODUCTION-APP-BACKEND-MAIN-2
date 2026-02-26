/*
┌───────────────────────────────────────────────────────────────────────┐
│  Orders Router - Service 2                                            │
│  Example business logic with notification integration                 │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router, Request, Response, NextFunction } from 'express';
import { sendNotificationToUser } from '../../Utils/notificationClient';
import { catchAsyncErrors } from '../../Utils/catchAsyncErrors';
import { ApiError } from '../../Utils/ApiError';
import { handleResponse } from '../../Utils/handleResponse';

const ordersRouter = Router();

// ============================================================================
// ORDER ENDPOINTS WITH NOTIFICATIONS
// ============================================================================

/**
 * @route   POST /api/v2/orders
 * @desc    Create a new order and notify the user
 * @access  Private (add auth middleware in production)
 */
ordersRouter.post('/', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, items, totalAmount, deliveryAddress } = req.body;

  // Validation
  if (!userId || !items || !totalAmount) {
    throw new ApiError(400, 'Missing required fields: userId, items, totalAmount');
  }

    // TODO: Save order to database
    const orderId = `ORD${Date.now()}`;
    const order = {
      id: orderId,
      userId,
      items,
      totalAmount,
      deliveryAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('📦 Order created:', orderId);

    // Send notification to user (non-blocking)
    sendNotificationToUser(
      userId,
      '🎉 Order Confirmed!',
      `Your order #${orderId} has been placed successfully. Total: $${totalAmount}`,
      {
        orderId,
        type: 'order_confirmation',
        screen: 'OrderDetails',
        amount: totalAmount.toString(),
      }
    ).then(result => {
      if (result.success) {
        console.log('Order notification sent successfully');
      } else if (result.queued) {
        console.log(' Order notification queued for retry');
      } else {
        console.error(' Failed to send order notification:', result.error);
      }
    }).catch(err => {
      console.error('Notification error:', err);
    });

  return handleResponse(req, res, 201, 'Order created successfully', { order });
}));

/**
 * @route   PATCH /api/v2/orders/:orderId/status
 * @desc    Update order status and notify the user
 * @access  Private
 */
ordersRouter.patch('/:orderId/status', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const { status, userId } = req.body;

  if (!status || !userId) {
    throw new ApiError(400, 'Missing required fields: status, userId');
  }

    // TODO: Update order status in database
    console.log(`📦 Order ${orderId} status updated to: ${status}`);

    // Send appropriate notification based on status
    let notificationTitle = '';
    let notificationBody = '';

    switch (status) {
      case 'processing':
        notificationTitle = '⏳ Order Processing';
        notificationBody = `Your order #${orderId} is being processed`;
        break;
      case 'shipped':
        notificationTitle = '🚚 Order Shipped';
        notificationBody = `Your order #${orderId} has been shipped and is on its way!`;
        break;
      case 'delivered':
        notificationTitle = '✅ Order Delivered';
        notificationBody = `Your order #${orderId} has been delivered. Enjoy!`;
        break;
      case 'cancelled':
        notificationTitle = '❌ Order Cancelled';
        notificationBody = `Your order #${orderId} has been cancelled`;
        break;
      default:
        notificationTitle = '📦 Order Update';
        notificationBody = `Your order #${orderId} status: ${status}`;
    }

    // Send notification
    sendNotificationToUser(
      userId,
      notificationTitle,
      notificationBody,
      {
        orderId,
        status,
        type: 'order_status_update',
        screen: 'OrderDetails',
      }
    ).catch(err => console.error('❌ Status notification error:', err));

  return handleResponse(req, res, 200, 'Order status updated successfully', { orderId, status });
}));

/**
 * @route   POST /api/v2/orders/:orderId/cancel
 * @desc    Cancel order and notify the user
 * @access  Private
 */
ordersRouter.post('/:orderId/cancel', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const { userId, reason } = req.body;

  if (!userId) {
    throw new ApiError(400, 'Missing required field: userId');
  }

    // TODO: Cancel order in database
    console.log(`❌ Order ${orderId} cancelled. Reason: ${reason}`);

    // Send notification
    await sendNotificationToUser(
      userId,
      '❌ Order Cancelled',
      `Your order #${orderId} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`,
      {
        orderId,
        type: 'order_cancelled',
        reason: reason || 'User requested',
        screen: 'OrderDetails',
      }
    );

  return handleResponse(req, res, 200, 'Order cancelled successfully', { orderId, status: 'cancelled' });
}));

export default ordersRouter;
