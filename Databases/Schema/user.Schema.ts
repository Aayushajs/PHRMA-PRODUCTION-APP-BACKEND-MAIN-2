/*
┌───────────────────────────────────────────────────────────────────────┐
│  Defines user accounts for e-pharmacy platform with authentication,   │
│  profile data, and role-based access. Stores personal details,        │
│  address, wishlist, and timestamps. Supports both customers and       │
│  administrators through role enumeration.                             │
└───────────────────────────────────────────────────────────────────────┘
*/

import RoleIndex from "../../Utils/Roles.enum";
import { Iuser } from "../Entities/user.Interface";
import { Schema, Document } from "mongoose";

export const userSchema = new Schema<Iuser & Document>(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function (this: any) {
        // ✔ password only required for local users
        return this.provider === "local";
      },
    },
    phone: {
      type: String,
      sparse: true, // Allows null/empty for Google sign-in users
      default: "",
    },
    age: {
      type: Number,
    },
    dob: {
      type: Date,
    },
    fcmToken: {
      type: String,
    },
    lastLogin: {
      type: Date,
    },
    itemsSold: {
      type: [Schema.Types.ObjectId],
      ref: "Item",
      default: [],
    },
    viewedItems: {
      type: [Schema.Types.ObjectId],
      ref: "Item",
      default: [],
    },
    viewedCategories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      default: [],
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
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
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "CUSTOMER", "OWNER", "STAFF"],
      default: RoleIndex.UNKNOWN,
    },
    ProfileImage: {
      type: [String],
      default: [],
      description: "Array of Cloudinary image URLs"
    },
    recentSearches: {
      type: [
        {
          query: {
            type: String,
          },
          timestamp: {
            type: Number,
            default: Date.now
          }
        }
      ],
      default: [],
    },
    
    // Pharmacy-related fields
    pharmacyInfo: {
      storeId: {
        type: Schema.Types.ObjectId,
        ref: "MedicineStore",
      },
      designation: {
        type: String,
        trim: true,
      },
      pharmacistRegistrationNumber: {
        type: String,
        uppercase: true,
        trim: true,
        sparse: true, // Allows multiple null values
      },
      pharmacistLicenceExpiry: {
        type: Date,
      },
      qualification: {
        type: [String],
        default: [],
      },
      experience: {
        type: Number,
        min: 0,
      },
      specialization: {
        type: [String],
        default: [],
      },
      employmentType: {
        type: String,
        enum: ["Full-time", "Part-time", "Contract", "Intern"],
      },
      joiningDate: {
        type: Date,
      },
      employeeId: {
        type: String,
        trim: true,
      },
      department: {
        type: String,
        trim: true,
      },
      reportingTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
      salary: {
        amount: Number,
        currency: {
          type: String,
          default: "INR",
        },
        paymentFrequency: {
          type: String,
          enum: ["Monthly", "Weekly", "Hourly"],
          default: "Monthly",
        },
      },
      workingHours: {
        shiftType: {
          type: String,
          enum: ["Morning", "Evening", "Night", "Rotational"],
        },
        hoursPerWeek: {
          type: Number,
          min: 0,
          max: 168,
        },
      },
      permissions: {
        type: [String],
        default: [],
      },
      canApproveOrders: {
        type: Boolean,
        default: false,
      },
      canManageInventory: {
        type: Boolean,
        default: false,
      },
      canViewReports: {
        type: Boolean,
        default: false,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      terminationDate: {
        type: Date,
      },
      terminationReason: {
        type: String,
      },
    },
    
    // ID Proofs and Documents
    identityDocuments: {
      aadharNumber: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^[0-9]{12}$/.test(v);
          },
          message: "Aadhar number must be 12 digits",
        },
      },
      aadharDocument: String,
      panNumber: {
        type: String,
        uppercase: true,
        validate: {
          validator: function (v: string) {
            return !v || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
          },
          message: "Invalid PAN format",
        },
      },
      panDocument: String,
      drivingLicence: String,
      drivingLicenceDocument: String,
      passport: String,
      passportDocument: String,
    },
    
    // Professional Documents
    professionalDocuments: {
      educationCertificates: {
        type: [String],
        default: [],
      },
      experienceCertificates: {
        type: [String],
        default: [],
      },
      otherDocuments: {
        type: [String],
        default: [],
      },
    },
    
    // Emergency Contact
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      relationship: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        validate: {
          validator: function (v: string) {
            return !v || /^[6-9]\d{9}$/.test(v);
          },
          message: "Invalid phone number",
        },
      },
      alternatePhone: {
        type: String,
      },
      address: {
        type: String,
      },
    },
    
    // KYC and Verification
    kycStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    kycVerifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    kycVerificationDate: {
      type: Date,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for pharmacy-related queries
userSchema.index({ "pharmacyInfo.storeId": 1, role: 1 });
// userSchema.index({ "pharmacyInfo.pharmacistRegistrationNumber": 1 }, { sparse: true });
userSchema.index({ "pharmacyInfo.employeeId": 1 }, { sparse: true });
userSchema.index({ "identityDocuments.aadharNumber": 1 }, { sparse: true });
userSchema.index({ "identityDocuments.panNumber": 1 }, { sparse: true });
userSchema.index({ kycStatus: 1 });
