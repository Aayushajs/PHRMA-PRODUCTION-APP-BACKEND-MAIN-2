/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Utilities - Helper methods and utilities for orders.           │
│  Provides summary generation and query helpers.                       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { IOrder, OrderStatus } from "../Databases/Entities/order.Interface";
import OrderModel from "../Databases/Models/order.model";

/**
 * Get order summary with key details
 */
export const getOrderSummary = (order: IOrder) => {
  return {
    orderId: order.orderId,
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
  };
};

/**
 * Get all orders by specific status
 */
export const getOrdersByStatus = async (status: OrderStatus) => {
  return OrderModel.find({ orderStatus: status, isDeleted: false })
    .populate("userId", "userName email phone")
    .populate("medicineStoreId", "storeName")
    .sort({ createdAt: -1 });
};

/**
 * Get all orders by user
 */
export const getOrdersByUser = async (userId: string) => {
  return OrderModel.find({ userId, isDeleted: false })
    .populate("medicineStoreId", "storeName")
    .sort({ createdAt: -1 });
};

/**
 * Get all orders by store
 */
export const getOrdersByStore = async (medicineStoreId: string) => {
  return OrderModel.find({ medicineStoreId, isDeleted: false })
    .populate("userId", "userName email phone")
    .sort({ createdAt: -1 });
};

/**
 * Calculate order statistics for a store
 */
export const getStoreOrderStats = async (medicineStoreId: string) => {
  const totalOrders = await OrderModel.countDocuments({
    medicineStoreId,
    isDeleted: false,
  });

  const totalRevenue = await OrderModel.aggregate([
    {
      $match: {
        medicineStoreId: require("mongoose").Types.ObjectId(medicineStoreId),
        isDeleted: false,
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  const avgOrderValue =
    totalOrders > 0 ? (totalRevenue[0]?.total || 0) / totalOrders : 0;

  return {
    totalOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
  };
};

/**
 * Get orders by date range
 */
export const getOrdersByDateRange = async (
  startDate: Date,
  endDate: Date
) => {
  return OrderModel.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Get pending orders (not yet confirmed)
 */
export const getPendingOrders = async (limit: number = 10) => {
  return OrderModel.find({
    orderStatus: OrderStatus.PENDING,
    isDeleted: false,
  })
    .limit(limit)
    .sort({ createdAt: -1 });
};

/**
 * Get orders awaiting payment
 */
export const getOrdersAwaitingPayment = async () => {
  return OrderModel.find({
    paymentStatus: "pending",
    isDeleted: false,
  })
    .populate("userId", "userName email")
    .sort({ createdAt: -1 });
};

/**
 * Get orders requiring return approval
 */
export const getOrdersRequiringReturnApproval = async () => {
  return OrderModel.find({
    orderStatus: OrderStatus.RETURNED,
    returnApprovedDate: { $exists: false },
    isDeleted: false,
  })
    .populate("userId", "userName email phone")
    .sort({ createdAt: -1 });
};

/**
 * Get unrated delivered orders
 */
export const getUnratedOrders = async (userId: string) => {
  return OrderModel.find({
    userId,
    orderStatus: OrderStatus.DELIVERED,
    isRated: false,
    isDeleted: false,
  }).sort({ actualDeliveryDate: -1 });
};

/**
 * Format order for API response
 */
export const formatOrderResponse = (order: IOrder) => {
  return {
    _id: order._id,
    orderId: order.orderId,
    userId: order.userId,
    medicineStoreId: order.medicineStoreId,
    orderItems: order.orderItems,
    totalAmount: order.totalAmount,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    deliveryAddress: order.deliveryAddress,
    orderDate: order.orderDate,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    actualDeliveryDate: order.actualDeliveryDate,
    trackingNumber: order.trackingNumber,
    rating: order.rating,
    review: order.review,
  };
};
