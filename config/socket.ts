/*
┌───────────────────────────────────────────────────────────────────────┐
│  Socket.IO Configuration - Real-time WebSocket Server                 │
└───────────────────────────────────────────────────────────────────────┘
*/

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // Update with your frontend URL in production
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`✅ Client connected: ${socket.id}`);

    // Join user-specific room for personalized updates
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Leave rooms
    socket.on('leave:user', (userId: string) => {
      socket.leave(`user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

// Real-time event emitters
export const emitUserUpdate = (userId: string, data: any) => {
  if (io) {
    io.to(`user:${userId}`).emit('user:update', {
      type: 'user_update',
      data,
      timestamp: Date.now()
    });
  }
};

export const broadcastUpdate = (eventName: string, data: any) => {
  if (io) {
    io.emit(eventName, {
      data,
      timestamp: Date.now()
    });
  }
};
