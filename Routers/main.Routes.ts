/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Main Router - Aggregates all API routes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Router } from 'express';

const mainRouter = Router();

// Health check
mainRouter.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Service2 API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
mainRouter.get('/', (req, res) => {
  res.status(200).json({
    message: 'Service2 API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v2/health',
    },
  });
});

export default mainRouter;
