import express, { Express } from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './Databases/db.js';
import { connectRedis } from './config/redis.js';
import { errorHandler } from './Middlewares/errorHandler.js';
import mainRouter from './Routers/main.Routes.js';
import listEndpoints from 'express-list-endpoints';


dotenv.config({ path: './config/.env' });

const app: Express = express();

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({
  origin: ['*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user-role', 'x-user-email'],
  credentials: true,
}));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Service2',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v2', mainRouter);
// console.log(listEndpoints(app));
// filepath: server.ts
app.use(errorHandler);

connectDB().catch(err => {
  console.error("Database initialization failed:", err);
});

connectRedis().catch(err => {
  console.error("Redis initialization failed:", err);
});

export default app;
