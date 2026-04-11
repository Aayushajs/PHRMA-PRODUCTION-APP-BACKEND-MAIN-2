# 🚀 Implementation Guide - Missing Features

## ✅ What's Been Implemented

- ✅ Complete order creation flow with validation
- ✅ Server-side price calculation (CRITICAL for security)
- ✅ User and medicine store validation
- ✅ Delivery address validation
- ✅ Order ID generation
- ✅ Payment status tracking
- ✅ Order status management
- ✅ Order cancellation
- ✅ Notification system integration
- ✅ Transaction handling (ACID compliance)
- ✅ Multiple order retrieval endpoints

## ⚠️ Features Marked as TODO (Need Implementation)

### 1. **Stock Management System** (HIGH PRIORITY)

Currently commented out because the Item schema doesn't have stock fields.

#### Required Changes to Item Schema/Interface:

Add to [item.Interface.ts](Databases/Entities/item.Interface.ts):
```typescript
export interface Iitem {
  // ... existing fields ...
  
  // Add these fields:
  stock?: number;              // Current available stock
  reservedStock?: number;      // Stock reserved for pending orders
  minimumStock?: number;       // Alert threshold
  maximumStock?: number;       // Maximum storage capacity
  stockUnit?: string;          // Unit of measurement (pieces, boxes, strips)
}
```

Add to [items.Schema.ts](Databases/Schema/items.Schema.ts):
```typescript
stock: {
    type: Number,
    default: 0,
    min: [0, "Stock cannot be negative"],
},
reservedStock: {
    type: Number,
    default: 0,
    min: [0, "Reserved stock cannot be negative"],
},
minimumStock: {
    type: Number,
    default: 10,
},
maximumStock: {
    type: Number,
    default: 1000,
},
stockUnit: {
    type: String,
    default: "pieces",
    enum: ["pieces", "strips", "boxes", "bottles", "vials"]
},
```

Once added, uncomment these lines in [order.Service.ts](Services/order.Service.ts):
- Line 118-121: Stock availability check
- Line 229-241: Inventory update after order creation
- Line 400-408: Inventory restore on payment failure
- Line 487-494: Inventory restore on order cancellation

---

### 2. **Prescription Requirement Flag** (HIGH PRIORITY for Compliance)

#### Required Changes:

Add to [item.Interface.ts](Databases/Entities/item.Interface.ts):
```typescript
export interface Iitem {
  // ... existing fields ...
  
  // Add this field:
  prescriptionRequired?: boolean;  // Whether prescription is mandatory
  prescriptionType?: 'Schedule H' | 'Schedule H1' | 'Schedule X' | 'OTC';
}
```

Add to [items.Schema.ts](Databases/Schema/items.Schema.ts):
```typescript
prescriptionRequired: {
    type: Boolean,
    default: false,
},
prescriptionType: {
    type: String,
    enum: ['Schedule H', 'Schedule H1', 'Schedule X', 'OTC'],
    default: 'OTC',
},
```

Once added, uncomment these lines in [order.Service.ts](Services/order.Service.ts):
- Line 128-131: Prescription requirement check

---

### 3. **Store Operating Hours Check**

Add to [order.Service.ts](Services/order.Service.ts) after line 93:
```typescript
// Check store operating hours
const now = new Date();
const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof typeof medicineStore.operatingHours;

if (!medicineStore.is24x7 && medicineStore.operatingHours) {
    const todayHours = medicineStore.operatingHours[dayOfWeek];
    
    if (todayHours?.isClosed) {
        return next(new ApiError(400, "Store is closed today"));
    }
    
    if (todayHours?.open && todayHours?.close) {
        const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
        
        if (currentTime < todayHours.open || currentTime > todayHours.close) {
            return next(new ApiError(400, `Store is closed. Operating hours: ${todayHours.open} - ${todayHours.close}`));
        }
    }
}
```

---

### 4. **Delivery Pincode Serviceability Check**

This requires a separate collection/table for serviceable areas.

#### Create Serviceable Area Schema:

