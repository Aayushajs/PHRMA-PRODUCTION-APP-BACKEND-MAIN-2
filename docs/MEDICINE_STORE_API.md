# Medicine Store Registration API Documentation

## Overview
This API provides comprehensive validation for medicine store/pharmacy registration in India, including:
- GST Number format and verification
- Pharmacy License validation
- Pincode-City-State matching verification
- State and city listing endpoints

## Base URL
```
http://localhost:PORT/api/v2/medicine-store
```

---

## Endpoints

### 1. Register Medicine Store
Register a new pharmacy/medicine store with complete verification.

**Endpoint:** `POST /register`

**Request Body:**
```json
{
  "userName": "Rajesh Kumar",
  "email": "rajesh@pharmacy.com",
  "phone": "9876543210",
  "storeName": "MediCare Pharmacy",
  "storeType": "Retail",
  "GSTNumber": "22AAAAA0000A1Z5",
  "pharmacyLicence": "CG-PH-2023-12345",
  "address": "Shop No. 5, Main Road",
  "city": "DHAMTARI",
  "state": "CHHATTISGARH",
  "pincode": "493773"
}
```

**Field Descriptions:**
- `userName`: Owner/Manager name (required)
- `email`: Valid email address (required)
- `phone`: Indian mobile number (10 digits, starting with 6-9) (required)
- `storeName`: Name of the pharmacy/store (required)
- `storeType`: "Retail", "Wholesale", or "Both" (required)
- `GSTNumber`: 15-character GST Number (format: 22AAAAA0000A1Z5) (required)
- `pharmacyLicence`: Pharmacy license number (format varies by state) (required)
- `address`: Street address (required)
- `city`: City or District name (required)
- `state`: State name (required)
- `pincode`: 6-digit Indian pincode (required)

**Validations Performed:**
1. ✅ All required fields present
2. ✅ Email format validation
3. ✅ Phone number format (Indian mobile)
4. ✅ GST Number format validation
   - Must be 15 characters
   - Format: 2 state code + 10 PAN + 1 entity + Z + 1 checksum
   - State code must be valid (01-37)
   - 13th character must be 'Z'
5. ✅ Pharmacy License format validation
   - Minimum 8 characters
   - Must contain 'PH' identifier
   - Must contain a year (4 digits)
   - State-specific pattern matching (where applicable)
6. ✅ Pincode format validation (6 digits, cannot start with 0)
7. ✅ **Pincode-City-State match verification using India Post API**
   - Verifies pincode belongs to the specified state
   - Verifies pincode belongs to the specified city/district
8. ✅ Duplicate check (GST Number, Pharmacy License, Email, Phone)

**Success Response (200):**
```json
{
  "success": true,
  "message": "All validations passed successfully",
  "statusCode": 200,
  "data": {
    "userName": "Rajesh Kumar",
    "email": "rajesh@pharmacy.com",
    "phone": "9876543210",
    "storeName": "MediCare Pharmacy",
    "storeType": "Retail",
    "GSTNumber": "22AAAAA0000A1Z5",
    "pharmacyLicence": "CG-PH-2023-12345",
    "verifiedLocation": {
      "pincode": "493773",
      "city": "Dhamtari",
      "district": "Dhamtari",
      "state": "Chhattisgarh",
      "country": "India",
      "postOffices": [...]
    }
  },
  "timestamp": "2026-02-13T10:30:00.000Z"
}
```

**Error Responses:**

400 Bad Request - Missing Fields:
```json
{
  "success": false,
  "message": "Missing required fields: email, phone",
  "statusCode": 400
}
```

400 Bad Request - Invalid GST:
```json
{
  "success": false,
  "message": "Invalid GST Number format. Expected format: 22AAAAA0000A1Z5",
  "statusCode": 400
}
```

400 Bad Request - Pincode Mismatch:
```json
{
  "success": false,
  "message": "Pincode 493773 does not belong to DELHI. It belongs to Dhamtari district in Chhattisgarh.",
  "statusCode": 400
}
```

409 Conflict - Duplicate:
```json
{
  "success": false,
  "message": "A store with this GST Number is already registered",
  "statusCode": 409
}
```

---

