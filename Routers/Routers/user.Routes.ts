import UserService from "../../Services/user.Service";
import { Router } from "express";
import { verifyInternalService } from "../../Middlewares/internalService";
import { authenticatedUserMiddleware } from "../../Middlewares/auth";

const userRouter = Router();
const ur = userRouter;

// Authentication routes
ur.post('/login', UserService.login);
ur.post('/logout', UserService.logout);
ur.post('/forgot/password', UserService.forgotPassword);
ur.post('/verifyOtp', UserService.verifyOtp);
ur.post('/ResetPassword', verifyInternalService, UserService.ResetPassword);

// Delivery address management routes
ur.post('/delivery-addresses', authenticatedUserMiddleware, UserService.addDeliveryAddress);
ur.get('/delivery-addresses', authenticatedUserMiddleware, UserService.getDeliveryAddresses);
ur.put('/delivery-addresses/:addressId', authenticatedUserMiddleware, UserService.updateDeliveryAddress);
ur.delete('/delivery-addresses/:addressId', authenticatedUserMiddleware, UserService.deleteDeliveryAddress);
ur.patch('/delivery-addresses/:addressId/set-default', authenticatedUserMiddleware, UserService.setDefaultAddress);

export default userRouter;