Create file `Databases/Schema/serviceableArea.Schema.ts`:
```typescript
import { Schema, model } from "mongoose";

export interface IServiceableArea {
    medicineStoreId: Schema.Types.ObjectId;
    pincodes: number[];
    cities: string[];
    states: string[];
    deliveryCharges: number;
    freeDeliveryAbove?: number;
    estimatedDeliveryDays: number;
}

const serviceableAreaSchema = new Schema<IServiceableArea>({
    medicineStoreId: {
        type: Schema.Types.ObjectId,
        ref: "MedicineStore",
        required: true,
        index: true,
    },
    pincodes: [{
        type: Number,
        index: true,
    }],
    cities: [String],
    states: [String],
    deliveryCharges: {
        type: Number,
        default: 40,
    },
    freeDeliveryAbove: {
        type: Number,
        default: 500,
    },
    estimatedDeliveryDays: {
        type: Number,
        default: 3,
    }
});

serviceableAreaSchema.index({ medicineStoreId: 1, pincodes: 1 });

export const ServiceableAreaModel = model<IServiceableArea>("ServiceableArea", serviceableAreaSchema);
```

Add check in [order.Service.ts](Services/order.Service.ts) after store validation:
```typescript
// Check if store delivers to customer's pincode
const serviceableArea = await ServiceableAreaModel.findOne({
    medicineStoreId: medicineStoreId,
    pincodes: deliveryAddress.pincode
});

if (!serviceableArea) {
    return next(new ApiError(400, "Store does not deliver to your pincode"));
}
```

---

### 5. **Coupon System Implementation**

#### Create Coupon Schema:

Create file `Databases/Schema/coupon.Schema.ts`:
```typescript
import { Schema, model } from "mongoose";

export interface ICoupon {
    code: string;
    title: string;
    description?: string;
    type: 'PERCENTAGE' | 'FLAT';
    value: number;
    maxDiscount?: number;
    minOrderValue: number;
    maxUsageCount?: number;
    usagePerUser?: number;
    currentUsageCount: number;
    applicableStores?: Schema.Types.ObjectId[];
    applicableCategories?: Schema.Types.ObjectId[];
    firstOrderOnly: boolean;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
}

const couponSchema = new Schema<ICoupon>({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
    },
    title: {
        type: String,
        required: true,
    },
    description: String,
    type: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT'],
        required: true,
    },
    value: {
        type: Number,
        required: true,
        min: 0,
    },
    maxDiscount: {
        type: Number,
        min: 0,
    },
    minOrderValue: {
        type: Number,
        required: true,
        default: 0,
    },
    maxUsageCount: Number,
    usagePerUser: {
        type: Number,
        default: 1,
    },
    currentUsageCount: {
        type: Number,
        default: 0,
    },
    applicableStores: [{
        type: Schema.Types.ObjectId,
        ref: "MedicineStore",
    }],
    applicableCategories: [{
        type: Schema.Types.ObjectId,
        ref: "Category",
    }],
    firstOrderOnly: {
        type: Boolean,
        default: false,
    },
    validFrom: {
        type: Date,
        required: true,
    },
    validUntil: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    }
}, { timestamps: true });

export const CouponModel = model<ICoupon>("Coupon", couponSchema);
```

Replace TODO in [order.Service.ts](Services/order.Service.ts) line 175-182 with:
```typescript
if (couponCode) {
    const coupon = await CouponModel.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
    });
    
    // Validate coupon exists
    if (!coupon) {
        return next(new ApiError(400, "Invalid or expired coupon code"));
    }
    
    // Check usage limits
    if (coupon.maxUsageCount && coupon.currentUsageCount >= coupon.maxUsageCount) {
        return next(new ApiError(400, "Coupon usage limit exceeded"));
    }
    
    // Check minimum order value
    if (subtotal < coupon.minOrderValue) {
        return next(new ApiError(400, `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`));
    }
    
    // Check store applicability
    if (coupon.applicableStores && coupon.applicableStores.length > 0) {
        const isApplicable = coupon.applicableStores.some(
            storeId => storeId.toString() === medicineStoreId
        );
        if (!isApplicable) {
            return next(new ApiError(400, "Coupon not applicable for this store"));
        }
    }
    
    // Check first order restriction
    if (coupon.firstOrderOnly) {
        const orderCount = await orderModel.countDocuments({ 
            userId: userId,
            orderStatus: { $ne: OrderStatus.CANCELLED }
        });
        if (orderCount > 0) {
            return next(new ApiError(400, "Coupon valid for first order only"));
        }
    }
    
    // Check per-user usage limit
    if (coupon.usagePerUser) {
        const userUsageCount = await orderModel.countDocuments({
            userId: userId,
            couponCode: couponCode,
            orderStatus: { $ne: OrderStatus.CANCELLED }
        });
        if (userUsageCount >= coupon.usagePerUser) {
            return next(new ApiError(400, "You have already used this coupon"));
        }
    }
    
    // Calculate discount
    if (coupon.type === "PERCENTAGE") {
        discount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscount) {
            discount = Math.min(discount, coupon.maxDiscount);
        }
        discountPercentage = coupon.value;
    } else if (coupon.type === "FLAT") {
        discount = coupon.value;
    }
}
```

