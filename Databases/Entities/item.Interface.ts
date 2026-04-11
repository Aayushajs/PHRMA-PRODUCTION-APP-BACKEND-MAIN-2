/*
┌───────────────────────────────────────────────────────────────────────┐
│  Item Interface - TypeScript definitions for product items.           │
│  Defines structure for medicine details, stock, prices, and expiry.   │
│  Includes medicineStoreId to track which store added the item.        │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Types } from "mongoose";

export interface Iitem {
  itemName: string;
  itemDescription?: string;
  itemInitialPrice: number;
  itemFinalPrice: number;

  itemParentUnit?: Types.ObjectId;
  itemChildUnit: Types.ObjectId;
  itemCategory: Types.ObjectId;

  itemMfgDate: Date;
  itemExpiryDate: Date;

  itemImages?: string[];
  imageProcessingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'not_required';
  imageProcessingJobId?: string;
  imageProcessingError?: string | null;
  imageProcessingImageCount?: number;
  imageProcessingUpdatedAt?: Date;
  itemCompany?: string;
  itemBatchNumber?: string;

  itemDiscount?: number;
  itemRatings?: number;
  itemGST?: Types.ObjectId;

  // Track which medicine store added this item
  medicineStoreId: Types.ObjectId;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  deletedBy?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  code?: string;
  HSNCode?: string;
  formula?: string;

  views?: number;
  images?: string[];

  changeLog?: {
    date: Date;
    by: {
      name: string;
      userId: Types.ObjectId;
    };
  }[];

  weight?: string;

  stockAisleIds?: Types.ObjectId[];
  stockAvailability?: {
    [aisleId: string]: number; // Maps aisle ID to available stock quantity
  };
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited_stock';

  isTrending?: boolean;

  link?:string;

  otherInformation?:{ 
    keyFeatures?:string[],
    benefits?:string[],
    sideEffects?:string[],
    precautions?:string[],
    contraindications?:string[],
    interactions?:string[],
    allergyInfo?:string[],
    warnings?:string[],
    howToUse?:string,
    safetyAdvice?:string[],
    ingredients?:string[],
    
  };

  mrpVerification?: {
    status?: 'approved' | 'warning' | 'rejected' | 'pending';
    systemFinalMRP?: number;
    userEnteredPrice?: number;
    maxAllowedPrice?: number;
    finalScore?: number;
    reason?: string;
    difference?: string;
    stageUsed?: string;
    needsAdminReview?: boolean;
    verifiedAt?: Date;
    realtimeReferences?: Array<{
      source: string;
      matchedProduct: string;
      mrp: number;
      pack: string;
      normalizedMRP: number;
      weightUsed: number;
      matchScore: number;
    }>;
  };
}
