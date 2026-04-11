import { createServer } from 'http';
import app from './App.js';
import { initializeSocket } from './config/socket.js';
import { startKeepAliveCron } from './cronjob/keepAlive.js';
import { startNotificationWorker } from './cronjob/notificationWorker.js';
import { scheduleLicenseExpiryCron } from './cronjob/licenseExpiry.Job.js';
import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const ENABLE_NOTIFICATION_QUEUE = process.env.ENABLE_NOTIFICATION_QUEUE !== 'false';

const PORT = parseInt(process.env.PORT || '5002', 10);

const httpServer = createServer(app);
// console.log(app._router && app._router.stack);
// console.log(listEndpoints(app));

initializeSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  
  // Start notification queue worker only when enabled
  if (ENABLE_NOTIFICATION_QUEUE) {
    try {
      await startNotificationWorker();
      console.log('✅ Notification queue worker started');
    } catch (error) {
      console.error('❌ Failed to start notification queue worker:', error);
    }
  } else {
    console.log('⏭️ Notification queue worker skipped (ENABLE_NOTIFICATION_QUEUE=false)');
  }
  
  // Start license expiry cron job
  try {
    scheduleLicenseExpiryCron();
    console.log('✅ License expiry cron job scheduled');
  } catch (error) {
    console.error('❌ Failed to start license expiry cron:', error);
  }
  
  if (process.env.NODE_ENV === 'production') {
    startKeepAliveCron();
    console.log('Keep-Alive cron job initialized');
  }
});
startKeepAliveCron();
