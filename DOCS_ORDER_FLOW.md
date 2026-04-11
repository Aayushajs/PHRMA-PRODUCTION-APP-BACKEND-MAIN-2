# 📋 Industrial Order Management Procedure for E-Pharmacy

## 🚨 Critical Issues in Old Implementation

Your original implementation had **severe security and business logic flaws**:

### Security Vulnerabilities
1. ❌ **Client-side pricing** - Users could manipulate prices
2. ❌ **No inventory validation** - Could order out-of-stock items
3. ❌ **No payment verification** - Just accepted payment method
4. ❌ **Missing authentication** - Anyone could create orders
5. ❌ **No transaction handling** - Partial data on failures

### Business Logic Errors
1. ❌ Missing prescription validation for controlled medicines
2. ❌ No delivery address validation
3. ❌ No store verification (active, serviceable area)
4. ❌ No order ID generation
5. ❌ Missing required schema fields (subtotal, tax, delivery address)
6. ❌ No inventory updates after order placement
7. ❌ No notifications to users/stores
8. ❌ No coupon validation

---

## ✅ Proper Industrial Order Flow

### Phase 1: Pre-Order Validation (Client Side)
```
User Journey:
1. Browse medicines → Add to cart
2. View cart → Check delivery availability by pincode
3. Enter delivery address
4. Select payment method
5. Upload prescription (if required)
6. Apply coupon code (optional)
7. Review order summary
8. Place order
```

### Phase 2: Order Creation (Server Side)

#### Step 1: **Validate User & Authentication**
```typescript
// Verify JWT token
// Check if user exists and is active
// Verify user's email/phone is verified
```

#### Step 2: **Validate Medicine Store**
```typescript
// Check store exists
// Verify store is active and verified
// Check store's license validity
// Verify store delivers to customer's pincode
// Check store operating hours
```

#### Step 3: **Validate Order Items (CRITICAL)**
```typescript
for each item in orderItems:
    // Fetch item from database - NEVER trust client data
    item = await ItemModel.findById(itemId)
    
    // Verify item exists
    if (!item) → reject order
    
    // Verify item belongs to selected store
    if (item.medicineStoreId !== selectedStoreId) → reject
    
    // Check stock availability
    if (item.stock < requestedQuantity) → reject
    
    // Check expiry date
    if (item.expiryDate <= today) → reject
    
    // SERVER-SIDE PRICE CALCULATION (CRITICAL)
    unitPrice = item.itemFinalPrice  // From database, not client
    discount = item.itemDiscount || 0
    gstRate = item.itemGST.percentage || 0
    
    priceAfterDiscount = unitPrice - (unitPrice * discount / 100)
    gstAmount = (priceAfterDiscount * gstRate) / 100
    totalItemPrice = (priceAfterDiscount + gstAmount) * quantity
    
    // Check if prescription required
    if (item.prescriptionRequired) {
        prescriptionNeeded = true
    }
```

**Why server-side pricing?**
- Client can modify JavaScript/request data
- Prevents fraud and price manipulation
- Ensures tax calculation accuracy
- Maintains pricing consistency

#### Step 4: **Validate Prescription**
```typescript
if (prescriptionNeeded && !prescriptionFile) {
    return error("Prescription required")
}

if (prescriptionFile) {
    // Validate file format (PDF, JPG, PNG)
    // Check file size (< 5MB)
    // Upload to secure storage (Cloudinary, S3)
    // Mark for manual verification by pharmacist
    prescriptionUrl = await uploadToCloudinary(prescriptionFile)
}
```

