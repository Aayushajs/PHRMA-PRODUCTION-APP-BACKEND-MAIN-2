/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Admin Store Routes - Store verification and management
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';
import AdminStoreService from '../../Services/adminStore.Service';

const adminStoreRouter = Router();

/**
 * GET /api/admin/stores/pending
 * Get all stores pending verification
 */
adminStoreRouter.get('/pending', AdminStoreService.getPendingStores);

/**
 * GET /api/admin/stores/:storeId
 * Get store details for review
 */
adminStoreRouter.get('/:storeId', AdminStoreService.getStoreDetails);

/**
 * PUT /api/admin/stores/:storeId/status
 * Update store verification status (approve/reject/suspend)
 * Body: { action: 'approve' | 'reject' | 'suspend', adminRemarks?: string }
 */
adminStoreRouter.put('/:storeId/status', AdminStoreService.updateStoreStatus);

/**
 * GET /api/admin/stores/stats/verification
 * Get verification statistics
 */
adminStoreRouter.get('/stats/verification', AdminStoreService.getVerificationStats);

export default adminStoreRouter;
