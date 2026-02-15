/*
┌───────────────────────────────────────────────────────────────────────┐
│  Pincode Service - Validates pincode against city and state          │
│  Provides pincode lookup and validation using external APIs          │
└───────────────────────────────────────────────────────────────────────┘
*/

import axios from "axios";

export interface PincodeData {
    pincode: string;
    city: string;
    district: string;
    state: string;
    country: string;
    postOffices?: Array<{
        name: string;
        branchType: string;
        deliveryStatus: string;
        circle: string;
        district: string;
        division: string;
        region: string;
        state: string;
        country: string;
    }>;
}

export interface StateData {
    name: string;
    code: string;
    gstCode: number;
}

export interface CityData {
    name: string;
    state: string;
    district?: string;
}

/**
 * Indian States with GST codes
 */
export const INDIAN_STATES: StateData[] = [
    { name: "JAMMU AND KASHMIR", code: "JK", gstCode: 1 },
    { name: "HIMACHAL PRADESH", code: "HP", gstCode: 2 },
    { name: "PUNJAB", code: "PB", gstCode: 3 },
    { name: "CHANDIGARH", code: "CH", gstCode: 4 },
    { name: "UTTARAKHAND", code: "UT", gstCode: 5 },
    { name: "HARYANA", code: "HR", gstCode: 6 },
    { name: "DELHI", code: "DL", gstCode: 7 },
    { name: "RAJASTHAN", code: "RJ", gstCode: 8 },
    { name: "UTTAR PRADESH", code: "UP", gstCode: 9 },
    { name: "BIHAR", code: "BR", gstCode: 10 },
    { name: "SIKKIM", code: "SK", gstCode: 11 },
    { name: "ARUNACHAL PRADESH", code: "AR", gstCode: 12 },
    { name: "NAGALAND", code: "NL", gstCode: 13 },
    { name: "MANIPUR", code: "MN", gstCode: 14 },
    { name: "MIZORAM", code: "MZ", gstCode: 15 },
    { name: "TRIPURA", code: "TR", gstCode: 16 },
    { name: "MEGHALAYA", code: "ML", gstCode: 17 },
    { name: "ASSAM", code: "AS", gstCode: 18 },
    { name: "WEST BENGAL", code: "WB", gstCode: 19 },
    { name: "JHARKHAND", code: "JH", gstCode: 20 },
    { name: "ODISHA", code: "OR", gstCode: 21 },
    { name: "CHHATTISGARH", code: "CG", gstCode: 22 },
    { name: "MADHYA PRADESH", code: "MP", gstCode: 23 },
    { name: "GUJARAT", code: "GJ", gstCode: 24 },
    { name: "DAMAN AND DIU", code: "DD", gstCode: 25 },
    { name: "DADRA AND NAGAR HAVELI", code: "DN", gstCode: 26 },
    { name: "MAHARASHTRA", code: "MH", gstCode: 27 },
    { name: "KARNATAKA", code: "KA", gstCode: 29 },
    { name: "GOA", code: "GA", gstCode: 30 },
    { name: "LAKSHADWEEP", code: "LD", gstCode: 31 },
    { name: "KERALA", code: "KL", gstCode: 32 },
    { name: "TAMIL NADU", code: "TN", gstCode: 33 },
    { name: "PUDUCHERRY", code: "PY", gstCode: 34 },
    { name: "ANDAMAN AND NICOBAR ISLANDS", code: "AN", gstCode: 35 },
    { name: "TELANGANA", code: "TS", gstCode: 36 },
    { name: "ANDHRA PRADESH", code: "AP", gstCode: 37 },
    { name: "LADAKH", code: "LA", gstCode: 38 }
];

/**
 * Fetches pincode data from India Post API
 * @param pincode - 6-digit pincode
 * @returns Pincode data including city, district, and state
 */
export const fetchPincodeData = async (pincode: string | number): Promise<PincodeData | null> => {
    try {
        const pincodeStr = String(pincode).trim();
        
        // Use India Post API (free public API)
        const response = await axios.get(
            `https://api.postalpincode.in/pincode/${pincodeStr}`,
            { timeout: 5000 }
        );
        // console.log("Response : ", response);

        if (response.data && response.data[0]?.Status === "Success") {
            const postOffice = response.data[0].PostOffice[0];
            
            return {
                pincode: pincodeStr,
                city: postOffice.District || postOffice.Name,
                district: postOffice.District,
                state: postOffice.State,
                country: postOffice.Country,
                postOffices: response.data[0].PostOffice
            };
        }

        return null;
    } catch (error) {
        console.error("Error fetching pincode data:", error);
        return null;
    }
};

/**
 * Validates if pincode matches the provided city and state
 * @param pincode - 6-digit pincode
 * @param city - City name to validate
 * @param state - State name to validate
 * @returns Validation result with message
 */
