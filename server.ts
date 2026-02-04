import { createServer } from 'http';
import app from './App.js';
import { initializeSocket } from './config/socket.js';
import { startKeepAliveCron } from './cronjob/keepAlive.js';

const PORT = parseInt(process.env.PORT || '5002', 10);

const httpServer = createServer(app);

initializeSocket(httpServer);

httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready on ws://localhost:${PORT}`);
  
  if (process.env.NODE_ENV === 'production') {
    startKeepAliveCron();
    console.log('Keep-Alive cron job initialized');
  }
});
startKeepAliveCron();