And update coupon usage in transaction (line 247 in order.Service.ts):
```typescript
// Update coupon usage (if applicable)
if (couponCode) {
    await CouponModel.findOneAndUpdate(
        { code: couponCode.toUpperCase() },
        { $inc: { currentUsageCount: 1 } },
        { session }
    );
}
```

---

### 6. **Payment Gateway Integration**

#### For Razorpay:

Install package:
```bash
npm install razorpay
```

Create file `config/razorpay.ts`:
```typescript
import Razorpay from 'razorpay';

export const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
```

Add to `.env`:
```
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

Replace TODO in [order.Service.ts](Services/order.Service.ts) line 211-218 with:
```typescript
} else {
    // Integrate with Razorpay payment gateway
    const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(totalAmount * 100), // Amount in paisa
        currency: "INR",
        receipt: orderId,
        notes: {
            orderId: orderId,
            userId: userId.toString(),
            medicineStoreId: medicineStoreId.toString()
        }
    });
    
    paymentId = razorpayOrder.id;
    paymentStatus = PaymentStatus.PENDING;
    
    // Return payment details to client for checkout
    // Client will use Razorpay Checkout to complete payment
}
```

Create payment webhook handler in [order.Service.ts](Services/order.Service.ts):
```typescript
/**
 * Payment Gateway Webhook Handler
 * Called by Razorpay when payment status changes
 */
public static handlePaymentWebhook = catchAsyncErrors(
    async (req: Request, res: Response, next: NextFunction) => {
        const crypto = require('crypto');
        
        // Verify webhook signature
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
        const signature = req.headers['x-razorpay-signature'] as string;
        
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        
        if (signature !== expectedSignature) {
            return next(new ApiError(400, "Invalid webhook signature"));
        }
        
        const event = req.body.event;
        const payment = req.body.payload.payment.entity;
        
        if (event === 'payment.captured') {
            // Payment successful
            const orderId = payment.notes.orderId;
            
            await OrderService.updatePaymentStatus(
                { 
                    body: {
                        orderId,
                        paymentId: payment.id,
                        paymentStatus: PaymentStatus.COMPLETED,
                        transactionId: payment.id
                    }
                } as Request,
                res,
                next
            );
        } else if (event === 'payment.failed') {
            // Payment failed
            const orderId = payment.notes.orderId;
            
            await OrderService.updatePaymentStatus(
                {
                    body: {
                        orderId,
                        paymentId: payment.id,
                        paymentStatus: PaymentStatus.FAILED
                    }
                } as Request,
                res,
                next
            );
        }
        
        return res.status(200).json({ status: 'ok' });
    }
);
```

Add route for webhook:
```typescript
// In orders.Routes.ts
ordersRouter.post('/webhook/razorpay', OrderService.handlePaymentWebhook);
```

#### Client-side integration (React Native):

```typescript
// After creating order, open Razorpay checkout
import RazorpayCheckout from 'react-native-razorpay';

const createOrder = async () => {
    const response = await api.post('/orders', orderData);
    
    if (response.data.paymentRequired) {
        const options = {
            key: RAZORPAY_KEY_ID,
            amount: response.data.order.totalAmount * 100,
            currency: "INR",
            name: "PharmaMart",
            description: `Order #${response.data.order.orderId}`,
            order_id: response.data.paymentId,
            prefill: {
                email: user.email,
                contact: user.phone,
                name: user.name
            },
            theme: { color: "#3399cc" }
        };
        
        RazorpayCheckout.open(options)
            .then((data) => {
                // Payment successful
                console.log('Payment successful', data);
                navigation.navigate('OrderSuccess', { orderId: response.data.order.orderId });
            })
            .catch((error) => {
                // Payment failed
                console.error('Payment failed', error);
                Alert.alert('Payment Failed', 'Please try again');
            });
    }
};
```

---

### 7. **Invoice Generation**

Install packages:
```bash
npm install pdfkit
npm install @types/pdfkit --save-dev
```

Create file `Utils/invoiceGenerator.ts`:
```typescript
import PDFDocument from 'pdfkit';
import { IOrder } from '../Databases/Entities/order.Interface';