export const validatePincodeMatch = async (
    pincode: string | number,
    city: string,
    state: string
): Promise<{ isValid: boolean; message: string; data?: PincodeData }> => {
    try {
        const pincodeData = await fetchPincodeData(pincode);

        if (!pincodeData) {
            return {
                isValid: false,
                message: "Invalid pincode or unable to verify. Please check the pincode."
            };
        }

        const normalizeString = (str: string) => 
            str.trim().toUpperCase().replace(/\s+/g, " ");

        const providedCity = normalizeString(city);
        const providedState = normalizeString(state);
        const actualCity = normalizeString(pincodeData.city);
        const actualDistrict = normalizeString(pincodeData.district);
        const actualState = normalizeString(pincodeData.state);

        if (actualState !== providedState) {
            return {
                isValid: false,
                message: `Pincode ${pincode} does not belong to ${state}. It belongs to ${pincodeData.state}.`,
                data: pincodeData
            };
        }

        const cityMatches = 
            actualCity === providedCity || 
            actualDistrict === providedCity ||
            actualCity.includes(providedCity) ||
            providedCity.includes(actualCity);

        if (!cityMatches) {
            return {
                isValid: false,
                message: `Pincode ${pincode} does not belong to ${city}. It belongs to ${pincodeData.district || pincodeData.city} district in ${pincodeData.state}.`,
                data: pincodeData
            };
        }

        return {
            isValid: true,
            message: "Pincode matches the provided city and state.",
            data: pincodeData
        };
    } catch (error) {
        console.error("Error validating pincode match:", error);
        return {
            isValid: false,
            message: "Unable to validate pincode. Please try again later."
        };
    }
};

/**
 * Get list of all Indian states
 */
export const getAllStates = (): StateData[] => {
    return INDIAN_STATES;
};

/**
 * Get state by GST code
 */
export const getStateByGSTCode = (gstCode: number): StateData | undefined => {
    return INDIAN_STATES.find(state => state.gstCode === gstCode);
};

/**
 * Get state by name
 */
export const getStateByName = (name: string): StateData | undefined => {
    const normalizedName = name.trim().toUpperCase();
    return INDIAN_STATES.find(state => 
        state.name === normalizedName || state.code === normalizedName
    );
};

/**
 * Fetches cities/districts for a given state using pincode ranges
 * Note: This is a simplified version. For production, consider using a proper database
 */
export const getCitiesByState = async (stateName: string): Promise<string[]> => {
    // For now, returning a message to use proper city database
    const state = getStateByName(stateName);
    
    if (!state) {
        return [];
    }

    // Common cities/districts by state (simplified - in production, use proper database)
    const stateCities: Record<string, string[]> = {
        "DELHI": ["CENTRAL DELHI", "EAST DELHI", "NEW DELHI", "NORTH DELHI", "NORTH EAST DELHI", "NORTH WEST DELHI", "SOUTH DELHI", "SOUTH EAST DELHI", "SOUTH WEST DELHI", "WEST DELHI"],
        "MAHARASHTRA": ["MUMBAI", "PUNE", "NAGPUR", "THANE", "NASHIK", "AURANGABAD", "SOLAPUR", "AMRAVATI", "KOLHAPUR", "SANGLI"],
        "KARNATAKA": ["BANGALORE", "MYSORE", "MANGALORE", "HUBLI", "BELGAUM", "GULBARGA", "SHIMOGA", "TUMKUR"],
        "TAMIL NADU": ["CHENNAI", "COIMBATORE", "MADURAI", "TRICHY", "SALEM", "TIRUNELVELI", "ERODE", "VELLORE"],
        "CHHATTISGARH": ["RAIPUR", "BILASPUR", "DURG", "BHILAI", "KORBA", "RAJNANDGAON", "RAIGARH", "DHAMTARI", "MAHASAMUND"],
        "UTTAR PRADESH": ["LUCKNOW", "KANPUR", "GHAZIABAD", "AGRA", "VARANASI", "MEERUT", "ALLAHABAD", "BAREILLY", "ALIGARH", "MORADABAD"],
        "WEST BENGAL": ["KOLKATA", "HOWRAH", "DURGAPUR", "ASANSOL", "SILIGURI", "BARDHAMAN", "MALDA", "BAHARAMPUR"],
        "RAJASTHAN": ["JAIPUR", "JODHPUR", "KOTA", "BIKANER", "UDAIPUR", "AJMER", "BHILWARA", "ALWAR"],
        "GUJARAT": ["AHMEDABAD", "SURAT", "VADODARA", "RAJKOT", "BHAVNAGAR", "JAMNAGAR", "JUNAGADH", "GANDHINAGAR"],
        "MADHYA PRADESH": ["INDORE", "BHOPAL", "JABALPUR", "GWALIOR", "UJJAIN", "SAGAR", "DEWAS", "SATNA"]
    };

    return stateCities[state.name] || [];
};

/**
 * Get pincode information for display
 */
export const getPincodeInfo = async (pincode: string | number): Promise<PincodeData | null> => {
    return await fetchPincodeData(pincode);
};
