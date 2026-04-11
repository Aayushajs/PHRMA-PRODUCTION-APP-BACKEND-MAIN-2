/*
┌───────────────────────────────────────────────────────────────────────┐
│  Orders Router - Service 2                                            │
│  Example business logic with notification integration                 │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router, Request, Response, NextFunction } from 'express';
import OrderService from '../../Services/order.Service';

const ordersRouter = Router();

// ============================================================================
// ORDER ENDPOINTS - ALL LOGIC DELEGATED TO ORDER SERVICE
// ============================================================================

/**
 * @route   GET /api/v2/orders/analytics/dashboard
 * @desc    Get order analytics and statistics for dashboard (Admin only)
 * @access  Private (Admin)
 */
ordersRouter.get('/analytics/dashboard', OrderService.getOrderAnalytics);

/**
 * @route   GET /api/v2/orders/:orderId
 * @desc    Retrieve complete order details with authorization check
 * @access  Private
 */
ordersRouter.get('/:orderId', OrderService.getOrderDetails);

/**
 * @route   PATCH /api/v2/orders/:orderId/status
 * @desc    Update order status with validation and user notification
 * @access  Private (Admin/Store)
 */
ordersRouter.patch('/:orderId/status', OrderService.updateOrderStatus);

/**
 * @route   POST /api/v2/orders/:orderId/cancel
 * @desc    Cancel order, restore items, process refund, and notify user
 * @access  Private (Customer/Admin)
 */
ordersRouter.post('/:orderId/cancel', OrderService.cancelOrder);

/**
 * @route   POST /api/v2/orders
 * @desc    Create a new order with full validation, item tracking, and notifications
 * @access  Private
 */
ordersRouter.post('/', OrderService.createOrder);

/**
 * @route   GET /api/v2/orders
 * @desc    Retrieve paginated user orders with filtering and sorting
 * @access  Private
 */
ordersRouter.get('/', OrderService.getUserOrders);

export default ordersRouter;