### 2. Get All States
Get list of all Indian states with their GST codes.

**Endpoint:** `GET /states`

**Success Response (200):**
```json
{
  "success": true,
  "message": "States fetched successfully",
  "statusCode": 200,
  "data": [
    {
      "name": "DELHI",
      "code": "DL",
      "gstCode": 7
    },
    {
      "name": "MAHARASHTRA",
      "code": "MH",
      "gstCode": 27
    },
    {
      "name": "CHHATTISGARH",
      "code": "CG",
      "gstCode": 22
    }
    // ... all 38 states/UTs
  ],
  "timestamp": "2026-02-13T10:30:00.000Z"
}
```

---

### 3. Get Cities by State
Get list of major cities/districts for a specific state.

**Endpoint:** `GET /cities/:state`

**Path Parameters:**
- `state`: State name (e.g., "CHHATTISGARH", "DELHI", "MAHARASHTRA")

**Example Request:**
```
GET /cities/CHHATTISGARH
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cities fetched successfully",
  "statusCode": 200,
  "data": {
    "state": "CHHATTISGARH",
    "cities": [
      "RAIPUR",
      "BILASPUR",
      "DURG",
      "BHILAI",
      "KORBA",
      "RAJNANDGAON",
      "RAIGARH",
      "DHAMTARI",
      "MAHASAMUND"
    ]
  },
  "timestamp": "2026-02-13T10:30:00.000Z"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "No cities found for the specified state",
  "statusCode": 404
}
```

---

### 4. Get Pincode Information
Get detailed information about a pincode including city, district, state, and post offices.

**Endpoint:** `GET /pincode/:pincode`

**Path Parameters:**
- `pincode`: 6-digit Indian pincode

**Example Request:**
```
GET /pincode/493773
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Pincode information fetched successfully",
  "statusCode": 200,
  "data": {
    "pincode": "493773",
    "city": "Dhamtari",
    "district": "Dhamtari",
    "state": "Chhattisgarh",
    "country": "India",
    "postOffices": [
      {
        "name": "Dhamtari H.O",
        "branchType": "Head Office",
        "deliveryStatus": "Delivery",
        "circle": "Chattisgarh",
        "district": "Dhamtari",
        "division": "Dhamtari",
        "region": "Raipur",
        "state": "Chhattisgarh",
        "country": "India"
      }
    ]
  },
  "timestamp": "2026-02-13T10:30:00.000Z"
}
```

**Error Responses:**

400 Bad Request - Invalid Format:
```json
{
  "success": false,
  "message": "Invalid pincode format. Must be 6 digits and cannot start with 0",
  "statusCode": 400
}
```

404 Not Found:
```json
{
  "success": false,
  "message": "Pincode not found or invalid",
  "statusCode": 404
}
```

---

## Validation Rules

### GST Number Format
- **Length:** Exactly 15 characters
- **Format:** `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`
- **Example:** `22AAAAA0000A1Z5`
- **Rules:**
  - First 2 digits: State code (01-37)
  - Next 10 characters: PAN
  - 12th character: Entity number
  - 13th character: Must be 'Z'
  - 14th character: Checksum

### Pharmacy License Format
- **Minimum Length:** 8 characters
- **Must Include:** 'PH' identifier
- **Must Include:** Year (4 consecutive digits)
- **Characters Allowed:** Alphanumeric, hyphens, slashes
- **State-Specific Patterns:**
  - Delhi: `DL/PH/2021/12345`
  - Maharashtra: `MH-PH-2021-1234`
  - Karnataka: `KA-PH-2021-1234`
  - Chhattisgarh: `CG-PH-2023-12345`
  - And more...

### Phone Number Format
- **Format:** `[6-9][0-9]{9}`
- **Length:** 10 digits
- **First Digit:** Must be 6, 7, 8, or 9
- **Optional:** Can include +91 or 91 prefix
- **Example:** `9876543210`, `+919876543210`

### Email Format
- Standard email validation
- Must contain @ and domain
- Example: `user@example.com`

### Pincode Format
- **Length:** Exactly 6 digits
- **Format:** `[1-9][0-9]{5}`
- **Cannot Start With:** 0
- **Example:** `493773`, `110001`

