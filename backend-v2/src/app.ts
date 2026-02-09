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
import { QuotationRepository } from './repositories/QuotationRepository.js';
import { QuotationService } from './services/QuotationService.js';
import { QuotationController } from './controllers/QuotationController.js';
import { createQuotationRoutes } from './routes/quotation.js';
import { OrderRepository } from './repositories/OrderRepository.js';
import { OrderService } from './services/OrderService.js';
import { OrderController } from './controllers/OrderController.js';
import { createOrderRoutes } from './routes/order.js';
import { FileAttachmentRepository } from './repositories/FileAttachmentRepository.js';
import { FileService } from './services/FileService.js';
import { FileController } from './controllers/FileController.js';
import { createFileRoutes } from './routes/file.js';
import { ChatMessageRepository } from './repositories/ChatMessageRepository.js';
import { ChatService } from './services/ChatService.js';
import { ChatController } from './controllers/ChatController.js';
import { createChatRoutes } from './routes/chat.js';
import { NotificationRepository } from './repositories/NotificationRepository.js';
import { NotificationService } from './services/NotificationService.js';
import { NotificationController } from './controllers/NotificationController.js';
import { createNotificationRoutes } from './routes/notification.js';

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
    const quotationRepo = new QuotationRepository(pool);
    const fileRepo = new FileAttachmentRepository(pool);

    const inquiryService = new InquiryService(inquiryRepo, quotationRepo, fileRepo);
    const inquiryController = new InquiryController(inquiryService);
    const quotationService = new QuotationService(quotationRepo, inquiryRepo);
    const quotationController = new QuotationController(quotationService);

    const orderRepo = new OrderRepository(pool);
    const orderService = new OrderService(
      orderRepo,
      inquiryRepo,
      quotationRepo,
      fileRepo
    );
    const orderController = new OrderController(orderService);

    const fileService = new FileService(fileRepo);
    const fileController = new FileController(fileService);

    const chatRepo = new ChatMessageRepository(pool);
    const notificationRepo = new NotificationRepository(pool);
    const notificationService = new NotificationService(notificationRepo);
    const chatService = new ChatService(chatRepo, notificationService);
    const chatController = new ChatController(chatService);
    const notificationController = new NotificationController(notificationService);

    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/users', createUserRoutes(userController));
    app.use('/api/inquiries', createInquiryRoutes(inquiryController));
    app.use('/api/quotations', createQuotationRoutes(quotationController));
    app.use('/api/orders', createOrderRoutes(orderController));
    app.use('/api/files', createFileRoutes(fileController));
    app.use('/api/chat', createChatRoutes(chatController));
    app.use('/api/notifications', createNotificationRoutes(notificationController));

    // Serve uploaded files (local dev only, use OSS in production)
    app.use('/uploads', express.static('uploads'));
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
