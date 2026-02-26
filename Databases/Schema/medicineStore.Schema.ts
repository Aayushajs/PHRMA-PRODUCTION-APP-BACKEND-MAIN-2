/*
┌───────────────────────────────────────────────────────────────────────┐
│  Defines medicine store schema for e-pharmacy platform.               │
│  Stores store details, licensing, address, contact info, and          │
│  operational status. Supports both retail and wholesale stores.       │
└───────────────────────────────────────────────────────────────────────┘
*/

import { IMedicineStore, StoreType, VerificationStatus } from "../Entities/medicineStore.Interface";
import { Schema, Document } from "mongoose";

export const medicineStoreSchema = new Schema<IMedicineStore & Document>(
  {
    storeName: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      minlength: [3, "Store name must be at least 3 characters long"],
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },
    storeType: {
      type: String,
      enum: Object.values(StoreType),
      required: [true, "Store type is required"],
      default: StoreType.RETAIL,
    },
    GSTNumber: {
      type: String,
      required: [true, "GST Number is required"],
      unique: true,
      uppercase: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          // GST format: 2 digits (state) + 10 alphanumeric (PAN) + 1 digit + 1 letter + 1 digit/letter
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: "Invalid GST Number format",
      },
    },
    pharmacyLicence: {
      type: String,
      required: [true, "Pharmacy Licence is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    drugLicenceNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    address: {
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
        type: String,
        required: [true, "Pincode is required"],
        validate: {
          validator: function (v: string) {
            return /^[0-9]{6}$/.test(v);
          },
          message: "Pincode must be exactly 6 digits",
        },
      },
      landmark: {
        type: String,
        trim: true,
      },
      location: {
        longitude: {
          type: Number,
          min: -180,
          max: 180,
        },
        latitude: {
          type: Number,
          min: -90,
          max: 90,
        },
      },
    },
    contactDetails: {
      phone: {
        type: String,
        required: [true, "Phone number is required"],
        validate: {
          validator: function (v: string) {
            return /^[6-9]\d{9}$/.test(v);
          },
          message: "Invalid phone number format",
        },
      },
      alternatePhone: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^[6-9]\d{9}$/.test(v);
          },
          message: "Invalid alternate phone number format",
        },
      },
      email: {
        type: String,
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
        validate: {
          validator: function (v: string) {
            return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
          },
          message: "Invalid email format",
        },
      },
      whatsappNumber: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^[6-9]\d{9}$/.test(v);
          },
          message: "Invalid WhatsApp number format",
        },
      },
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
    },
    operatingHours: {
      monday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      tuesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      wednesday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      thursday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      friday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      saturday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
      sunday: {
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    },
    is24x7: {
      type: Boolean,
      default: false,
    },
    storeImages: {
      type: [String],
      default: [],
    },
    licenceDocuments: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    services: {
      type: [String],
      default: [],
    },
    acceptedPaymentMethods: {
      type: [String],
      default: ["Cash", "Card", "UPI"],
    },
    minimumOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    deliveryAvailable: {
      type: Boolean,
      default: true,
    },
    deliveryRadius: {
      type: Number,
      min: 0,
      default: 5, // Default 5 km radius
    },
    deliveryCharges: {
      type: Number,
      min: 0,
      default: 0,
    },
    freeDeliveryAbove: {
      type: Number,
      min: 0,
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.PENDING,
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    verificationDate: {
      type: Date,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    adminRemarks: {
      type: String,
      maxlength: [500, "Admin remarks cannot exceed 500 characters"],
    },
    gstVerified: {
      type: Boolean,
      default: false,
    },
    pharmacistVerified: {
      type: Boolean,
      default: false,
    },
    documents: {
      drugLicense: {
        type: String,
      },
      pharmacistCert: {
        type: String,
      },
      storePhoto: {
        type: String,
      },
      kycDoc: {
        type: String,
      },
    },
    licenseExpiry: {
      type: Date,
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalReviews: {
      type: Number,
      min: 0,
      default: 0,
    },
    establishedYear: {
      type: Number,
      min: 1900,
      max: new Date().getFullYear(),
    },
    bankDetails: {
      accountNumber: {
        type: String,
      },
      ifscCode: {
        type: String,
        uppercase: true,
        trim: true,
      },
      accountHolderName: {
        type: String,
        trim: true,
      },
    },
    totalProducts: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalOrders: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Index for location-based queries
medicineStoreSchema.index({ "address.location": "2dsphere" });

// Index for search optimization
medicineStoreSchema.index({ storeName: "text", description: "text" });

// Compound indexes for common queries
medicineStoreSchema.index({ storeType: 1, isActive: 1, isVerified: 1 });
medicineStoreSchema.index({ "address.city": 1, "address.state": 1 });
medicineStoreSchema.index({ "address.pincode": 1 });