#### Step 5: **Validate & Apply Coupon**
```typescript
if (couponCode) {
    coupon = await CouponModel.findOne({ code: couponCode })
    
    // Validate coupon
    if (!coupon) → reject
    if (coupon.expiryDate < today) → reject
    if (coupon.usageCount >= coupon.maxUsage) → reject
    if (subtotal < coupon.minOrderValue) → reject
    if (coupon.applicableStores && !includes(storeId)) → reject
    
    // Check user eligibility
    if (coupon.firstOrderOnly && userHasOrders) → reject
    if (coupon.usagePerUser) {
        userUsageCount = await OrderModel.countDocuments({
            userId: userId,
            couponCode: couponCode
        })
        if (userUsageCount >= coupon.usagePerUser) → reject
    }
    
    // Calculate discount
    if (coupon.type === "PERCENTAGE") {
        discount = (subtotal * coupon.value / 100)
        if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount)
        }
    } else if (coupon.type === "FLAT") {
        discount = coupon.value
    }
}
```

#### Step 6: **Calculate Shipping Cost**
```typescript
// Calculate distance between store and delivery address
distance = calculateDistance(storeLocation, deliveryLocation)

// Base shipping cost
if (subtotal >= freeShippingThreshold) {
    shippingCost = 0
} else if (distance <= 5) {
    shippingCost = 40
} else if (distance <= 10) {
    shippingCost = 60
} else {
    shippingCost = 80
}

// Add express delivery charges
if (shippingMethod === "EXPRESS") {
    shippingCost += 100
}
```

#### Step 7: **Calculate Final Order Total**
```typescript
subtotal = sum of all item prices (before discount)
itemLevelDiscounts = sum of all item discounts
couponDiscount = discount from coupon code
totalDiscount = itemLevelDiscounts + couponDiscount

taxAmount = sum of all GST amounts
shippingCost = calculated shipping cost

totalAmount = subtotal - totalDiscount + taxAmount + shippingCost
```

#### Step 8: **Initiate Payment**
```typescript
if (paymentMethod === "CASH_ON_DELIVERY") {
    // No payment gateway needed
    paymentStatus = "PENDING"
    orderStatus = "PENDING"  // Wait for COD confirmation
    
} else {
    // Integrate with payment gateway (Razorpay, Stripe, PhonePe)
    
    // Razorpay example:
    const razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100,  // in paisa
        currency: "INR",
        receipt: orderId,
        notes: {
            orderId: orderId,
            userId: userId
        }
    })
    
    paymentStatus = "PENDING"
    orderStatus = "PENDING"  // Wait for payment success
    paymentId = razorpayOrder.id
    
    // Return payment details to client
    return {
        orderId,
        paymentId,
        amount: totalAmount,
        // Client will open Razorpay modal to complete payment
    }
}
```

#### Step 9: **Create Order with Transaction**
```typescript
// Start database transaction (ACID compliance)
const session = await mongoose.startSession()
session.startTransaction()

try {
    // 1. Create order
    const order = await OrderModel.create([{
        orderId: generateUniqueOrderId(),
        userId,
        medicineStoreId,
        orderItems: validatedItems,
        subtotal,
        discount,
        taxAmount,
        shippingCost,
        totalAmount,
        deliveryAddress,
        billingAddress,
        paymentMethod,
        paymentStatus,
        paymentId,
        orderStatus,
        prescriptionFile: prescriptionUrl,
        prescriptionRequired: prescriptionNeeded,
        couponCode,
        // ... other fields
    }], { session })
    
    // 2. Update item inventory
    for (const item of orderItems) {
        await ItemModel.findByIdAndUpdate(
            item.itemId,
            { 
                $inc: { 
                    stock: -item.quantity,
                    totalOrders: 1  // Track popularity
                } 
            },
            { session }
        )
    }
    
    // 3. Update coupon usage (if applicable)
    if (couponCode) {
        await CouponModel.findOneAndUpdate(
            { code: couponCode },
            { $inc: { usageCount: 1 } },
            { session }
        )
    }
    
    // Commit transaction
    await session.commitTransaction()
    
    // Success!
    
} catch (error) {
    // Rollback all changes on error
    await session.abortTransaction()
    throw error
    
} finally {
    session.endSession()
}
```

**Why use transactions?**
- Ensures all-or-nothing operation
- Prevents inventory mismatch
- Maintains data consistency
- Handles concurrent orders safely

