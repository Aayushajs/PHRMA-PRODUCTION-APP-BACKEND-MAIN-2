/*
┌───────────────────────────────────────────────────────────────────────┐
│  Keep Alive Cron Job - Prevents server from sleeping on Render        │
│  Pings the health check endpoint every 5 minutes                       │
└───────────────────────────────────────────────────────────────────────┘
*/

import axios from 'axios';

// Get the server URL from environment or use default
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5002';
const HEALTH_CHECK_URL = `${SERVER_URL}/health`;

// Interval in milliseconds (5 minutes = 300000ms)
const INTERVAL = 5 * 60 * 1000;

let isRunning = false;

/**
 * Pings the health check endpoint to keep server alive
 */
async function pingServer() {
  if (isRunning) {
    console.log(' Previous ping still in progress, skipping...');
    return;
  }

  try {
    isRunning = true;
    const startTime = Date.now();

    const response = await axios.get(HEALTH_CHECK_URL, {
      timeout: 10000,
    });

    const duration = Date.now() - startTime;

    if (response.status === 200) {
      console.log(`✅ Keep-alive ping successful (${duration}ms)`);
    }
  } catch (error: any) {
    console.error(` Keep-alive ping failed: ${error.message}`);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the keep-alive cron job
 * Only runs in production environment
 */
export const startKeepAliveCron = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv !== 'production') {
    console.log('⏭  Keep-alive cron skipped (not in production)');
    return;
  }

  console.log(`🔄 Starting keep-alive cron (interval: ${INTERVAL / 1000 / 60} minutes)`);

  // Initial ping
  pingServer();

  // Set interval for subsequent pings
  setInterval(pingServer, INTERVAL);
};
