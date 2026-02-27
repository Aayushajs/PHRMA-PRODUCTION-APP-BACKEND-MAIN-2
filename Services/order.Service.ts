import orderModel from "../Databases/Models/order.model";
import User from "../Databases/Models/user.Model";
import MedicineStore from "../Databases/Models/medicineStore.Model";
import ItemModel from "../Databases/Models/item.Model";
import { Request, Response, NextFunction } from "express";
import { catchAsyncErrors } from "../Utils/catchAsyncErrors";
import { ApiError } from "../Middlewares/errorHandler";
import { handleResponse } from "../Utils/handleResponse";
import { OrderStatus, PaymentStatus, PaymentMethod, ShippingMethod, ReturnReason, CancellationReason } from "../Databases/Entities/order.Interface";
import mongoose from "mongoose";
import notificationService from "./notification.Service";
import { validateRequiredFields, validateNestedObject, validateEnum } from "../Utils/validators";

class OrderService {

    public static createOrder = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const {
                userId,
                orderItems,
                medicineStoreId,
                paymentMethod,
                deliveryAddress,
                billingAddress,
                prescriptionFile,
                couponCode,
                specialInstructions,
                shippingMethod = ShippingMethod.STANDARD
            } = req.body;


            const basicValidation = validateRequiredFields(
                req.body,
                ['userId', 'medicineStoreId', 'paymentMethod'],
                'Order'
            );

            if (!basicValidation.isValid) {
                return next(new ApiError(
                    400,
                    `Missing required fields: ${basicValidation.missingFields.join(', ')}`
                ));
            }

