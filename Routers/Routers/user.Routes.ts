import UserService from "../../Services/user.Service";
import { Router } from "express";
import { verifyInternalService } from "../../Middlewares/internalService"

const userRouter = Router();
const ur = userRouter;

ur.post('/login', UserService.login);
ur.post('/logout', UserService.logout);
ur.post('/forgot/password', UserService.forgotPassword);
ur.post('/verifyOtp', UserService.verifyOtp);
ur.post('/ResetPassword',verifyInternalService, UserService.ResetPassword);


export default userRouter;