/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Medicine Store Routes - Handles pharmacy/store registration and management
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import MedicineStoreService from '../../Services/medicineStore.Service';
import { authenticatedUserMiddleware, adminMiddleware } from '../../Middlewares/auth';
import { ensureStoreVerified } from '../../Middlewares/ensureStoreVerified';
import { uploadImage } from '../../config/multer';

const medicineStoreRouter = Router();

// Public Routes
medicineStoreRouter.post('/register', uploadImage.array('documents'), MedicineStoreService.storeRegistration);
medicineStoreRouter.get('/all', MedicineStoreService.getAllStores);
medicineStoreRouter.get('/distances', MedicineStoreService.countAndgetDistancesToStores);
medicineStoreRouter.get('/:storeId/review-stats', MedicineStoreService.getReviewCountAndAverageRating);

// Authenticated Routes
medicineStoreRouter.get('/:storeId/items', authenticatedUserMiddleware, MedicineStoreService.getMedicineItemByStoreId);
medicineStoreRouter.post('/:storeId/review', authenticatedUserMiddleware, MedicineStoreService.giveStoreReviewAndRating);

// Authorized Routes (Store Owner/Staff)
medicineStoreRouter.put(
    '/:storeId',
    authenticatedUserMiddleware,        
    ensureStoreVerified,
    MedicineStoreService.updateStore
);

// Admin Routes
medicineStoreRouter.delete('/delete/:storeId', adminMiddleware, MedicineStoreService.deleteStore);

export default medicineStoreRouter;