#### Step 10: **Send Notifications**
```typescript
// Notify customer
await notificationService.sendToUser({
    userId,
    title: "Order Placed Successfully! 🎉",
    body: `Your order #${orderId} has been placed. Total: ₹${totalAmount}`,
    data: {
        orderId,
        type: "order_placed",
        screen: "OrderDetails"
    }
})

// Notify store
await notificationService.sendToUser({
    userId: storeOwnerId,
    title: "New Order Received",
    body: `New order #${orderId} for ₹${totalAmount}`,
    data: {
        orderId,
        type: "new_order",
        screen: "StoreOrderDetails"
    }
})

// Send email confirmation
await emailService.sendOrderConfirmation(userId, order)

// Send SMS (for high-value orders or prescription items)
if (prescriptionRequired || totalAmount > 1000) {
    await smsService.sendOrderConfirmation(userPhone, orderId)
}
```

#### Step 11: **Queue Background Jobs**
```typescript
// Add to job queue (using Bull, BullMQ, or similar)

// 1. Generate invoice PDF
await invoiceQueue.add('generate-invoice', {
    orderId: order._id
})

// 2. Send to prescription verification queue (if applicable)
if (prescriptionRequired) {
    await prescriptionQueue.add('verify-prescription', {
        orderId: order._id,
        prescriptionUrl
    })
}

// 3. Update analytics
await analyticsQueue.add('update-analytics', {
    eventType: 'order_created',
    orderId,
    userId,
    storeId,
    amount: totalAmount
})
```

---

## Phase 3: Payment Webhook Handling

When payment gateway calls your webhook:

```typescript
// POST /api/v1/orders/payment-webhook
// Verify webhook signature (CRITICAL for security)
const isValid = verifyPaymentSignature(req.body, req.headers['x-signature'])
if (!isValid) {
    return res.status(400).send("Invalid signature")
}

const { orderId, paymentId, status } = req.body

// Update order in database
const session = await mongoose.startSession()
session.startTransaction()

try {
    const order = await OrderModel.findOne({ orderId })
    
    if (status === "SUCCESS") {
        order.paymentStatus = "COMPLETED"
        order.paymentDate = new Date()
        order.orderStatus = "CONFIRMED"
        order.confirmedDate = new Date()
        
        // Notify customer
        await notificationService.sendToUser({
            userId: order.userId,
            title: "Payment Successful ✅",
            body: "Your order is confirmed and being processed",
            data: { orderId, type: "payment_success" }
        })
        
    } else if (status === "FAILED") {
        // Restore inventory
        for (const item of order.orderItems) {
            await ItemModel.findByIdAndUpdate(
                item.itemId,
                { $inc: { stock: item.quantity } },
                { session }
            )
        }
        
        order.paymentStatus = "FAILED"
        order.orderStatus = "FAILED"
        
        // Notify customer
        await notificationService.sendToUser({
            userId: order.userId,
            title: "Payment Failed ❌",
            body: "Please try again or choose another payment method",
            data: { orderId, type: "payment_failed" }
        })
    }
    
    await order.save({ session })
    await session.commitTransaction()
    
} catch (error) {
    await session.abortTransaction()
    throw error
} finally {
    session.endSession()
}

