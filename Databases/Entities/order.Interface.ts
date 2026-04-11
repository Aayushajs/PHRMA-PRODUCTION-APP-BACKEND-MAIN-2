/*
┌───────────────────────────────────────────────────────────────────────┐
│  Order Interface - TypeScript definitions for medicine orders.        │
│  Defines structure for order details including items, delivery,       │
│  payment, and tracking information for e-pharmacy platform.           │
└───────────────────────────────────────────────────────────────────────┘
*/

import mongoose from "mongoose";

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PROCESSING = "processing",
  SHIPPED = "shipped",
  OUT_FOR_DELIVERY = "out_for_delivery",
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
  RETURNED = "returned",
  FAILED = "failed",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
  PARTIALLY_REFUNDED = "partially_refunded",
}

export enum PaymentMethod {
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
  UPI = "upi",
  NETBANKING = "netbanking",
  WALLET = "wallet",
  CASH_ON_DELIVERY = "cash_on_delivery",
}

export enum ShippingMethod {
  STANDARD = "standard",
  EXPRESS = "express",
  OVERNIGHT = "overnight",
  LOCAL_PICKUP = "local_pickup",
}

export enum ReturnReason {
  DEFECTIVE = "defective",
  WRONG_ITEM = "wrong_item",
  NOT_SAME_BRAND = "not_same_brand",
  NOT_AS_DESCRIBED = "not_as_described",
  EXPIRED_PRODUCT = "expired_product",
  OTHER = "other",
}

export enum CancellationReason {
  ORDERED_BY_MISTAKE = "ordered_by_mistake",
  FOUND_CHEAPER_ELSEWHERE = "found_cheaper_elsewhere",
  DELIVERY_TOO_LATE = "delivery_too_late",
  CHANGED_DELIVERY_ADDRESS = "changed_delivery_address",
  PRESCRIPTION_NOT_AVAILABLE = "prescription_not_available",
  DOCTOR_ADVISED_CANCEL = "doctor_advised_cancel",
  DUPLICATE_ORDER = "duplicate_order",
  CUSTOMER_REQUEST = "customer_request",
  OUT_OF_STOCK = "out_of_stock",
  PRICING_ERROR = "pricing_error",
  PAYMENT_ISSUE = "payment_issue",
  OTHER = "other",
}

export interface OrderItem {
  itemId: mongoose.Types.ObjectId;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemBatchNumber?: string;
  itemExpiryDate?: Date;
  discount?: number;
  gstAmount?: number;
  hsnCode?: string;
}

export enum returnReason {
  DEFECTIVE = "defective",
  WRONG_ITEM = "wrong_item",
  NOT_SAME_BRAND = "not_same_brand",
  NOT_AS_DESCRIBED = "not_as_described",
  OTHER = "other",
}

export interface IOrder {
  _id?: mongoose.Types.ObjectId;

  orderId: string;
  userId: mongoose.Types.ObjectId;
  medicineStoreId: mongoose.Types.ObjectId;

  orderItems: OrderItem[];

  subtotal: number;
  discount?: number;
  discountPercentage?: number;
  taxAmount: number;
  shippingCost?: number;
  totalAmount: number;

  // Delivery Address
  deliveryAddress: {
    street: string;
    area?: string;
    city: string;
    state: string;
    pincode: number;
    landmark?: string;
    location?: {
      longitude: number;
      latitude: number;
    };
    recipientName: string;
    recipientPhone: string;
  };

  // Billing Address
  billingAddress?: {
    street: string;
    area?: string;
    city: string;
    state: string;
    pincode: number;
    landmark?: string;
  };

  // Payment Information
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentDate?: Date;
  paymentDetails?: {
    transactionId?: string;
    cardLast4?: string;
    upiId?: string;
    bankName?: string;
  };

  // Order Status & Tracking
  orderStatus: OrderStatus;
  shippingMethod: ShippingMethod;
  trackingNumber?: string;

  // Delivery Timeline
  orderDate: Date;
  confirmedDate?: Date;
  processedDate?: Date;
  shippedDate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;

  // Prescription Information
  prescriptionRequired?: boolean;
  prescriptionFile?: string;
  prescriptionVerified?: boolean;
  prescriptionVerifiedDate?: Date;
  prescriptionVerifiedBy?: mongoose.Types.ObjectId;

  // Special Instructions
  specialInstructions?: string;
  deliveryNotes?: string;

  // Cancellation Details
  cancellationReason?: CancellationReason;
  cancellationDate?: Date;
  cancelledBy?: "user" | "store" | "system";

  // Return & Refund Details
  isReturnable?: boolean;
  returnReason?: ReturnReason;
  returnDate?: Date;
  returnApprovedDate?: Date;
  refundAmount?: number;
  refundStatus?: PaymentStatus;
  refundTransactionId?: string;

  // Insurance & Warranty
  addInsurance?: boolean;
  insuranceCost?: number;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;

  // Communication
  orderNotificationsSent?: {
    orderConfirmed: boolean;
    orderProcessed: boolean;
    orderShipped: boolean;
    outForDelivery: boolean;
    delivered: boolean;
    cancelled: boolean;
    returned: boolean;
  };

  // Ratings & Reviews
  isRated?: boolean;
  rating?: number;
  review?: string;
  reviewDate?: Date;

  // Additional Details
  notes?: string;
  vendorNotes?: string;
  couponCode?: string;
  couponDiscount?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;

  // Internal Fields
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  deletedBy?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // Flag for soft delete
  isDeleted?: boolean;
}
