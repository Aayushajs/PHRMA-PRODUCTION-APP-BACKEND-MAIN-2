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

/**
 * ============================================================================
 * DYNAMIC FIELD VALIDATION HELPERS
 * ============================================================================
 * Reusable validation functions for checking required fields across services
 */

/**
 * Validates required fields in a flat object
 * @param data - The object to validate
 * @param requiredFields - Array of field names that must be present
 * @param objectName - Name of the object (for error messages)
 * @returns Validation result with list of missing fields
 * 
 * @example
 * const result = validateRequiredFields(
 *   req.body, 
 *   ['userId', 'email', 'name'], 
 *   'User'
 * );
 * if (!result.isValid) {
 *   throw new Error(`Missing: ${result.missingFields.join(', ')}`);
 * }
 */
export const validateRequiredFields = (
    data: any,
    requiredFields: string[],
    objectName: string = "Request"
): { isValid: boolean; missingFields: string[]; message?: string } => {
    if (!data || typeof data !== 'object') {
        return {
            isValid: false,
            missingFields: [objectName],
            message: `${objectName} is required and must be an object`
        };
    }

    const missingFields = requiredFields.filter(field => {
        const value = data[field];
        // Check for undefined, null, empty string, or empty array
        if (value === undefined || value === null || value === '') {
            return true;
        }
        // Check for empty arrays
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }
        return false;
    });

    return {
        isValid: missingFields.length === 0,
        missingFields,
        message: missingFields.length > 0 
            ? `Missing required fields: ${missingFields.join(', ')}`
            : undefined
    };
};

/**
 * Validates required fields in a nested object
 * @param obj - The nested object to validate
 * @param requiredFields - Array of field names that must be present in the nested object
 * @param objectName - Name of the nested object (for error messages)
 * @returns Validation result with list of missing fields (prefixed with objectName)
 * 
 * @example
 * const result = validateNestedObject(
 *   req.body.address,
 *   ['street', 'city', 'pincode'],
 *   'address'
 * );
 * if (!result.isValid) {
 *   throw new Error(result.message); // "Missing: address.street, address.city"
 * }
 */
export const validateNestedObject = (
    obj: any,
    requiredFields: string[],
    objectName: string
): { isValid: boolean; missingFields: string[]; message?: string } => {
    if (!obj || typeof obj !== 'object') {
        return {
            isValid: false,
            missingFields: [objectName],
            message: `${objectName} is required and must be an object`
        };
    }

    const missingFields = requiredFields.filter(field => {
        const value = obj[field];
        // Check for undefined, null, empty string, or empty array
        if (value === undefined || value === null || value === '') {
            return true;
        }
        // Check for empty arrays
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }
        return false;
    });

    const prefixedFields = missingFields.map(f => `${objectName}.${f}`);

    return {
        isValid: missingFields.length === 0,
        missingFields: prefixedFields,
        message: prefixedFields.length > 0 
            ? `Missing required fields: ${prefixedFields.join(', ')}`
            : undefined
    };
};

/**
 * Validates array of objects, ensuring each item has required fields
 * @param array - The array to validate
 * @param requiredFields - Array of field names that must be present in each item
 * @param arrayName - Name of the array (for error messages)
 * @returns Validation result with details of invalid items
 * 
 * @example
 * const result = validateArrayItems(
 *   req.body.orderItems,
 *   ['itemId', 'quantity'],
 *   'orderItems'
 * );
 * if (!result.isValid) {
 *   throw new Error(result.message); // "orderItems[2]: missing itemId, quantity"
 * }
 */
export const validateArrayItems = (
    array: any,
    requiredFields: string[],
    arrayName: string
): { isValid: boolean; errors: string[]; message?: string } => {
    if (!array || !Array.isArray(array)) {
        return {
            isValid: false,
            errors: [`${arrayName} must be an array`],
            message: `${arrayName} must be an array`
        };
    }

    if (array.length === 0) {
        return {
            isValid: false,
            errors: [`${arrayName} cannot be empty`],
            message: `${arrayName} cannot be empty`
        };
    }

    const errors: string[] = [];

    array.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
            errors.push(`${arrayName}[${index}] must be an object`);
            return;
        }

        const missingFields = requiredFields.filter(field => {
            const value = item[field];
            return value === undefined || value === null || value === '';
        });

        if (missingFields.length > 0) {
            errors.push(
                `${arrayName}[${index}]: missing ${missingFields.join(', ')}`
            );
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        message: errors.length > 0 ? errors.join('; ') : undefined
    };
};

/**
 * Validates that a value is within an enum
 * @param value - The value to validate
 * @param enumObj - The enum object
 * @param fieldName - Name of the field (for error messages)
 * @returns Validation result
 * 
 * @example
 * const result = validateEnum(
 *   req.body.status,
 *   OrderStatus,
 *   'status'
 * );
 * if (!result.isValid) {
 *   throw new Error(result.message); // "Invalid status. Allowed: pending, confirmed, ..."
 * }
 */
export const validateEnum = (
    value: any,
    enumObj: object,
    fieldName: string
): { isValid: boolean; message?: string; allowedValues?: string[] } => {
    const allowedValues = Object.values(enumObj);

    if (!allowedValues.includes(value)) {
        return {
            isValid: false,
            allowedValues: allowedValues as string[],
            message: `Invalid ${fieldName}. Allowed values: ${allowedValues.join(', ')}`
        };
    }

    return {
        isValid: true,
        allowedValues: allowedValues as string[]
    };
};