export async function generateInvoicePDF(order: IOrder): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);
        
        // Header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();
        
        // Order details
        doc.fontSize(12)
            .text(`Order ID: ${order.orderId}`)
            .text(`Order Date: ${order.orderDate.toLocaleDateString()}`)
            .text(`Payment Method: ${order.paymentMethod}`)
            .moveDown();
        
        // Customer details
        doc.fontSize(14).text('Delivery Address:');
        doc.fontSize(10)
            .text(order.deliveryAddress.recipientName)
            .text(order.deliveryAddress.street)
            .text(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`)
            .text(`Phone: ${order.deliveryAddress.recipientPhone}`)
            .moveDown();
        
        // Items table
        doc.fontSize(14).text('Order Items:');
        doc.moveDown(0.5);
        
        // Table header
        const tableTop = doc.y;
        doc.fontSize(10)
            .text('Item', 50, tableTop)
            .text('Qty', 300, tableTop)
            .text('Price', 350, tableTop)
            .text('Total', 450, tableTop);
        
        doc.moveTo(50, doc.y + 5)
            .lineTo(550, doc.y + 5)
            .stroke();
        
        // Table rows
        let position = doc.y + 10;
        order.orderItems.forEach(item => {
            doc.fontSize(9)
                .text(item.itemName, 50, position)
                .text(item.quantity.toString(), 300, position)
                .text(`₹${item.unitPrice}`, 350, position)
                .text(`₹${item.totalPrice}`, 450, position);
            position += 20;
        });
        
        // Totals
        doc.moveTo(50, position)
            .lineTo(550, position)
            .stroke();
        
        position += 10;
        doc.fontSize(10)
            .text('Subtotal:', 350, position)
            .text(`₹${order.subtotal}`, 450, position);
        
        position += 20;
        doc.text('Tax:', 350, position)
            .text(`₹${order.taxAmount}`, 450, position);
        
        position += 20;
        doc.text('Shipping:', 350, position)
            .text(`₹${order.shippingCost}`, 450, position);
        
        if (order.discount && order.discount > 0) {
            position += 20;
            doc.text('Discount:', 350, position)
                .text(`-₹${order.discount}`, 450, position);
        }
        
        position += 20;
        doc.fontSize(12)
            .text('Total Amount:', 350, position)
            .text(`₹${order.totalAmount}`, 450, position);
        
        // Footer
        doc.fontSize(8)
            .text('Thank you for your order!', 50, 700, { align: 'center' });
        
        doc.end();
    });
}
```

Use in background job queue after order creation.

---

## 🔧 Quick Start Checklist

1. **Immediate Priority (Security)**
   - [x] Server-side price calculation ✅ Already implemented
   - [ ] Add stock fields to Item schema
   - [ ] Add prescriptionRequired to Item schema
   - [ ] Integrate payment gateway (Razorpay recommended)

2. **High Priority (Business Logic)**
   - [ ] Implement coupon system
   - [ ] Add serviceable area checking
   - [ ] Implement stock management
   - [ ] Add operating hours validation

3. **Medium Priority (User Experience)**
   - [ ] Invoice generation
   - [ ] Email notifications
   - [ ] SMS notifications
   - [ ] Order tracking with delivery partner

4. **Low Priority (Nice to Have)**
   - [ ] Analytics dashboard
   - [ ] Order recommendations
   - [ ] Loyalty points system
   - [ ] Subscription orders

---

## 📞 Support

For implementation questions or issues, refer to:
- [DOCS_ORDER_FLOW.md](DOCS_ORDER_FLOW.md) - Complete order flow documentation
- [Services/order.Service.ts](Services/order.Service.ts) - Implementation with detailed comments
- [Routers/Routers/orders.Routes.ts](Routers/Routers/orders.Routes.ts) - API routes

---

**Remember:** The foundation is solid now. You have a secure, production-grade order creation system. The TODO items are enhancements that can be added incrementally without breaking existing functionality.
