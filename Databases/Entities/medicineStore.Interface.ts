/*
┌───────────────────────────────────────────────────────────────────────┐
│  Medicine Store Interface - TypeScript definitions for store profile. │
│  Defines structure for medicine store data including store info,      │
│  licensing, address, and operational details.                         │
└───────────────────────────────────────────────────────────────────────┘
*/

import mongoose from "mongoose";

export enum StoreType {
  RETAIL = "Retail",
  WHOLESALE = "Wholesale",
  BOTH = "Both"
}

export enum VerificationStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended"
}

export interface IMedicineStore {
  _id?: mongoose.Types.ObjectId;
  storeName: string;
  storeType: StoreType;
  GSTNumber: string;
  pharmacyLicence: string;
  drugLicenceNumber?: string;
  address: {
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
  };
  contactDetails: {
    phone: string;
    alternatePhone?: string;
    email: string;
    whatsappNumber?: string;
  };
  ownerId: mongoose.Types.ObjectId; // Reference to User collection
  operatingHours?: {
    monday?: { open: string; close: string; isClosed?: boolean };
    tuesday?: { open: string; close: string; isClosed?: boolean };
    wednesday?: { open: string; close: string; isClosed?: boolean };
    thursday?: { open: string; close: string; isClosed?: boolean };
    friday?: { open: string; close: string; isClosed?: boolean };
    saturday?: { open: string; close: string; isClosed?: boolean };
    sunday?: { open: string; close: string; isClosed?: boolean };
  };
  is24x7?: boolean;
  storeImages?: string[];
  licenceDocuments?: string[];
  description?: string;
  services?: string[]; // e.g., "Home Delivery", "Emergency Service", "Online Consultation"
  acceptedPaymentMethods?: string[];
  minimumOrderAmount?: number;
  deliveryAvailable?: boolean;
  deliveryRadius?: number; 
  deliveryCharges?: number;
  freeDeliveryAbove?: number;
  
  // Verification and status
  verificationStatus: VerificationStatus;
  isVerified: boolean;
  isActive: boolean;
  verificationDate?: Date;
  verifiedBy?: mongoose.Types.ObjectId; // Admin who verified
  verifiedAt?: Date;
  adminRemarks?: string;
  
  // Government verification flags
  gstVerified: boolean;
  pharmacistVerified: boolean;
  
  // Documents
  documents?: {
    drugLicense?: string;
    pharmacistCert?: string;
    storePhoto?: string;
    kycDoc?: string;
  };
  
  // License expiry
  licenseExpiry?: Date
  
  // Ratings and reviews
  averageRating?: number;
  totalReviews?: number;
  
  // Business details
  establishedYear?: number;
  bankDetails?: {
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    accountHolderName?: string;
    accountType?: "Savings" | "Current";
  };
  
  // Inventory and orders
  totalProducts?: number;
  totalOrders?: number;
  
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}