---

## Example: Complete Registration Flow

### Step 1: Get States List
```bash
GET /api/v2/medicine-store/states
```

### Step 2: Get Cities for Selected State
```bash
GET /api/v2/medicine-store/cities/CHHATTISGARH
```

### Step 3: Verify Pincode (Optional)
```bash
GET /api/v2/medicine-store/pincode/493773
```

### Step 4: Register Store
```bash
POST /api/v2/medicine-store/register
Content-Type: application/json

{
  "userName": "Rajesh Kumar",
  "email": "rajesh@pharmacy.com",
  "phone": "9876543210",
  "storeName": "MediCare Pharmacy",
  "storeType": "Retail",
  "GSTNumber": "22AAAAA0000A1Z5",
  "pharmacyLicence": "CG-PH-2023-12345",
  "address": "Shop No. 5, Main Road",
  "city": "DHAMTARI",
  "state": "CHHATTISGARH",
  "pincode": "493773"
}
```

---

## Testing with cURL

### Test State Listing
```bash
curl -X GET http://localhost:3000/api/v2/medicine-store/states
```

### Test City Listing
```bash
curl -X GET http://localhost:3000/api/v2/medicine-store/cities/CHHATTISGARH
```

### Test Pincode Verification
```bash
curl -X GET http://localhost:3000/api/v2/medicine-store/pincode/493773
```

### Test Store Registration
```bash
curl -X POST http://localhost:3000/api/v2/medicine-store/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Rajesh Kumar",
    "email": "rajesh@pharmacy.com",
    "phone": "9876543210",
    "storeName": "MediCare Pharmacy",
    "storeType": "Retail",
    "GSTNumber": "22AAAAA0000A1Z5",
    "pharmacyLicence": "CG-PH-2023-12345",
    "address": "Shop No. 5, Main Road",
    "city": "DHAMTARI",
    "state": "CHHATTISGARH",
    "pincode": "493773"
  }'
```

---

## Implementation Details

### Files Created/Modified

1. **Utils/validators.ts**
   - GST Number validation
   - Pharmacy License validation
   - Pincode format validation
   - Phone number validation
   - Email validation

2. **Utils/pincodeService.ts**
   - India Post API integration
   - Pincode-City-State matching
   - State and city listing
   - All 38 Indian states data

3. **Services/medicineStore.Service.ts**
   - Complete registration logic with validations
   - State listing endpoint
   - City listing endpoint
   - Pincode info endpoint

4. **Routers/Routers/medicineStore.Routes.ts**
   - Route definitions for all endpoints

5. **Routers/main.Routes.ts**
   - Integration of medicine store routes

### External API Used
- **India Post API:** `https://api.postalpincode.in/pincode/{pincode}`
  - Free public API
  - Real-time pincode verification
  - Provides district, city, state information
  - Lists all post offices for a pincode

---

## Notes

1. **Pincode Verification:** The system uses India Post's public API to verify pincodes in real-time. This ensures that the pincode, city, and state combination is accurate.

2. **GST Verification:** Currently validates format only. For production, consider integrating with GST verification APIs for real-time GST number validation.

3. **Pharmacy License:** Format validation is implemented. For production, consider integrating with state pharmacy council APIs for actual license verification.

4. **Database Persistence:** The current implementation includes validation only. Database persistence (creating the store record) is marked as TODO and should be implemented next.

5. **City Database:** Currently uses a simplified list of major cities. For production, consider using a comprehensive database of all cities/districts.

---

## Future Enhancements

1. Integrate with GSTIN verification API
2. Integrate with State Pharmacy Council APIs for license verification
3. Complete database persistence implementation
4. Add image upload for license documents
5. Implement OTP verification for phone and email
6. Add store approval workflow
7. Email notifications for registration status
8. Add comprehensive city/district database

---

## Error Handling

All endpoints use consistent error handling:
- 400: Bad Request (validation errors)
- 404: Not Found (resource doesn't exist)
- 409: Conflict (duplicate entry)
- 500: Internal Server Error (server issues)

Each error response includes:
- `success`: false
- `message`: Human-readable error description
- `statusCode`: HTTP status code
- `timestamp`: ISO timestamp
