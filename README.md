# Service2 Backend

Microservice backend for Service2 functionality.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create `.env` file in `config/` directory:

```
PORT=5002
MONGODB_URI=mongodb://localhost:27017/service2
USER_SECRET_KEY=your_secret_key_here
NODE_ENV=development
```

## Project Structure

```
Service2 backend/
├── config/              # Configuration files
├── cronjob/             # Scheduled jobs
├── Databases/           # Database setup and models
├── Middlewares/         # Express middlewares
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
