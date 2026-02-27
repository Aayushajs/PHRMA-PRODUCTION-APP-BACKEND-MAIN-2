/*
┌───────────────────────────────────────────────────────────────────────┐
│  Orders Router - Production-Grade Order Management                    │
│  Routes for order creation, tracking, and management                  │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Router } from 'express';
import OrderService from '../../Services/order.Service';

const ordersRouter = Router();

// ============================================================================
// ORDER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/v1/orders
 * @desc    Create a new order with complete validation and payment processing
 * @access  Private
 */
ordersRouter.post('/', OrderService.createOrder);

/**
 * @route   PATCH /api/v1/orders/:orderId/payment
 * @desc    Update payment status (called by payment gateway webhook)
 * @access  Private (webhook auth required)
 */
ordersRouter.patch('/:orderId/payment', OrderService.updatePaymentStatus);

/**
 * @route   PATCH /api/v1/orders/:orderId/status
 * @desc    Update order status (store/admin)
 * @access  Private (store/admin only)
 */
ordersRouter.patch('/:orderId/status', OrderService.updateOrderStatus);

/**
 * @route   POST /api/v1/orders/:orderId/cancel
 * @desc    Cancel an order
 * @access  Private
 */
ordersRouter.post('/:orderId/cancel', OrderService.cancelOrder);

/**
 * @route   GET /api/v1/orders/:orderId
 * @desc    Get order details by order ID
 * @access  Private
 */
ordersRouter.get('/:orderId', OrderService.getOrderById);

/**
 * @route   GET /api/v1/orders/user/:userId
 * @desc    Get all orders for a user
 * @access  Private
 */
ordersRouter.get('/user/:userId', OrderService.getUserOrders);

/**
 * @route   GET /api/v1/orders/store/:medicineStoreId
 * @desc    Get all orders for a store
 * @access  Private (store/admin only)
 */
ordersRouter.get('/store/:medicineStoreId', OrderService.getStoreOrders);

export default ordersRouter;
