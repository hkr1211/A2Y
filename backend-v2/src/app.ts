import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { errorHandler } from './middleware/errorHandler.js';
import { ok } from './shared/response.js';
import { UserRepository } from './repositories/UserRepository.js';
import { AuthService } from './services/AuthService.js';
import { UserService } from './services/UserService.js';
import { AuthController } from './controllers/AuthController.js';
import { UserController } from './controllers/UserController.js';
import { createAuthRoutes } from './routes/auth.js';
import { createUserRoutes } from './routes/user.js';
import { InquiryRepository } from './repositories/InquiryRepository.js';
import { InquiryService } from './services/InquiryService.js';
import { InquiryController } from './controllers/InquiryController.js';
import { createInquiryRoutes } from './routes/inquiry.js';

export function createApp(pool?: pg.Pool): express.Express {
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

  // Wire up business routes when pool is available
  if (pool) {
    const userRepo = new UserRepository(pool);
    const authService = new AuthService(userRepo);
    const userService = new UserService(userRepo);
    const authController = new AuthController(authService);
    const userController = new UserController(userService);

    const inquiryRepo = new InquiryRepository(pool);
    const inquiryService = new InquiryService(inquiryRepo);
    const inquiryController = new InquiryController(inquiryService);

    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/users', createUserRoutes(userController));
    app.use('/api/inquiries', createInquiryRoutes(inquiryController));
  }

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
