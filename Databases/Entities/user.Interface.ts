/*
┌───────────────────────────────────────────────────────────────────────┐
│  User Interface - TypeScript definitions for user profiles.           │
│  Defines structure for user data including personal info and address. │
└───────────────────────────────────────────────────────────────────────┘
*/

import mongoose from "mongoose";
import RoleIndex from "../../Utils/Roles.enum";

export interface Iuser {
  _id?: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  password: string;
  phone: string;
  age: number;
  fcmToken?: string;
  lastLogin?: Date;
  category?: mongoose.Types.ObjectId[];
  itemsSold?: mongoose.Types.ObjectId[];
  viewedItems?: mongoose.Types.ObjectId[];
  viewedCategories?: mongoose.Types.ObjectId[];
  dob: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    location?: {
      longitude: number;
      latitude: number;
    };
  };
  role: RoleIndex;
  ProfileImage?: string[];
  recentSearches?: Array<{
    query: string;
    timestamp: number;
  }>;
  
  // Pharmacy-related fields
  pharmacyInfo?: {
    storeId?: mongoose.Types.ObjectId;
    designation?: string; // e.g., "Owner", "Pharmacist", "Sales Assistant", "Store Manager"
    pharmacistRegistrationNumber?: string;
    pharmacistLicenceExpiry?: Date;
    qualification?: string[];
    experience?: number;
    specialization?: string[]; //  ["Clinical Pharmacy", "Oncology"]
    
    // Employment details (for staff)
    employmentType?: "Full-time" | "Part-time" | "Contract" | "Intern";
    joiningDate?: Date;
    employeeId?: string;
    department?: string;
    reportingTo?: mongoose.Types.ObjectId; // Manager/Owner user ID
    salary?: {
      amount?: number;
      currency?: string;
      paymentFrequency?: "Monthly" | "Weekly" | "Hourly";
    };
    
    // Working hours
    workingHours?: {
      shiftType?: "Morning" | "Evening" | "Night" | "Rotational";
      hoursPerWeek?: number;
    };
    
    // Permissions and access
    permissions?: string[]; //  ["manage_inventory", "process_orders", "manage_staff"]
    canApproveOrders?: boolean;
    canManageInventory?: boolean;
    canViewReports?: boolean;
    
    // Status
    isActive?: boolean;
    terminationDate?: Date;
    terminationReason?: string;
  };
  
  // ID Proofs and Documents
  identityDocuments?: {
    aadharNumber?: string;
    aadharDocument?: string; // URL to uploaded document
    panNumber?: string;
    panDocument?: string;
    drivingLicence?: string;
    drivingLicenceDocument?: string;
    passport?: string;
    passportDocument?: string;
  };
  
  // Professional Documents
  professionalDocuments?: {
    educationCertificates?: string[];
    experienceCertificates?: string[];
    otherDocuments?: string[];
  };
  
  // Emergency Contact (for staff - who to contact in case of workplace emergency)
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
    alternatePhone?: string;
  };
  
  // KYC and Verification
  kycStatus?: "Pending" | "Verified" | "Rejected";
  kycVerifiedBy?: mongoose.Types.ObjectId; // Admin who verified
  kycVerificationDate?: Date;
  isPhoneVerified?: boolean;
  isEmailVerified?: boolean;
  
  createdAt?: Date;
  updatedAt?: Date;
}
