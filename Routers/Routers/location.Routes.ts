/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Location Routes - State, city, and pincode information
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import LocationService from '../../Services/location.Service';

const locationRouter = Router();

locationRouter.get('/states', LocationService.getStates);
locationRouter.get('/cities/:state', LocationService.getCitiesByState);
locationRouter.get('/pincode/:pincode', LocationService.getPincodeInfo);

export default locationRouter;