return res.status(200).send("OK")
```

---

## Phase 4: Order Fulfillment (Store Side)

### Step 1: Store Reviews Order
```
Store dashboard shows new order
Store verifies prescription (if required)
Store checks medicine availability
Store can accept/reject order
```

### Step 2: Order Processing
```
Store status: CONFIRMED → PROCESSING
- Store picks items from inventory
- Double-checks expiry dates
- Packages medicines properly
- Prints invoice and label
- Marks order as ready for pickup
```

### Step 3: Order Dispatch
```
Store status: PROCESSING → SHIPPED
- Delivery partner assigned
- Tracking number generated
- Customer notified with tracking link
- Estimated delivery time shared
```

### Step 4: Delivery
```
Delivery status: SHIPPED → OUT_FOR_DELIVERY
- Customer gets nearby notification
- Delivery partner calls if needed
- OTP verification for delivery
- Photo proof of delivery
```

### Step 5: Completed
```
Status: OUT_FOR_DELIVERY → DELIVERED
- Order marked as delivered
- Payment settled to store (if prepaid)
- Customer can rate and review
- Request for feedback
```

---

## Phase 5: Post-Order Operations

### Order Cancellation
```typescript
// User can cancel before SHIPPED status
if (orderStatus in ["PENDING", "CONFIRMED", "PROCESSING"]) {
    // Restore inventory
    // Initiate refund (if paid)
    // Update order status to CANCELLED
    // Notify store and customer
}
```

### Order Return
```typescript
// User can return within 7 days (for sealed items)
if (deliveredDate < 7 days ago && item.isSealed) {
    // Create return request
    // Pharmacist verification required
    // Pickup scheduled
    // Refund initiated after verification
}
```

### Refund Processing
```typescript
if (refundRequired) {
    // Razorpay refund
    const refund = await razorpay.payments.refund(paymentId, {
        amount: refundAmount * 100,
        notes: {
            orderId,
            reason: cancellationReason
        }
    })
    
    order.refundStatus = "COMPLETED"
    order.refundTransactionId = refund.id
    order.refundAmount = refundAmount
    
    // Notify customer
    await notificationService.sendToUser({
        userId,
        title: "Refund Processed",
        body: `₹${refundAmount} will be credited in 5-7 business days`
    })
}
```

---

## 🔒 Security Best Practices

### 1. **Price Integrity**
```typescript
// ❌ NEVER do this:
const totalAmount = req.body.totalAmount  // Client can manipulate

// ✅ ALWAYS calculate server-side:
const totalAmount = calculateTotalFromDatabase(orderItems)
```

### 2. **Authentication & Authorization**
```typescript
// Every order endpoint must have:
router.post('/orders', 
    authenticateUser,     // Verify JWT token
    validateUser,         // Check user is active
    createOrder           // Then process order
)

// Store endpoints need store authorization:
router.patch('/orders/:id/status',
    authenticateUser,
    authorizeStore,       // Verify user owns the store
    updateOrderStatus
)
```

### 3. **Input Validation**
```typescript
// Validate all inputs using Joi/Zod
const orderSchema = Joi.object({
    orderItems: Joi.array().items(
        Joi.object({
            itemId: Joi.string().required(),
            quantity: Joi.number().integer().min(1).max(100).required()
        })
    ).min(1).required(),
    deliveryAddress: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        // ... other fields
    }).required(),
    // ... other fields
})

const { error, value } = orderSchema.validate(req.body)
if (error) {
    return next(new ApiError(400, error.details[0].message))
}
```

### 4. **Rate Limiting**
```typescript
// Prevent order spam
import rateLimit from 'express-rate-limit'

const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                      // 5 orders per 15 min
    message: "Too many orders, please try again later"
})

router.post('/orders', orderLimiter, createOrder)
```

### 5. **Webhook Signature Verification**
```typescript
// ALWAYS verify payment gateway webhooks
function verifyRazorpaySignature(body: any, signature: string): boolean {
    const crypto = require('crypto')
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest('hex')
    
    return expectedSignature === signature
}

// In webhook handler:
if (!verifyRazorpaySignature(req.body, req.headers['x-razorpay-signature'])) {
    return res.status(400).send("Invalid signature")
}
```

---

## 📊 Database Indexes for Performance

```typescript
// Order Schema Indexes
orderSchema.index({ orderId: 1 }, { unique: true })
orderSchema.index({ userId: 1, orderDate: -1 })
orderSchema.index({ medicineStoreId: 1, orderStatus: 1 })
orderSchema.index({ orderStatus: 1, orderDate: -1 })
orderSchema.index({ paymentStatus: 1 })
orderSchema.index({ 'deliveryAddress.pincode': 1 })

// For analytics queries
orderSchema.index({ orderDate: -1, orderStatus: 1 })
orderSchema.index({ medicineStoreId: 1, orderDate: -1 })
```

---

## 🔄 Complete Order State Machine

```
PENDING
  ↓
