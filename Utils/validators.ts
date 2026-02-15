/*
┌───────────────────────────────────────────────────────────────────────┐
│  Validation Utilities - GST, Pharmacy License, and other validators   │
│  Provides format validation and verification for Indian documents     │
└───────────────────────────────────────────────────────────────────────┘
*/

/**
 * Validates Indian GST Number format
 * Format: 2 digits state code + 10 chars PAN + 1 entity number + Z + 1 checksum
 * Example: 22AAAAA0000A1Z5
 */
export const validateGSTFormat = (gstNumber: string): { isValid: boolean; message: string } => {
    if (!gstNumber) {
        return { isValid: false, message: "GST Number is required" };
    }

    const gst = gstNumber.trim().toUpperCase();

    if (gst.length !== 15) {
        return { isValid: false, message: "GST Number must be 15 characters long" };
    }

    // GST Number format: 2 state code + 10 PAN + 1 entity + Z + 1 checksum
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstRegex.test(gst)) {
        return { isValid: false, message: "Invalid GST Number format. Expected format: 22AAAAA0000A1Z5" };
    }

    const stateCode = parseInt(gst.substring(0, 2));
    if (stateCode < 1 || stateCode > 37) {
        return { isValid: false, message: "Invalid state code in GST Number" };
    }

    if (gst[13] !== 'Z') {
        return { isValid: false, message: "13th character of GST Number must be 'Z'" };
    }

    return { isValid: true, message: "GST Number format is valid" };
};

/**
 * Validates Indian Pharmacy License Number format
 * Format varies by state but generally contains state code and registration number
 * Example formats: DL/PH/2021/12345, MH-PH-2021-1234, etc.
 */
export const validatePharmacyLicenseFormat = (licenseNumber: string, state?: string): { isValid: boolean; message: string } => {
    if (!licenseNumber) {
        return { isValid: false, message: "Pharmacy License Number is required" };
    }

    const license = licenseNumber.trim().toUpperCase();

    if (license.length < 8) {
        return { isValid: false, message: "Pharmacy License Number is too short. Minimum 8 characters required" };
    }

    const generalPattern = /^[A-Z0-9/-]+$/;
    if (!generalPattern.test(license)) {
        return { isValid: false, message: "Pharmacy License contains invalid characters. Only alphanumeric, hyphens, and slashes allowed" };
    }

    const statePatterns: Record<string, RegExp> = {
        "DELHI": /^DL[/-]PH[/-]\d{4}[/-]\d{4,6}$/,
        "MAHARASHTRA": /^(MH|MAH)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
        "KARNATAKA": /^(KA|KAR)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
        "CHHATTISGARH": /^(CG|CT)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
        "GUJARAT": /^(GJ|GUJ)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
        "TAMIL NADU": /^(TN|TND)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
        "RAJASTHAN": /^(RJ|RAJ)[/-]?PH[/-]?\d{4}[/-]?\d{3,5}$/,
    };

    // If state is provided, validate against state-specific pattern
    if (state) {
        const stateUpper = state.trim().toUpperCase();
        const pattern = statePatterns[stateUpper];
        
        if (pattern && !pattern.test(license)) {
            return { 
                isValid: false, 
                message: `Pharmacy License format doesn't match ${state} state pattern` 
            };
        }
    }

    if (!license.includes('PH')) {
        return { 
            isValid: false, 
            message: "Pharmacy License must contain 'PH' identifier" 
        };
    }

    // Must contain at least one year-like number (4 consecutive digits)
    if (!/\d{4}/.test(license)) {
        return { 
            isValid: false, 
            message: "Pharmacy License must contain a year (4 digits)" 
        };
    }

    return { isValid: true, message: "Pharmacy License format is valid" };
};

/**
 * Validates Drug License Number format (optional additional license)
 * Format varies by state
 */
export const validateDrugLicenseFormat = (licenseNumber: string): { isValid: boolean; message: string } => {
    if (!licenseNumber) {
        return { isValid: true, message: "Drug License is optional" }; // Optional field
    }

    const license = licenseNumber.trim().toUpperCase();

    if (license.length < 8) {
        return { isValid: false, message: "Drug License Number is too short" };
    }

    const pattern = /^[A-Z0-9/-]+$/;
    if (!pattern.test(license)) {
        return { isValid: false, message: "Drug License contains invalid characters" };
    }

    return { isValid: true, message: "Drug License format is valid" };
};

/**
 * Validates Indian mobile phone number
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; message: string } => {
    if (!phone) {
        return { isValid: false, message: "Phone number is required" };
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
        return { 
            isValid: false, 
            message: "Invalid Indian phone number. Must be 10 digits starting with 6-9" 
        };
    }

    return { isValid: true, message: "Phone number is valid" };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): { isValid: boolean; message: string } => {
    if (!email) {
        return { isValid: false, message: "Email is required" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
        return { isValid: false, message: "Invalid email format" };
    }

    return { isValid: true, message: "Email is valid" };
};

/**
 * Validates Indian pincode format (6 digits)
 */
export const validatePincodeFormat = (pincode: string | number): { isValid: boolean; message: string } => {
    const pincodeStr = String(pincode).trim();

    if (!pincodeStr) {
        return { isValid: false, message: "Pincode is required" };
    }

    // Indian pincodes are 6 digits
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    
    if (!pincodeRegex.test(pincodeStr)) {
        return { 
            isValid: false, 
            message: "Invalid pincode format. Must be 6 digits and cannot start with 0" 
        };
    }

    return { isValid: true, message: "Pincode format is valid" };
};