            if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
                return next(new ApiError(400, "orderItems must be a non-empty array"));
            }

            // Validate each order item dynamically
            for (let i = 0; i < orderItems.length; i++) {
                const itemValidation = validateRequiredFields(
                    orderItems[i],
                    ['itemId', 'quantity'],
                    `orderItems[${i}]`
                );

                if (!itemValidation.isValid) {
                    return next(new ApiError(
                        400,
                        `Invalid order item at index ${i}: ${itemValidation.missingFields.join(', ')} required`
                    ));
                }

                if (orderItems[i].quantity < 1) {
                    return next(new ApiError(400, `quantity must be at least 1 for item at index ${i}`));
                }
            }

            // Validate deliveryAddress dynamically
            const addressValidation = validateNestedObject(
                deliveryAddress,
                ['street', 'city', 'state', 'pincode', 'recipientName', 'recipientPhone'],
                'deliveryAddress'
            );

            if (!addressValidation.isValid) {
                return next(new ApiError(
                    400,
                    `Missing required fields: ${addressValidation.missingFields.join(', ')}`
                ));
            }

            // Validate payment method enum
            const paymentMethodValidation = validateEnum(
                paymentMethod,
                PaymentMethod,
                'paymentMethod'
            );

            if (!paymentMethodValidation.isValid) {
                return next(new ApiError(400, paymentMethodValidation.message!));
            }


            const user = await User.findById(userId);
            if (!user) {
                return next(new ApiError(404, "User not found"));
            }

            const medicineStore = await MedicineStore.findById(medicineStoreId);
            if (!medicineStore) {
                return next(new ApiError(404, "Medicine store not found"));
            }

            if (!medicineStore.isVerified) {
                return next(new ApiError(400, "Medicine store is not verified"));
            }

            if (!medicineStore.isActive) {
                return next(new ApiError(400, "Medicine store is currently inactive"));
            }

            const validatedItems = [];
            let subtotal = 0;
            let totalTax = 0;
            let prescriptionRequiredForOrder = false;

            for (const orderItem of orderItems) {
                if (!orderItem.itemId || !orderItem.quantity || orderItem.quantity < 1) {
                    return next(new ApiError(400, `Invalid item data: itemId and quantity (>0) required`));
                }


                const item = await ItemModel.findById(orderItem.itemId)
                    .populate<{ itemGST: { gstRate: number } }>('itemGST')
                    .populate('itemChildUnit');

                if (!item) {
                    return next(new ApiError(404, `Item not found: ${orderItem.itemId}`));
                }

                if (item.medicineStoreId?.toString() !== medicineStoreId) {
                    return next(new ApiError(400, `Item ${item.itemName} does not belong to selected store`));
                }

                // Check if item is in stock
                // if (item.stock !== undefined && item.stock < orderItem.quantity) {
                //     return next(new ApiError(400, `Insufficient stock for ${item.itemName}. Available: ${item.stock}`));
                // }

                // Check if item is expired
                if (item.itemExpiryDate && new Date(item.itemExpiryDate) <= new Date()) {
                    return next(new ApiError(400, `Item ${item.itemName} is expired`));
                }

                // TODO: Implement prescription requirement flag in item schema
                // Check if prescription required for this item
                // if (item.prescriptionRequired) {
                //     prescriptionRequiredForOrder = true;
                // }

                // SERVER-SIDE PRICE CALCULATION (critical for security)
                const unitPrice = item.itemFinalPrice;
                const itemDiscount = item.itemDiscount || 0;
                const priceAfterDiscount = unitPrice - (unitPrice * itemDiscount / 100);

                // Calculate GST
                const populatedGst = item.itemGST as { gstRate: number };
                const gstRate = populatedGst?.gstRate || 0;
                const gstAmount = (priceAfterDiscount * gstRate) / 100;

                const totalPrice = (priceAfterDiscount + gstAmount) * orderItem.quantity;

                subtotal += unitPrice * orderItem.quantity;
                totalTax += gstAmount * orderItem.quantity;

                validatedItems.push({
                    itemId: item._id,
                    itemName: item.itemName,
                    quantity: orderItem.quantity,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice,
                    itemBatchNumber: item.itemBatchNumber,
                    itemExpiryDate: item.itemExpiryDate,
                    discount: itemDiscount,
                    gstAmount: gstAmount * orderItem.quantity,
                    hsnCode: item.HSNCode
                });
            }

            if (prescriptionRequiredForOrder && !prescriptionFile) {
                return next(new ApiError(400, "Prescription is required for prescription medicines in your order"));
            }

            // APPLY & VALIDATE COUPON CODE
            let discount = 0;
            let discountPercentage = 0;

            if (couponCode) {
                // TODO: Implement coupon validation
                // - Check if coupon exists and is valid
                // - Check if user is eligible
                // - Check if minimum order value met
                // - Check usage limits
                // - Calculate discount
                console.warn("⚠️  Coupon validation not implemented yet");
            }

            // CALCULATE SHIPPING COST
            let shippingCost = 0;

            // TODO: Implement shipping cost calculation based on:
            // - Distance between store and delivery address
            // - Shipping method (standard, express)
            // - Order value (free shipping above threshold)
            // - Item weight/dimensions

            if (subtotal < 500) {
                shippingCost = 40; // Base shipping
            }

            if (shippingMethod === ShippingMethod.EXPRESS) {
                shippingCost += 100;
            }

            const totalAmount = subtotal - discount + totalTax + shippingCost;

            if (totalAmount <= 0) {
                return next(new ApiError(400, "Invalid order total"));
            }

            const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

            let paymentStatus = PaymentStatus.PENDING;
            let paymentId = null;

            if (paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
                paymentStatus = PaymentStatus.PENDING;
            } else {
                // TODO: Integrate with payment gateway (Razorpay, Stripe, etc.)
                // - Create payment order
                // - Return payment gateway order details to client
                // - Client completes payment
                // - Webhook/callback updates order status

                // For now, generate payment ID
                paymentId = `PAY${Date.now()}`;

                // NOTE: In production, order should be created with PENDING status
                // and only confirmed after successful payment verification
                console.warn("⚠️  Payment gateway integration pending");
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                const newOrder = await orderModel.create([{
                    orderId,
                    userId,
                    medicineStoreId,
                    orderItems: validatedItems,
                    subtotal,
                    discount,
                    discountPercentage,
                    taxAmount: totalTax,
                    shippingCost,
                    totalAmount,
                    deliveryAddress,
                    billingAddress: billingAddress || deliveryAddress,
                    paymentMethod,
                    paymentStatus,
                    paymentId,
                    orderStatus: OrderStatus.PENDING,
                    shippingMethod,
                    orderDate: new Date(),
                    estimatedDeliveryDate: this.calculateEstimatedDelivery(shippingMethod),
                    prescriptionRequired: prescriptionRequiredForOrder,
                    prescriptionFile: prescriptionFile || undefined,
                    prescriptionVerified: false,
                    specialInstructions,
                    isReturnable: true,
                    couponCode: couponCode || undefined
                }], { session });

                // UPDATE INVENTORY (RESERVE STOCK)

                // TODO: Implement stock management in item schema
                // for (const item of validatedItems) {
                //     await ItemModel.findByIdAndUpdate(
                //         item.itemId,
                //         { 
                //             $inc: { 
                //                 stock: -item.quantity,
                //                 // Optionally track reserved stock separately
                //                 // reservedStock: item.quantity 
                //             } 
                //         },
                //         { session }
                //     );
                // }

                // Commit transaction
                await session.commitTransaction();

                // SEND NOTIFICATIONS (ASYNC)
                // Send to customer
                notificationService.sendToUser({
                    userId: userId,
                    title: "Order Placed Successfully!",
                    body: `Your order #${orderId} has been placed. Total: ₹${totalAmount}`,
                    data: {
                        orderId,
                        type: "order_placed",
                        screen: "OrderDetails"
                    }
                }).catch(err => console.error("Notification error:", err));

                // TODO: Send notification to store
                // TODO: Send email confirmation
                // TODO: Queue invoice generation job
                // TODO: Update analytics

                // ================================================================
                // STEP 13: RETURN RESPONSE
                // ================================================================
                return handleResponse(req, res, 201, "Order created successfully", {
                    order: newOrder[0],
                    paymentRequired: paymentMethod !== PaymentMethod.CASH_ON_DELIVERY,
                    paymentId,
                    // In production, return payment gateway order details here
                    nextStep: paymentMethod === PaymentMethod.CASH_ON_DELIVERY
                        ? "Order confirmed, will be delivered soon"
                        : "Complete payment to confirm order"
                });

            } catch (error) {
                // Rollback transaction on error
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        }
    );

    /**
     * Calculate estimated delivery date based on shipping method
     * Medicine delivery can be within hours/minutes for urgent orders
     */
    private static calculateEstimatedDelivery(shippingMethod: ShippingMethod): Date {
        const now = new Date();
        let minutesToAdd = 240; // default: 4 hours

        switch (shippingMethod) {
            case ShippingMethod.EXPRESS:
                minutesToAdd = 120; // 2 hours
                break;
            case ShippingMethod.OVERNIGHT:
                minutesToAdd = 60; // 1 hour
                break;
            case ShippingMethod.STANDARD:
                minutesToAdd = 240; // 4 hours
                break;
            case ShippingMethod.LOCAL_PICKUP:
                minutesToAdd = 30; // 30 minutes
                break;
        }

        // Add minutes to current time
        now.setMinutes(now.getMinutes() + minutesToAdd);
        return now;
    }

    /**
     * ========================================================================
     * UPDATE PAYMENT STATUS (Called by payment gateway webhook)
     * ========================================================================
     */
    public static updatePaymentStatus = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { orderId, paymentId, paymentStatus, transactionId } = req.body;

            if (!orderId || !paymentStatus) {
                return next(new ApiError(400, "orderId and paymentStatus are required"));
            }

            const order = await orderModel.findOne({ orderId });
            if (!order) {
                return next(new ApiError(404, "Order not found"));
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // Update payment status
                order.paymentStatus = paymentStatus;
                order.paymentId = paymentId;
                order.paymentDate = new Date();

                if (transactionId) {
                    order.paymentDetails = {
                        ...order.paymentDetails,
                        transactionId
                    };
                }

                // If payment successful, confirm order
                if (paymentStatus === PaymentStatus.COMPLETED) {
                    order.orderStatus = OrderStatus.CONFIRMED;
                    order.confirmedDate = new Date();

                    // Send confirmation notification
                    await notificationService.sendToUser({
                        userId: order.userId.toString(),
                        title: "Payment Successful! ✅",
                        body: `Payment confirmed for order #${orderId}. Your order is being processed.`,
                        data: {
                            orderId,
                            type: "payment_success",
                            screen: "OrderDetails"
                        }
                    }).catch(err => console.error("Notification error:", err));
                } else if (paymentStatus === PaymentStatus.FAILED) {
                    // TODO: Restore inventory if payment failed (when stock management is implemented)
                    // for (const item of order.orderItems) {
                    //     await ItemModel.findByIdAndUpdate(
                    //         item.itemId,
                    //         { $inc: { stock: item.quantity } },
                    //         { session }
                    //     );
                    // }

                    order.orderStatus = OrderStatus.FAILED;

                    await notificationService.sendToUser({
                        userId: order.userId.toString(),
                        title: "Payment Failed ❌",
                        body: `Payment failed for order #${orderId}. Please try again.`,
                        data: {
                            orderId,
                            type: "payment_failed",
                            screen: "OrderDetails"
                        }
                    }).catch(err => console.error("Notification error:", err));
                }

                await order.save({ session });
                await session.commitTransaction();

                return handleResponse(req, res, 200, "Payment status updated", order);

            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        }
    );

    /**
     * ========================================================================
     * UPDATE ORDER STATUS (Store/Admin updates order progress)
     * ========================================================================
     */
    public static updateOrderStatus = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { orderId } = req.params;
            const { orderStatus, trackingNumber, deliveryNotes } = req.body;

            if (!orderStatus) {
                return next(new ApiError(400, "orderStatus is required"));
            }

            if (!Object.values(OrderStatus).includes(orderStatus)) {
                return next(new ApiError(400, "Invalid order status"));
            }

            const order = await orderModel.findOne({ orderId });
            if (!order) {
                return next(new ApiError(404, "Order not found"));
            }

            // Validate status transition
            const currentStatus = order.orderStatus;

            // Define valid status transitions (CANCELLED/FAILED handled by separate endpoints)
            const validTransitions: Record<OrderStatus, OrderStatus[]> = {
                [OrderStatus.PENDING]: [OrderStatus.CONFIRMED],
                [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING],
                [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
                [OrderStatus.SHIPPED]: [OrderStatus.OUT_FOR_DELIVERY],
                [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
                [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
                [OrderStatus.CANCELLED]: [], // Use cancelOrder endpoint instead
                [OrderStatus.RETURNED]: [], // Final state
                [OrderStatus.FAILED]: [] // Final state
            };

            // Check if transition is valid
            if (!validTransitions[currentStatus]?.includes(orderStatus)) {
                return next(new ApiError(
                    400,
                    `Cannot change order status from ${currentStatus} to ${orderStatus}`
                ));
            }

            // Additional business rule validations
            if (orderStatus === OrderStatus.SHIPPED && !trackingNumber) {
                return next(new ApiError(400, "Tracking number is required when shipping order"));
            }

            if (orderStatus === OrderStatus.CONFIRMED && order.paymentStatus !== PaymentStatus.COMPLETED
                && order.paymentMethod !== PaymentMethod.CASH_ON_DELIVERY) {
                return next(new ApiError(400, "Cannot confirm order - payment not completed"));
            }

            // Update status and related timestamps
            order.orderStatus = orderStatus;

            if (deliveryNotes) {
                order.deliveryNotes = deliveryNotes;
            }

            if (trackingNumber) {
                order.trackingNumber = trackingNumber;
            }

            // Update timestamps based on status
            // Note: Using full Date() object to track exact time (hours/minutes) 
            // Critical for e-pharmacy with rapid delivery (within hours/minutes)
            const currentTimestamp = new Date();

            switch (orderStatus) {
                case OrderStatus.PENDING:
                    // Order is pending - initial state
                    order.orderDate = currentTimestamp;
                    break;

                case OrderStatus.CONFIRMED:
                    order.confirmedDate = currentTimestamp;
                    break;

                case OrderStatus.PROCESSING:
                    order.processedDate = currentTimestamp;
                    break;

                case OrderStatus.SHIPPED:
                    order.shippedDate = currentTimestamp;
                    if (trackingNumber) {
                        order.trackingNumber = trackingNumber;
                    }
                    break;

                case OrderStatus.OUT_FOR_DELIVERY:
                    // Track via delivery notes since outForDeliveryDate field doesn't exist
                    order.deliveryNotes = `Out for delivery at ${currentTimestamp.toLocaleString()}`;
                    break;

                case OrderStatus.DELIVERED:
                    order.actualDeliveryDate = currentTimestamp;
                    order.isReturnable = true; // Enable return option after delivery
                    break;

                case OrderStatus.RETURNED:
                    order.returnDate = currentTimestamp;
                    order.isReturnable = false;
                    break;

                // CANCELLED and FAILED should use dedicated cancelOrder endpoint
                default:
                    return next(new ApiError(400, `Status ${orderStatus} cannot be set via updateOrderStatus. Use appropriate endpoint.`));
            }

            await order.save();

            // Send notification to user
            const statusMessages: Record<OrderStatus, string> = {
                [OrderStatus.PENDING]: "Order is pending",
                [OrderStatus.CONFIRMED]: "Order confirmed! We're preparing your medicines.",
                [OrderStatus.PROCESSING]: "Your order is being processed",
                [OrderStatus.SHIPPED]: `Order shipped! Track: ${trackingNumber || 'Check app'}`,
                [OrderStatus.OUT_FOR_DELIVERY]: "Your order is out for delivery!",
                [OrderStatus.DELIVERED]: "Order delivered successfully! 🎉",
                [OrderStatus.CANCELLED]: "Order has been cancelled",
                [OrderStatus.RETURNED]: "Order returned",
                [OrderStatus.FAILED]: "Order failed"
            };

            const notificationBody = statusMessages[orderStatus as OrderStatus] || "Order status updated";

            await notificationService.sendToUser({
                userId: order.userId.toString(),
                title: `Order ${orderStatus}`,
                body: notificationBody,
                data: {
                    orderId,
                    orderStatus,
                    trackingNumber,
                    type: "order_status_update",
                    screen: "OrderDetails"
                }
            }).catch(err => console.error("Notification error:", err));

            return handleResponse(req, res, 200, "Order status updated", order);
        }
    );

    /**
     * ========================================================================
     * CANCEL ORDER
     * ========================================================================
     */
    public static cancelOrder = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { orderId } = req.params;
            const { cancellationReason, cancelledBy = "user" } = req.body;

            // Validate cancellationReason is provided
            if (!cancellationReason) {
                return next(new ApiError(400, "cancellationReason is required"));
            }

            // Validate cancellationReason enum
            const cancellationReasonValidation = validateEnum(
                cancellationReason,
                CancellationReason,
                'cancellationReason'
            );
            
            if (!cancellationReasonValidation.isValid) {
                return next(new ApiError(400, cancellationReasonValidation.message!));
            }

            // Validate cancelledBy enum
            const validCancelledBy = ["user", "store", "system"];
            if (cancelledBy && !validCancelledBy.includes(cancelledBy)) {
                return next(new ApiError(400, `Invalid cancelledBy value. Must be one of: ${validCancelledBy.join(', ')}`));
            }

            const order = await orderModel.findOne({ orderId });
            if (!order) {
                return next(new ApiError(404, "Order not found"));
            }

            // Check if order can be cancelled
            if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(order.orderStatus)) {
                return next(new ApiError(400, "Order cannot be cancelled at this stage"));
            }

            const session = await mongoose.startSession();
            session.startTransaction();

            try {
                // TODO: Restore inventory (when stock management is implemented)
                // for (const item of order.orderItems) {
                //     await ItemModel.findByIdAndUpdate(
                //         item.itemId,
                //         { $inc: { stock: item.quantity } },
                //         { session }
                //     );
                // }

                // Update order
                order.orderStatus = OrderStatus.CANCELLED;
                order.cancellationReason = cancellationReason;
                order.cancellationDate = new Date(); // Tracks exact timestamp (date + time)
                order.cancelledBy = cancelledBy;

                // If payment was completed, initiate refund
                if (order.paymentStatus === PaymentStatus.COMPLETED) {
                    order.refundStatus = PaymentStatus.PENDING;
                    order.refundAmount = order.totalAmount;
                    // TODO: Integrate with payment gateway for refund
                }

                await order.save({ session });
                await session.commitTransaction();

                // Send notification
                await notificationService.sendToUser({
                    userId: order.userId.toString(),
                    title: "Order Cancelled",
                    body: `Order #${orderId} has been cancelled${order.refundAmount ? `. Refund of ₹${order.refundAmount} will be processed.` : '.'}`,
                    data: {
                        orderId,
                        type: "order_cancelled",
                        screen: "OrderDetails"
                    }
                }).catch(err => console.error("Notification error:", err));

                return handleResponse(req, res, 200, "Order cancelled successfully", order);

            } catch (error) {
                await session.abortTransaction();
                throw error;
            } finally {
                session.endSession();
            }
        }
    );

    /**
     * ========================================================================
     * GET ORDER BY ID
     * ========================================================================
     */
    public static getOrderById = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { orderId } = req.params;

            const order = await orderModel.findOne({ orderId })
                .populate('userId', 'name email phone')
                .populate('medicineStoreId', 'storeName storeAddress storePhone')
                .populate('orderItems.itemId', 'itemName itemImages');

            if (!order) {
                return next(new ApiError(404, "Order not found"));
            }

            return handleResponse(req, res, 200, "Order retrieved", order);
        }
    );

    /**
     * ========================================================================
     * GET USER ORDERS
     * ========================================================================
     */
    public static getUserOrders = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { userId } = req.params;
            const { status, page = 1, limit = 10 } = req.query;

            interface QueryFilter {
                userId: string;
                orderStatus?: string;
            }

            const query: QueryFilter = { userId: userId as string };
            
            if (status && typeof status === 'string') {
                query.orderStatus = status;
            }

            const orders = await orderModel.find(query)
                .sort({ orderDate: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .populate('medicineStoreId', 'storeName storeAddress')
                .select('-orderItems.itemId');

            const total = await orderModel.countDocuments(query);

            return handleResponse(req, res, 200, "Orders retrieved", {
                orders,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit))
                }
            });
        }
    );

    /**
     * ========================================================================
     * GET STORE ORDERS
     * ========================================================================
     */
    public static getStoreOrders = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { medicineStoreId } = req.params;
            const { status, page = 1, limit = 10 } = req.query;

            interface QueryFilter {
                medicineStoreId: string;
                orderStatus?: string;
            }

            const query: QueryFilter = { medicineStoreId: medicineStoreId as string };
            
            if (status && typeof status === 'string') {
                query.orderStatus = status;
            }

            const orders = await orderModel.find(query)
                .sort({ orderDate: -1 })
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit))
                .populate('userId', 'name phone')
                .select('-orderItems.itemId');

            const total = await orderModel.countDocuments(query);

            return handleResponse(req, res, 200, "Store orders retrieved", {
                orders,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    pages: Math.ceil(total / Number(limit))
                }
            });
        }
    );

    public static returnOrder = catchAsyncErrors(
        async (req: Request, res: Response, next: NextFunction) => {
            const { orderId } = req.params;
            if (!req.user) {
                return next(new ApiError(401, "Unauthorized"));
            }
            const { _id: userId } = req.user;
            const { returnReason } = req.body;

            if (!orderId) {
                return next(new ApiError(400, "orderId is required"));
            }

            if (!returnReason) {
                return next(new ApiError(400, "returnReason is required"));
            }

            // Validate return reason enum
            const returnReasonValidation = validateEnum(
                returnReason,
                ReturnReason,
                'returnReason'
            );
            
            if (!returnReasonValidation.isValid) {
                return next(new ApiError(400, returnReasonValidation.message!));
            }

            const order = await orderModel.findOne({ orderId });
            if (!order) {
                return next(new ApiError(404, "Order not found"));
            }

            if (order.userId.toString() !== userId) {
                return next(new ApiError(403, "You are not authorized to return this order"));
            }

            if (order.orderStatus !== OrderStatus.DELIVERED) {
                return next(new ApiError(400, "Only delivered orders can be returned"));
            }

            if (!order.isReturnable) {
                return next(new ApiError(400, "This order is not eligible for return"));
            }

            order.orderStatus = OrderStatus.RETURNED;
            order.returnReason = returnReason;
            order.returnDate = new Date();
            order.isReturnable = false;

            await order.save();

            // Send notification
            await notificationService.sendToUser({
                userId: order.userId.toString(),
                title: "Order Returned",
                body: `Your order #${orderId} has been marked as returned. Our team will contact you shortly.`,
                data: {
                    orderId,
                    type: "order_returned",
                    screen: "OrderDetails"
                }
            }).catch(err => console.error("Notification error:", err));

            return handleResponse(req, res, 200, "Order return initiated", order);
        }
    );

}

export default OrderService;