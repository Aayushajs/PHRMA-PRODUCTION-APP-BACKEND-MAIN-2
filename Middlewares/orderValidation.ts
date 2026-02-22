/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Validation Middleware - Pre-save validation and calculations.  │
│  Handles totalAmount calculations, date validation, and business      │
│  logic before saving order to database.                               │
└───────────────────────────────────────────────────────────────────────┘
*/

import { IOrder } from "../Databases/Entities/order.Interface";
import OrderModel from "../Databases/Models/order.model";

/**
 * Validate and calculate total amount for order
 * Ensures totalAmount matches: subtotal - discount + taxAmount + shippingCost
 */
export const validateOrderTotalAmount = (order: IOrder): void => {
  const calculatedTotal =
    order.subtotal -
    (order.discount || 0) +
    order.taxAmount +
    (order.shippingCost || 0);

  // Allow 0.01 difference due to floating point calculations
  if (Math.abs(order.totalAmount - calculatedTotal) > 0.01) {
    order.totalAmount = calculatedTotal;
  }
};

/**
 * Validate delivery dates
 * Ensures estimatedDeliveryDate is in the future
 */
export const validateDeliveryDates = (order: IOrder): void => {
  if (order.estimatedDeliveryDate) {
    if (order.estimatedDeliveryDate < new Date()) {
      throw new Error("Estimated delivery date must be in the future");
    }
  }

  if (order.actualDeliveryDate && order.estimatedDeliveryDate) {
    // Early delivery is allowed, but log it if needed
    if (order.actualDeliveryDate < order.estimatedDeliveryDate) {
      console.log(`✓ Order delivered early`);
    }
  }
};

/**
 * Validate refund amount
 * Refund should not exceed totalAmount
 */
export const validateRefundAmount = (order: IOrder): void => {
  if (order.refundAmount && order.refundAmount > order.totalAmount) {
    throw new Error("Refund amount cannot exceed total order amount");
  }
};

/**
 * Validate order items
 * Ensures at least one item and all items have valid quantities
 */
export const validateOrderItems = (order: IOrder): void => {
  if (!order.orderItems || order.orderItems.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  order.orderItems.forEach((item, index) => {
    if (!item.itemId || item.quantity < 1) {
      throw new Error(
        `Invalid item at index ${index}: itemId and quantity are required`
      );
    }
  });
};

/**
 * Validate discount
 * Discount should not exceed subtotal
 */
export const validateDiscount = (order: IOrder): void => {
  if (order.discount && order.discount > order.subtotal) {
    throw new Error("Discount cannot exceed subtotal");
  }

  if (order.discountPercentage && (order.discountPercentage < 0 || order.discountPercentage > 100)) {
    throw new Error("Discount percentage must be between 0 and 100");
  }
};

/**
 * Validate addresses
 */
export const validateAddresses = (order: IOrder): void => {
  if (!order.deliveryAddress) {
    throw new Error("Delivery address is required");
  }

  const { pincode } = order.deliveryAddress;
  if (!/^[0-9]{6}$/.test(pincode.toString())) {
    throw new Error("Invalid pincode format - must be 6 digits");
  }

  const { recipientPhone } = order.deliveryAddress;
  if (!/^[0-9]{10}$/.test(recipientPhone.replace(/\D/g, ""))) {
    throw new Error("Invalid phone number - must be 10 digits");
  }
};

/**
 * Complete order validation
 * Runs all validation checks
 */
export const validateOrder = (order: IOrder): void => {
  validateOrderItems(order);
  validateAddresses(order);
  validateDiscount(order);
  validateOrderTotalAmount(order);
  validateDeliveryDates(order);
  validateRefundAmount(order);
};

/**
 * Apply pre-save order hook to schema
 * Call this in model initialization
 */
export const applyOrderValidationHook = (): void => {
  OrderModel.schema.pre("save", function (next) {
    try {
      validateOrder(this as IOrder);
      next();
    } catch (error: any) {
      next(new Error(error.message || "Order validation failed"));
    }
  });
};
