/*
┌───────────────────────────────────────────────────────────────────────┐
│  Payments Router - Service 2                                          │
│  Example payment processing with notification integration             │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router, Request, Response, NextFunction } from 'express';
import { sendNotificationToUser } from '../../Utils/notificationClient';
import { catchAsyncErrors } from '../../Utils/catchAsyncErrors';
import { ApiError } from '../../Utils/ApiError';
import { handleResponse } from '../../Utils/handleResponse';

const paymentsRouter = Router();

// ============================================================================
// PAYMENT ENDPOINTS WITH NOTIFICATIONS
// ============================================================================

/**
 * @route   POST /api/v2/payments
 * @desc    Process payment and notify the user
 * @access  Private
 */
paymentsRouter.post('/', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, orderId, amount, paymentMethod } = req.body;

  // Validation
  if (!userId || !orderId || !amount || !paymentMethod) {
    throw new ApiError(400, 'Missing required fields: userId, orderId, amount, paymentMethod');
  }

    // Simulate payment processing
    const paymentId = `PAY${Date.now()}`;
    const payment = {
      id: paymentId,
      userId,
      orderId,
      amount,
      paymentMethod,
      status: 'success',
      timestamp: new Date().toISOString(),
    };

    console.log('💳 Payment processed:', paymentId);

    // Send notification to user
    await sendNotificationToUser(
      userId,
      'Payment Successful',
      `Your payment of $${amount} has been processed successfully for order #${orderId}`,
      {
        paymentId,
        orderId,
        amount: amount.toString(),
        type: 'payment_success',
        screen: 'PaymentDetails',
      }
    );

  return handleResponse(req, res, 200, 'Payment processed successfully', { payment });
}));

/**
 * @route   POST /api/v2/payments/:paymentId/refund
 * @desc    Process refund and notify the user
 * @access  Private
 */
paymentsRouter.post('/:paymentId/refund', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { paymentId } = req.params;
  const { userId, amount, reason } = req.body;

  if (!userId || !amount) {
    throw new ApiError(400, 'Missing required fields: userId, amount');
  }

    // Simulate refund processing
    console.log(`💰 Refund processed for payment ${paymentId}: $${amount}`);

    // Send notification
    await sendNotificationToUser(
      userId,
      '💰 Refund Processed',
      `Your refund of $${amount} has been initiated. It will reflect in your account within 5-7 business days.`,
      {
        paymentId,
        amount: amount.toString(),
        reason: reason || 'Order cancellation',
        type: 'refund_processed',
        screen: 'PaymentDetails',
      }
    );

  return handleResponse(req, res, 200, 'Refund processed successfully', { paymentId, refundAmount: amount });
}));

/**
 * @route   POST /api/v2/payments/failed
 * @desc    Handle failed payment and notify the user
 * @access  Private
 */
paymentsRouter.post('/failed', catchAsyncErrors(async (req: Request, res: Response, next: NextFunction) => {
  const { userId, orderId, amount, reason } = req.body;

  if (!userId || !orderId) {
    throw new ApiError(400, 'Missing required fields: userId, orderId');
  }

    console.log(`❌ Payment failed for order ${orderId}`);

    // Send notification
    await sendNotificationToUser(
      userId,
      '❌ Payment Failed',
      `Your payment of $${amount} for order #${orderId} could not be processed. ${reason || 'Please try again.'}`,
      {
        orderId,
        amount: amount.toString(),
        reason: reason || 'Payment declined',
        type: 'payment_failed',
        screen: 'Checkout',
      }
    );

  return handleResponse(req, res, 200, 'Payment failure notification sent');
}));

export default paymentsRouter;
