import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler.js';
import { ok } from './shared/response.js';

export function createApp(): express.Express {
  const app = express();

  // Built-in middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json(ok({ status: 'healthy' }));
  });

  // API root
  app.get('/api', (_req, res) => {
    res.json(ok({ message: 'A2Y Trade System API v2.0' }));
  });

  // Routes will be registered here in later phases
  // app.use('/api/auth', authRoutes);
  // app.use('/api/users', userRoutes);
  // etc.

  // 404 handler for API routes
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '接口不存在',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
