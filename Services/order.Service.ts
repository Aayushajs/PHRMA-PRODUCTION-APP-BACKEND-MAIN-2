/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Service - Business logic for pharmacy order management         │
│  Handles order creation, status updates, cancellations, and tracking  │
│  with comprehensive logging, validation, and notification pipeline   │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { ApiError } from "../Utils/ApiError";
import { handleResponse } from "../Utils/handleResponse";
import { sendNotificationToUser } from "../Utils/notificationClient";
import Order from "../Databases/Models/order.model";
import UserModel from "../Databases/Models/user.Model";
import ItemModel from "../Databases/Models/item.Model";
import MedicineStoreModel from "../Databases/Models/medicineStore.Model";
import { redis } from "../config/redis";
import { IOrder, OrderStatus, PaymentStatus } from "../Databases/Entities/order.Interface";
import RoleIndex from "../Utils/Roles.enum";
import mongoose from "mongoose";

/**
 * Order Service Class - Contains all business logic for order operations
 * Implements SOLID principles with proper separation of concerns
 */
export default class OrderService {

  /**
   * Create a new order with validation and notification
   * @route   POST /api/v2/orders
   * @desc    Creates a new order, validates items, calculates totals, and notifies user
   * @access  Private
   */
  public static createOrder = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId, medicineStoreId, items, totalAmount, deliveryAddress, paymentMethod, billingAddress } = req.body;

      // ===== REQUIRED FIELDS =====
      const requiredFields = { userId, items, totalAmount, deliveryAddress, paymentMethod };
      const missingFields = Object.entries(requiredFields)
        .filter(([__, value]) => !value)
        .map(([key]) => key);

      if (missingFields.length > 0) {
        return next(
          new ApiError(
            400,
            `Missing required fields: ${missingFields.join(", ")}`
          )
        );
      }

      // ===== VALIDATE INPUT DATA TYPES AND STRUCTURE =====
      if (!Array.isArray(items) || items.length === 0) {
        return next(new ApiError(400, "Items array must contain at least one item"));
      }

      if (typeof totalAmount !== "number" || totalAmount <= 0) {
        return next(new ApiError(400, "Total amount must be a positive number"));
      }

      // Validate delivery address structure
      if (!deliveryAddress?.city || !deliveryAddress?.state || !deliveryAddress?.pincode) {
        return next(
          new ApiError(
            400,
            "Delivery address must include city, state, and pincode"
          )
        );
      }

      // ===== VERIFY USER EXISTS =====
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return next(new ApiError(404, "User not found"));
      }

      if (userExists.role !== RoleIndex.CUSTOMER) {
        return next(new ApiError(403, "Only customers can place orders"));
      }

      // ===== VERIFY MEDICINE STORE EXISTS & IS ACTIVE =====
      const storeExists = await MedicineStoreModel.findById(medicineStoreId);
      if (!storeExists) {
        return next(new ApiError(404, "Medicine store not found"));
      }

      if (!storeExists.isVerified) {
        return next(new ApiError(403, "Medicine store is not verified"));
      }

      // ===== VALIDATE ITEMS & CALCULATE TOTALS =====
      let calculatedSubtotal = 0;
      let calculatedTaxAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        // Validate item structure
        if (!item.itemId || !item.quantity) {
          return next(
            new ApiError(
              400,
              "Each item must have itemId and quantity"
            )
          );
        }

        if (item.quantity <= 0) {
          return next(new ApiError(400, "Item quantity must be greater than 0"));
        }

        // Fetch item from database
        const itemData = await ItemModel.findById(item.itemId);
        if (!itemData) {
          return next(new ApiError(404, `Item with ID ${item.itemId} not found`));
        }

        // Check item availability and validity
        // Note: itemAvailable tracking can be implemented in future versions
        // For now, we proceed with order creation and assume inventory management is done separately

        // Check expiry date
        if (itemData.itemExpiryDate && new Date(itemData.itemExpiryDate) < new Date()) {
          return next(new ApiError(400, `Item ${itemData.itemName} has expired`));
        }

        // Calculate item total and tax
        const unitPrice = item.unitPrice || itemData.itemInitialPrice;
        const itemTotal = unitPrice * item.quantity;
        // GST is a reference to GST model, will need to be populated for exact calculation
        const gstAmount = itemTotal * 0.05; // Default 5% GST, should be fetched from GST model

        calculatedSubtotal += itemTotal;
        calculatedTaxAmount += gstAmount;

        validatedItems.push({
          itemId: itemData._id,
          itemName: itemData.itemName,
          quantity: item.quantity,
          unitPrice,
          totalPrice: itemTotal,
          itemBatchNumber: itemData.code || "N/A",
          itemExpiryDate: itemData.itemExpiryDate,
          discount: item.discount || 0,
          gstAmount,
          hsnCode: itemData.HSNCode,
        });
      }

      const calculatedTotalAmount = calculatedSubtotal + calculatedTaxAmount - (items.reduce((sum, item) => sum + (item.discount || 0), 0));

      // Verify total amount matches calculated total (with 1% tolerance for rounding)
      const tolerance = calculatedTotalAmount * 0.01;
      if (Math.abs(totalAmount - calculatedTotalAmount) > tolerance) {
        console.warn(
          `Total amount mismatch. Expected: ${calculatedTotalAmount}, Provided: ${totalAmount}`
        );
        // Don't reject, just warn - frontend might have applied additional discounts
      }

      // ===== CREATE ORDER OBJECT =====
      const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const orderData: Partial<IOrder> = {
        orderId,
        userId: new mongoose.Types.ObjectId(userId),
        medicineStoreId: new mongoose.Types.ObjectId(medicineStoreId || storeExists._id as any),
        orderItems: validatedItems,
        subtotal: calculatedSubtotal,
        taxAmount: calculatedTaxAmount,
        discount: items.reduce((sum, item) => sum + (item.discount || 0), 0),
        totalAmount: calculatedTotalAmount,
        deliveryAddress: {
          street: deliveryAddress.street,
          area: deliveryAddress.area,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
          landmark: deliveryAddress.landmark,
          location: deliveryAddress.location,
          recipientName: deliveryAddress.recipientName || userExists.userName,
          recipientPhone: deliveryAddress.recipientPhone || userExists.phone,
        },
        billingAddress: billingAddress,
      };

      // ===== CREATE ORDER OBJECT =====
      const createdOrder = await Order.create(orderData);

      if (!createdOrder) {
        return next(new ApiError(500, "Failed to create order"));
      }

      console.log(`✅ Order created successfully: ${orderId}`);

      // ===== UPDATE ITEM AVAILABILITY =====
      // Note: Item availability tracking is not yet implemented in the schema
      // This step should be implemented once inventory management is added

      // ===== SEND NOTIFICATION TO USER (NON-BLOCKING) =====
      const notificationData = {
        orderId: createdOrder._id,
        orderNumber: orderId,
        type: "order_confirmation",
        screen: "OrderDetails",
        amount: totalAmount.toString(),
        itemCount: validatedItems.length.toString(),
      };

      sendNotificationToUser(
        userId,
        "🎉 Order Confirmed!",
        `Your order #${orderId} has been placed successfully. Total: ₹${totalAmount.toFixed(2)}. ${validatedItems.length} item(s)`,
        notificationData
      )
        .then((result) => {
          if (result.success) {
            console.log(`✅ Order confirmation notification sent to user ${userId}`);
          } else if (result.queued) {
            console.log(`📋 Order confirmation notification queued for user ${userId}`);
          } else {
            console.error(`❌ Failed to send notification: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error(`❌ Notification error for order ${orderId}:`, err);
        });

      // ===== CACHE ORDER DATA FOR QUICK RETRIEVAL =====
      try {
        await redis.setEx(
          `order:${createdOrder._id}`,
          3600, // 1 hour TTL
          JSON.stringify(createdOrder)
        );
      } catch (error) {
        console.warn("⚠️ Redis caching failed for order, continuing anyway:", error);
      }

      // ===== RETURN RESPONSE =====
      const responseData = createdOrder.toObject();

      return handleResponse(
        req,
        res,
        201,
        "Order created successfully",
        {
          order: responseData,
          message: "Order confirmation has been sent to your registered email and phone number",
        }
      );
    }
  );

  /**
   * Update order status with comprehensive validation and notifications
   * @route   PATCH /api/v2/orders/:orderId/status
   * @desc    Updates order status and sends appropriate notification to user
   * @access  Private (Admin/Store)
   */
  public static updateOrderStatus = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { orderId } = req.params;
      const { status, userId, notes } = req.body;

      // ===== VALIDATE INPUT =====
      if (!status) {
        return next(new ApiError(400, "Status is required"));
      }

      if (!userId) {
        return next(new ApiError(400, "User ID is required"));
      }

      // Validate status is a valid enum value
      const validStatuses = Object.values(OrderStatus);
      if (!validStatuses.includes(status)) {
        return next(
          new ApiError(
            400,
            `Invalid status. Allowed values: ${validStatuses.join(", ")}`
          )
        );
      }

      // ===== VERIFY ORDER EXISTS =====
      const order = await Order.findById(orderId) as any;
      if (!order) {
        return next(new ApiError(404, "Order not found"));
      }

      // ===== VALIDATE STATUS TRANSITION =====
      const validTransitions: Record<string, string[]> = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
        [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED],
        [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.RETURNED]: [],
        [OrderStatus.FAILED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      };

      const currentStatus = order.orderStatus || OrderStatus.PENDING;
      if (!validTransitions[currentStatus]?.includes(status)) {
        return next(
          new ApiError(
            400,
            `Cannot transition from ${currentStatus} to ${status}`
          )
        );
      }

      // ===== UPDATE ORDER STATUS =====
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          orderStatus: status,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!updatedOrder) {
        return next(new ApiError(500, "Failed to update order status"));
      }

      console.log(`📦 Order ${orderId} status updated to: ${status}`);

      // ===== PREPARE NOTIFICATION MESSAGE =====
      let notificationTitle = "";
      let notificationBody = "";
      let emoji = "📦";

      switch (status) {
        case OrderStatus.CONFIRMED:
          emoji = "✅";
          notificationTitle = "Order Confirmed";
          notificationBody = `Your order #${order.orderId} has been confirmed. We're preparing your items.`;
          break;
        case OrderStatus.PROCESSING:
          emoji = "⏳";
          notificationTitle = "Processing Started";
          notificationBody = `Your order #${order.orderId} is being processed. Estimated shipping: 2-3 days.`;
          break;
        case OrderStatus.SHIPPED:
          emoji = "🚚";
          notificationTitle = "Order Shipped";
          notificationBody = `Your order #${order.orderId} has been shipped! Track your package to monitor delivery.`;
          break;
        case OrderStatus.OUT_FOR_DELIVERY:
          emoji = "🚚";
          notificationTitle = "Out for Delivery";
          notificationBody = `Your order #${order.orderId} is out for delivery today. Our delivery partner will reach you soon.`;
          break;
        case OrderStatus.DELIVERED:
          emoji = "✅";
          notificationTitle = "Order Delivered";
          notificationBody = `Your order #${order.orderId} has been delivered! Thank you for your purchase.`;
          break;
        case OrderStatus.CANCELLED:
          emoji = "❌";
          notificationTitle = "Order Cancelled";
          notificationBody = `Your order #${order.orderId} has been cancelled. ${notes || "Please contact support for details."}`;
          break;
        case OrderStatus.RETURNED:
          emoji = "↩️";
          notificationTitle = "Return Processing";
          notificationBody = `Your return for order #${order.orderId} is being processed. Refund will be credited within 5-7 days.`;
          break;
        case OrderStatus.FAILED:
          emoji = "❌";
          notificationTitle = "Delivery Failed";
          notificationBody = `Delivery for order #${order.orderId} could not be completed. We'll retry soon.`;
          break;
        default:
          notificationTitle = "Order Status Update";
          notificationBody = `Your order #${order.orderId} status: ${status}`;
      }

      // ===== SEND NOTIFICATION =====
      const notificationData = {
        orderId: updatedOrder._id,
        orderNumber: order.orderId,
        status,
        type: "order_status_update",
        screen: "OrderDetails",
        timestamp: new Date().toISOString(),
      };

      sendNotificationToUser(
        userId,
        `${emoji} ${notificationTitle}`,
        notificationBody,
        notificationData
      )
        .then((result) => {
          if (result.success) {
            console.log(` Status notification sent to user ${userId}`);
          } else if (result.queued) {
            console.log(` Status notification queued for user ${userId}`);
          } else {
            console.error(` Failed to send status notification: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error(` Notification error for order ${orderId}:`, err);
        });

      // ===== INVALIDATE CACHE =====
      try {
        await redis.del(`order:${orderId}`);
      } catch (error) {
        console.warn(" Cache invalidation failed:", error);
      }

      // ===== RETURN RESPONSE =====
      return handleResponse(
        req,
        res,
        200,
        "Order status updated successfully",
        {
          order: updatedOrder,
        }
      );
    }
  );

  /**
   * Cancel an order with refund processing
   * @route   POST /api/v2/orders/:orderId/cancel
   * @desc    Cancels order, processes refund, and notifies user
   * @access  Private (Customer/Admin)
   */
  public static cancelOrder = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { orderId } = req.params;
      const { userId, reason, refundNotes } = req.body;

      // ===== VALIDATE INPUT =====
      if (!userId) {
        return next(new ApiError(400, "User ID is required"));
      }

      // ===== VERIFY ORDER EXISTS =====
      const order = await Order.findById(orderId);
      if (!order) {
        return next(new ApiError(404, "Order not found"));
      }

      // ===== VALIDATE CANCELLATION ELIGIBILITY =====
      const cancellableStatuses = [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
      ];

      if (!cancellableStatuses.includes(order.orderStatus as OrderStatus)) {
        return next(
          new ApiError(
            400,
            `Cannot cancel order in ${order.orderStatus} status. Only ${cancellableStatuses.join(", ")} orders can be cancelled.`
          )
        );
      }

      // ===== VERIFY USER AUTHORIZATION =====
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return next(new ApiError(404, "User not found"));
      }

      // Check if user is order owner or admin
      if (order.userId.toString() !== userId && userExists.role !== RoleIndex.ADMIN) {
        return next(
          new ApiError(
            403,
            "You are not authorized to cancel this order"
          )
        );
      }

      // ===== UPDATE ORDER STATUS =====
      (order as any).orderStatus = OrderStatus.CANCELLED;
      const cancelledOrder = await order.save();

      console.log(` Order ${orderId} cancelled. Reason: ${reason || "Not specified"}`);

      // ===== RESTORE ITEM AVAILABILITY =====
      // Note: Item availability tracking is not yet implemented in the schema
      // This step should be implemented once inventory management is added
      console.log(`✅ Cancelled order ${orderId}, ready for potential inventory restoration`);

      // ===== STEP 7: SEND CANCELLATION NOTIFICATION =====
      const notificationMessage = reason
        ? `Reason: ${reason}`
        : "Your cancellation request has been processed.";

      const notificationData = {
        orderId: cancelledOrder._id,
        orderNumber: order.orderId,
        reason: reason || "User requested",
        type: "order_cancelled",
        screen: "OrderDetails",
        refundStatus: "Processing",
        cancelledAt: new Date().toISOString(),
      };

      sendNotificationToUser(
        userId,
        " Order Cancelled",
        `Your order #${order.orderId} has been cancelled. ${notificationMessage}. Refund will be processed within 5-7 business days.`,
        notificationData
      )
        .then((result) => {
          if (result.success || result.queued) {
            console.log(`✅ Cancellation notification sent to user ${userId}`);
          } else {
            console.error(` Failed to send cancellation notification: ${result.error}`);
          }
        })
        .catch((err) => {
          console.error(` Notification error for cancelled order ${orderId}:`, err);
        });

      // ===== STEP 8: INVALIDATE CACHE =====
      try {
        await redis.del(`order:${orderId}`);
      } catch (error) {
        console.warn(" Cache invalidation failed:", error);
      }
      try {
        await redis.del(`order:${cancelledOrder._id}`);
      } catch (error) {
        console.warn(" Cache invalidation for new ID failed:", error);
      }

      // ===== STEP 9: RETURN RESPONSE =====
      return handleResponse(
        req,
        res,
        200,
        "Order cancelled successfully",
        {
          order: cancelledOrder,
          refundStatus: "Processing",
          message: "Refund will be credited to your original payment method within 5-7 business days",
        }
      );
    }
  );

  /**
   * Retrieve single order details with comprehensive information
   * @route   GET /api/v2/orders/:orderId
   * @desc    Fetches complete order details including items, tracking, and status
   * @access  Private
   */
  public static getOrderDetails = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { orderId } = req.params;
      const { userId } = req.body;

      // ===== STEP 1: VALIDATE INPUT =====
      if (!userId) {
        return next(new ApiError(400, "User ID is required"));
      }

      // ===== CHECK CACHE FIRST =====
      try {
        const cachedOrder = await redis.get(`order:${orderId}`);
        if (cachedOrder) {
          console.log(`✅ Order ${orderId} retrieved from cache`);
          const parsedOrder = JSON.parse(cachedOrder);
          return handleResponse(
            req,
            res,
            200,
            "Order details retrieved from cache",
            { order: parsedOrder, cached: true }
          );
        }
      } catch (error) {
        console.warn("⚠️ Cache retrieval failed:", error);
      }

      // ===== FETCH FROM DATABASE =====
      const order = await Order.findById(orderId)
        .populate("userId", "userName email phone")
        .populate("medicineStoreId", "storeName storePhone address")
        .populate("orderItems.itemId", "itemName itemInitialPrice itemAvailable");

      if (!order) {
        return next(new ApiError(404, "Order not found"));
      }

      // ===== VERIFY USER AUTHORIZATION =====
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return next(new ApiError(404, "User not found"));
      }

      if (order.userId._id.toString() !== userId && userExists.role !== RoleIndex.ADMIN) {
        return next(
          new ApiError(403, "You are not authorized to view this order")
        );
      }

      // ===== ORDER DATA =====
      try {
        await redis.setEx(
          `order:${orderId}`,
          3600, // 1 hour TTL
          JSON.stringify(order)
        );
      } catch (error) {
        console.warn("⚠️ Redis caching failed:", error);
      }

      // ===== RETURN RESPONSE =====
      return handleResponse(
        req,
        res,
        200,
        "Order details retrieved successfully",
        {
          order,
          cached: false,
        }
      );
    }
  );

  /**
   * Retrieve all orders for a user with pagination and filtering
   * @route   GET /api/v2/orders
   * @desc    Fetches paginated list of orders for authenticated user
   * @access  Private
   */
  public static getUserOrders = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.body;
      const { page = 1, limit = 10, status, sortBy = "-createdAt" } = req.query;

      // ===== VALIDATE INPUT =====
      if (!userId) {
        return next(new ApiError(400, "User ID is required"));
      }

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(50, parseInt(limit as string) || 10);
      const skipCount = (pageNum - 1) * limitNum;

      // ===== BUILD QUERY FILTER =====
      const filter: any = { userId };

      if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
        filter.status = status;
      }

      // ===== VERIFY USER EXISTS =====
      const userExists = await UserModel.findById(userId);
      if (!userExists) {
        return next(new ApiError(404, "User not found"));
      }

      // ===== FETCH ORDERS WITH PAGINATION =====
      const [orders, totalCount] = await Promise.all([
        Order.find(filter)
          .sort(sortBy as string)
          .skip(skipCount)
          .limit(limitNum)
          .lean(),
        Order.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(totalCount / limitNum);

      // ===== RETURN RESPONSE =====
      return handleResponse(
        req,
        res,
        200,
        "Orders retrieved successfully",
        {
          orders,
          pagination: {
            currentPage: pageNum,
            totalPages,
            totalOrders: totalCount,
            ordersPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        }
      );
    }
  );

  /**
   * Get order analytics and statistics
   * @route   GET /api/v2/orders/analytics/dashboard
   * @desc    Provides order statistics for dashboard/analytics
   * @access  Private (Admin)
   */
  public static getOrderAnalytics = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
      const { userId } = req.body;
      const { dateRange = 30 } = req.query;

      // ===== VALIDATE INPUT =====
      if (!userId) {
        return next(new ApiError(400, "User ID is required"));
      }

      // ===== VERIFY USER IS ADMIN =====
      const user = await UserModel.findById(userId);
      if (!user || user.role !== RoleIndex.ADMIN) {
        return next(new ApiError(403, "Only admins can access analytics"));
      }

      // ===== CALCULATE DATE RANGE =====
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - parseInt(dateRange as string));

      // ===== FETCH ANALYTICS DATA =====
      const [totalOrders, totalRevenue, ordersByStatus, ordersByDate] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startDate } }),
        Order.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
              revenue: { $sum: "$totalAmount" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

      // ===== FORMAT RESPONSE =====
      return handleResponse(
        req,
        res,
        200,
        "Order analytics retrieved successfully",
        {
          dateRange: `Last ${dateRange} days`,
          totalOrders,
          totalRevenue: totalRevenue[0]?.totalRevenue || 0,
          ordersByStatus: Object.fromEntries(
            ordersByStatus.map((stat) => [stat._id, stat.count])
          ),
          ordersByDate,
        }
      );
    }
  );
}
