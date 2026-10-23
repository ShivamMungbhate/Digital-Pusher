import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { generalLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import consentRoutes from './routes/consentRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import { deleteMe } from './controllers/authController.js';
import { authenticate } from './middlewares/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false // Allows Swagger UI inline assets
    })
  );

  // CORS
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // Body and cookie parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Request logging with Pino
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req: any) => req.url?.startsWith('/health') || req.url?.startsWith('/api/docs')
        }
      })
    );
  }

  // General rate limiter
  app.use('/api', generalLimiter);

  // Root redirect & API Index
  app.get('/', (_req, res) => {
    res.json({
      name: "Digital Pusher - Express API",
      status: "running",
      webApp: "http://localhost:3000",
      documentation: "http://localhost:4000/api/docs",
      healthCheck: "http://localhost:4000/health"
    });
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'digital-pusher-api',
      timestamp: new Date().toISOString()
    });
  });

  // Swagger Documentation
  try {
    const swaggerDocPath = path.join(__dirname, 'docs', 'openapi.json');
    const swaggerDocument = JSON.parse(readFileSync(swaggerDocPath, 'utf8'));
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (err: any) {
    logger.warn({ error: err.message }, 'Failed to load Swagger documentation file');
  }

  // API Routes
  app.delete('/api/me', authenticate, deleteMe);
  app.use('/api/auth', authRoutes);
  app.use('/api/consents', consentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/alerts', alertRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${req.method} ${req.path} not found`
      }
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