CONFIRMED (after payment success)
  ↓
PROCESSING (store is preparing order)
  ↓
SHIPPED (handed to delivery partner)
  ↓
OUT_FOR_DELIVERY (nearby customer)
  ↓
DELIVERED (successfully delivered)

Side paths:
PENDING → FAILED (payment failed)
PENDING/CONFIRMED/PROCESSING → CANCELLED (before shipment)
DELIVERED → RETURNED (return initiated)
```

---

## 📱 API Request/Response Examples

### Create Order Request
```json
POST /api/v1/orders

{
  "userId": "507f1f77bcf86cd799439011",
  "medicineStoreId": "507f1f77bcf86cd799439012",
  "orderItems": [
    {
      "itemId": "507f1f77bcf86cd799439013",
      "quantity": 2
    }
  ],
  "deliveryAddress": {
    "street": "123 Main Street",
    "area": "Koramangala",
    "city": "Bangalore",
    "state": "Karnataka",
    "pincode": 560034,
    "landmark": "Near Cafe Coffee Day",
    "recipientName": "John Doe",
    "recipientPhone": "9876543210"
  },
  "paymentMethod": "upi",
  "prescriptionFile": "https://cloudinary.com/...",
  "couponCode": "FIRST50",
  "shippingMethod": "standard",
  "specialInstructions": "Please call before delivery"
}
```

### Create Order Response (Success)
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order": {
      "orderId": "ORD17093847562341",
      "userId": "507f1f77bcf86cd799439011",
      "medicineStoreId": "507f1f77bcf86cd799439012",
      "orderItems": [...],
      "subtotal": 500,
      "discount": 50,
      "taxAmount": 40.50,
      "shippingCost": 40,
      "totalAmount": 530.50,
      "orderStatus": "PENDING",
      "paymentStatus": "PENDING",
      "orderDate": "2026-02-26T10:30:00.000Z",
      "estimatedDeliveryDate": "2026-03-03T10:30:00.000Z"
    },
    "paymentRequired": true,
    "paymentId": "order_MAbcdEFGHijk123",
    "nextStep": "Complete payment to confirm order"
  }
}
```

---

## 🎯 Implementation Checklist

- [x] Server-side price calculation
- [x] Inventory validation and updates
- [x] Transaction handling (ACID compliance)
- [x] User and store validation
- [x] Delivery address validation
- [x] Order ID generation
- [x] Payment status tracking
- [x] Notification system integration
- [ ] Payment gateway integration (Razorpay/Stripe)
- [ ] Coupon system implementation
- [ ] Prescription verification workflow
- [ ] Invoice generation (PDF)
- [ ] Delivery tracking integration
- [ ] Return and refund processing
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Analytics and reporting
- [ ] Admin dashboard for monitoring

---

## 🚀 Next Steps

1. **Integrate Payment Gateway**
   - Sign up for Razorpay/Stripe
   - Implement payment creation
   - Set up webhook handling
   - Test payment flows

2. **Implement Coupon System**
   - Create Coupon schema
   - Build coupon validation logic
   - Add coupon management APIs

3. **Build Prescription Verification**
   - Create pharmacist dashboard
   - Implement OCR for prescription reading
   - Add approval/rejection workflow

4. **Add Order Tracking**
   - Integrate with delivery partners
   - Real-time location updates
   - ETA calculations

5. **Set up Monitoring**
   - Order success/failure rates
   - Payment success rates
   - Average order processing time
   - Customer satisfaction scores

---

## 📚 Additional Resources

- [Razorpay Integration Guide](https://razorpay.com/docs/)
- [Stripe India Guide](https://stripe.com/docs/india)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)
- [E-Pharmacy Regulations in India](https://cdsco.gov.in/)

---

**Remember:** E-pharmacy is a highly regulated industry. Always:
- Verify prescriptions for Schedule H/X drugs
- Maintain audit trails
- Comply with data privacy laws (GDPR, DPDPA)
- Implement proper security measures
- Have a qualified pharmacist review orders
