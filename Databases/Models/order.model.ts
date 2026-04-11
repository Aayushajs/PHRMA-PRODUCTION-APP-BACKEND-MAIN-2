/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Model - Mongoose model for medicine orders.                    │
│  Connects Order Schema to the 'Order' collection.                     │
│  Applies validation middleware on save.                               │
└───────────────────────────────────────────────────────────────────────┘
*/

import { orderSchema } from "../Schema/order.Schema";
import { IOrder } from "../Entities/order.Interface";
import { model } from "mongoose";
import {
  validateOrderTotalAmount,
  validateDeliveryDates,
  validateRefundAmount,
  validateOrderItems,
  validateAddresses,
  validateDiscount,
} from "../../Middlewares/orderValidation";
import { NextFunction } from "express";

// Create model
const Order = model<IOrder>("Order", orderSchema);

// Apply pre-save validation hook
orderSchema.pre("save", function (this: IOrder, next : NextFunction) {
  try {
    // Validate all order fields
    validateOrderItems(this);
    validateAddresses(this);
    validateDiscount(this);
    validateOrderTotalAmount(this);
    validateDeliveryDates(this);
    validateRefundAmount(this);
    next();
  } catch (error: any) {
    next(new Error(error.message || "Order validation failed"));
  }
});

export default Order;
