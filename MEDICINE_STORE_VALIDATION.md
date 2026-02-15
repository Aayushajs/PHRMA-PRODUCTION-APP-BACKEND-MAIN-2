# Medicine Store Registration Validation - Quick Reference

## What's Implemented

Your medicine store registration API now includes comprehensive validation for:

### ✅ GST Number Verification
- Validates 15-character format (e.g., `22AAAAA0000A1Z5`)
- Checks state code validity (01-37)
- Verifies structure: 2 state code + 10 PAN + entity + Z + checksum

### ✅ Pharmacy License Verification
- Validates format with 'PH' identifier
- State-specific pattern matching
- Minimum 8 characters with year requirement
- Examples: `CG-PH-2023-12345`, `DL/PH/2021/12345`

### ✅ Pincode-City-State Matching (Your Example!)
**Example you mentioned: Dhamtari, Chhattisgarh - 493773**

The system now validates:
- ✅ Pincode `493773` matches city `DHAMTARI`
- ✅ Pincode `493773` matches state `CHHATTISGARH`
- ✅ Uses real India Post API for verification

**What happens if wrong:**
```
If user enters:
- Pincode: 493773
- City: DELHI
- State: DELHI

Error: "Pincode 493773 does not belong to DELHI. 
        It belongs to Dhamtari district in Chhattisgarh."
```

### ✅ Additional Features
- Get list of all Indian states (38 states/UTs with GST codes)
- Get cities/districts by state
- Get pincode information (returns city, district, state, post offices)

## API Endpoints

### 1. Register Store (with validation)
```http
POST /api/v2/medicine-store/register
```

### 2. Get States List
```http
GET /api/v2/medicine-store/states
```

### 3. Get Cities by State
```http
GET /api/v2/medicine-store/cities/CHHATTISGARH
```

### 4. Verify Pincode
```http
GET /api/v2/medicine-store/pincode/493773
```

## Testing Your Example

```bash
# 1. Check pincode 493773
curl http://localhost:3000/api/v2/medicine-store/pincode/493773

# Response will show:
# {
#   "pincode": "493773",
#   "district": "Dhamtari",
#   "state": "Chhattisgarh",
#   ...
# }

# 2. Register store with correct data (WILL PASS ✅)
curl -X POST http://localhost:3000/api/v2/medicine-store/register \
  -H "Content-Type: application/json" \
  -d '{
    "userName": "Rajesh Kumar",
    "email": "store@dhamtari.com",
    "phone": "9876543210",
    "storeName": "Dhamtari MediCare",
    "storeType": "Retail",
    "GSTNumber": "22AAAAA0000A1Z5",
    "pharmacyLicence": "CG-PH-2023-12345",
    "address": "Main Road",
    "city": "DHAMTARI",
    "state": "CHHATTISGARH",
    "pincode": "493773"
  }'

# 3. Try with wrong city (WILL FAIL ❌)
curl -X POST http://localhost:3000/api/v2/medicine-store/register \
  -H "Content-Type: application/json" \
  -d '{
    "city": "RAIPUR",
    "state": "CHHATTISGARH",
    "pincode": "493773",
    ...
  }'
# Error: "Pincode 493773 does not belong to RAIPUR"
```

## Files Created

1. `Utils/validators.ts` - GST, pharmacy license, pincode validators
2. `Utils/pincodeService.ts` - India Post API integration, state/city data
3. `Services/medicineStore.Service.ts` - Registration with validations
4. `Routers/Routers/medicineStore.Routes.ts` - Route definitions
5. `docs/MEDICINE_STORE_API.md` - Complete API documentation

## Full Documentation

See [docs/MEDICINE_STORE_API.md](./docs/MEDICINE_STORE_API.md) for:
- Complete API documentation
- All validation rules
- Example requests/responses
- Testing with cURL
- Implementation details

## How It Works

```
User Registration Flow:
┌─────────────────────────────────────────────────────┐
│ 1. User submits: Pincode 493773 + City DHAMTARI    │
│    + State CHHATTISGARH                             │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 2. System validates GST format, Pharmacy License    │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 3. System calls India Post API for pincode 493773  │
│    API returns: District=Dhamtari, State=CG         │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 4. System compares:                                 │
│    User's city: DHAMTARI ✅ matches Dhamtari       │
│    User's state: CHHATTISGARH ✅ matches CG        │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 5. ✅ All validations passed!                       │
│    Registration proceeds                            │
└─────────────────────────────────────────────────────┘
```

## Next Steps (TODO)

The validation is complete. You may want to add:
1. Database persistence (saving the store record)
2. Document upload (license images)
3. Owner verification (link to user account)
4. Email/SMS OTP verification
5. Admin approval workflow

---

🎉 **Your requirement is implemented!** The API now verifies GST, Pharmacy License, and validates that pincode 493773 truly belongs to Dhamtari district in Chhattisgarh state.
