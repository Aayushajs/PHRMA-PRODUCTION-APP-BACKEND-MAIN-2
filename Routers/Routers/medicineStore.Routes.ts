/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Medicine Store Routes - Handles pharmacy/store registration and management
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import MedicineStoreService from '../../Services/medicineStore.Service';

const medicineStoreRouter = Router();

/**
 * POST /api/medicine-store/register
 * Register a new medicine store with complete verification
 * Body: { userName, email, phone, storeName, storeType, GSTNumber, pharmacyLicence, address, city, state, pincode }
 */
medicineStoreRouter.post('/register', MedicineStoreService.storeRegistration);

export default medicineStoreRouter;
