import { createServer } from 'http';
import app from './App';
import { initializeSocket } from './config/socket.js';
import { startKeepAliveCron } from './cronjob/keepAlive.js';
import { startNotificationWorker } from './cronjob/notificationWorker.js';

const PORT = parseInt(process.env.PORT || '5002', 10);

const httpServer = createServer(app);

initializeSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  
  // Start notification queue worker
  try {
    await startNotificationWorker();
    console.log('✅ Notification queue worker started');
  } catch (error) {
    console.error('❌ Failed to start notification queue worker:', error);
  }
  
  if (process.env.NODE_ENV === 'production') {
    startKeepAliveCron();
    console.log('Keep-Alive cron job initialized');
  }
});
startKeepAliveCron();
