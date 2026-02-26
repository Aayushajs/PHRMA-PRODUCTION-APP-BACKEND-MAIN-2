# Service2 Backend

Microservice backend for Service2 functionality with shared notification service.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

## 📋 Environment Variables

Create `.env` file in `config/` directory:

```env
PORT=5002
MONGO_URI=mongodb://localhost:27017/service2
USER_SECRET_KEY=your_secret_key_here
REDIS_URL=your_redis_url

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Internal Service Communication (REQUIRED for notifications)
SERVICE_1_URL=http://localhost:5000
INTERNAL_SERVICE_API_KEY=your-super-secret-internal-api-key

NODE_ENV=development
```

> **Note:** Copy from `config/.env.example` and fill in your values.

## 🔔 Notification Service

This service uses a **shared notification system** with Service 1. No Firebase configuration needed here!

### Usage

```typescript
import { sendNotificationToUser } from './Utils/notificationClient';

// Send notification to a user
await sendNotificationToUser(
  userId,
  'Hello!',
  'This is a notification from Service 2',
  { customData: 'value' }
);
```

### Documentation

- 📖 [Full Architecture Guide](../SHARED_NOTIFICATION_ARCHITECTURE.md)
- 🚀 [Quick Setup Guide](../QUICK_SETUP_NOTIFICATION_SERVICE.md)
- 💻 [Usage Examples](./examples/notificationExamples.ts)

## Project Structure

```
Service2-backend/
├── config/              # Configuration files
│   ├── .env             # Environment variables (create this)
│   └── .env.example     # Environment template
├── cronjob/             # Scheduled jobs
├── Databases/           # Database setup and models
├── Middlewares/         # Express middlewares
├── Utils/               # Utility functions
│   └── notificationClient.ts  # Shared notification client
├── examples/            # Code examples
│   └── notificationExamples.ts
└── Routers/             # API routes
├── Routers/             # API routes
├── Services/            # Business logic
├── types/               # TypeScript type definitions
├── Utils/               # Utility functions
├── server.ts            # Entry point
├── package.json
└── tsconfig.json
```

## API Endpoints

- `GET /api/v1/health` - Health check
- `GET /api/v1/` - Service info

## License

MIT
