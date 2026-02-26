/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Schema - Mongoose schema for medicine orders.                  │
│  Defines validation, indexing, and default values for orders.         │
│  Supports complete order lifecycle from creation to delivery/return.  │
└───────────────────────────────────────────────────────────────────────┘
*/

import {
  IOrder,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ShippingMethod,
} from "../Entities/order.Interface";
import { Schema, Document } from "mongoose";

export const orderSchema = new Schema<IOrder & Document>(
  {
    // Order Identification
    orderId: {
      type: String,
      required: [true, "Order ID is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    medicineStoreId: {
      type: Schema.Types.ObjectId,
      ref: "MedicineStore",
      required: [true, "Medicine Store ID is required"],
      index: true,
    },

    // Order Items
    orderItems: {
      type: [
        {
          itemId: {
            type: Schema.Types.ObjectId,
            ref: "Item",
            required: [true, "Item ID is required"],
          },
          itemName: {
            type: String,
            required: [true, "Item name is required"],
          },
          quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [1, "Quantity must be at least 1"],
          },
          unitPrice: {
            type: Number,
            required: [true, "Unit price is required"],
            min: [0, "Unit price cannot be negative"],
          },
          totalPrice: {
            type: Number,
            required: [true, "Total price is required"],
            min: [0, "Total price cannot be negative"],
          },
          itemBatchNumber: {
            type: String,
            trim: true,
          },
          itemExpiryDate: {
            type: Date,
            validate: {
              validator: function (v: Date) {
                return v > new Date();
              },
              message: "Item expiry date must be in the future",
            },
          },
          discount: {
            type: Number,
            default: 0,
            min: [0, "Discount cannot be negative"],
          },
          gstAmount: {
            type: Number,
            default: 0,
            min: [0, "GST amount cannot be negative"],
          },
          hsnCode: {
            type: String,
            trim: true,
          },
        },
      ],
      required: [true, "Order items are required"],
      validate: {
        validator: function (v: any[]) {
          return v.length > 0;
        },
        message: "Order must contain at least one item",
      },
    },

    // Pricing Details
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "Discount percentage cannot be negative"],
      max: [100, "Discount percentage cannot exceed 100"],
    },
    taxAmount: {
      type: Number,
      required: [true, "Tax amount is required"],
      min: [0, "Tax amount cannot be negative"],
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, "Shipping cost cannot be negative"],
    },
    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    // Delivery Address
    deliveryAddress: {
      street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
      pincode: {
        type: Number,
        required: [true, "Pincode is required"],
        validate: {
          validator: function (v: number) {
            return /^[0-9]{6}$/.test(v.toString());
          },
          message: "Invalid pincode format",
        },
      },
      landmark: {
        type: String,
        trim: true,
      },
      location: {
        longitude: {
          type: Number,
        },
        latitude: {
          type: Number,
        },
      },
      recipientName: {
        type: String,
        required: [true, "Recipient name is required"],
        trim: true,
      },
      recipientPhone: {
        type: String,
        required: [true, "Recipient phone is required"],
        validate: {
          validator: function (v: string) {
            return /^[0-9]{10}$/.test(v.replace(/\D/g, ""));
          },
          message: "Invalid phone number format",
        },
      },
    },

    // Billing Address
    billingAddress: {
      street: {
        type: String,
        trim: true,
      },
      area: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      pincode: {
        type: Number,
      },
      landmark: {
        type: String,
        trim: true,
      },
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, "Payment method is required"],
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    paymentId: {
      type: String,
      trim: true,
    },
    paymentDate: {
      type: Date,
    },
    paymentDetails: {
      transactionId: {
        type: String,
        trim: true,
      },
      cardLast4: {
        type: String,
        trim: true,
      },
      upiId: {
        type: String,
        trim: true,
      },
      bankName: {
        type: String,
        trim: true,
      },
    },

    // Order Status & Tracking
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true,
    },
    shippingMethod: {
      type: String,
      enum: Object.values(ShippingMethod),
      default: ShippingMethod.STANDARD,
    },
    trackingNumber: {
      type: String,
      trim: true,
      sparse: true,
    },

    // Delivery Timeline
    orderDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    confirmedDate: {
      type: Date,
    },
    processedDate: {
      type: Date,
    },
    shippedDate: {
      type: Date,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },

    // Prescription Information
    prescriptionRequired: {
      type: Boolean,
      default: false,
    },
    prescriptionFile: {
      type: String,
      trim: true,
    },
    prescriptionVerified: {
      type: Boolean,
      default: false,
    },
    prescriptionVerifiedDate: {
      type: Date,
    },
    prescriptionVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Special Instructions
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, "Special instructions cannot exceed 500 characters"],
    },
    deliveryNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Delivery notes cannot exceed 500 characters"],
    },

    // Cancellation Details
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
    },
    cancellationDate: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ["user", "store", "system"],
    },

    // Return & Refund Details
    isReturnable: {
      type: Boolean,
      default: true,
    },
    returnReason: {
      type: String,
      trim: true,
      maxlength: [300, "Return reason cannot exceed 300 characters"],
    },
    returnDate: {
      type: Date,
    },
    returnApprovedDate: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, "Refund amount cannot be negative"],
    },
    refundStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
    },
    refundTransactionId: {
      type: String,
      trim: true,
    },

    // Insurance & Warranty
    addInsurance: {
      type: Boolean,
      default: false,
    },
    insuranceCost: {
      type: Number,
      default: 0,
      min: [0, "Insurance cost cannot be negative"],
    },
    insuranceProvider: {
      type: String,
      trim: true,
    },
    insurancePolicyNumber: {
      type: String,
      trim: true,
    },

    // Communication Tracking
    orderNotificationsSent: {
      orderConfirmed: {
        type: Boolean,
        default: false,
      },
      orderProcessed: {
        type: Boolean,
        default: false,
      },
      orderShipped: {
        type: Boolean,
        default: false,
      },
      outForDelivery: {
        type: Boolean,
        default: false,
      },
      delivered: {
        type: Boolean,
        default: false,
      },
      cancelled: {
        type: Boolean,
        default: false,
      },
      returned: {
        type: Boolean,
        default: false,
      },
    },

    // Ratings & Reviews
    isRated: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters"],
    },
    reviewDate: {
      type: Date,
    },

    // Additional Details
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    vendorNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Vendor notes cannot exceed 500 characters"],
    },
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: [0, "Coupon discount cannot be negative"],
    },
    loyaltyPointsUsed: {
      type: Number,
      default: 0,
      min: [0, "Loyalty points used cannot be negative"],
    },
    loyaltyPointsEarned: {
      type: Number,
      default: 0,
      min: [0, "Loyalty points earned cannot be negative"],
    },

    // Internal Fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Soft Delete Flag
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ medicineStoreId: 1, orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ trackingNumber: 1 }, { sparse: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ isDeleted: 1 });
orderSchema.index({ "deliveryAddress.pincode": 1 });
