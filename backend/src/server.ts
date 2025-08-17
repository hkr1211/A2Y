import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
// 需要先安装 compression 包和其类型声明文件
// npm install compression @types/compression
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeDatabase, closeDatabase, pool } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { setUserLanguage } from './middleware/language';
import { InitializationService } from './services/InitializationService';
import { FileController } from './controllers/FileController';
import { SocketService } from './services/SocketService';
import { requestLogger, healthMonitor } from './utils/logger';
import { 
  securityHeaders, 
  sanitizeInput, 
  preventSQLInjection, 
  fileUploadSecurity, 
  requestSizeLimiter, 
  suspiciousActivityDetector 
} from './middleware/security';
import { 
  generalRateLimit, 
  authRateLimit, 
  uploadRateLimit, 
  chatRateLimit, 
  translationRateLimit, 
  adminRateLimit 
} from './middleware/rateLimiter';
import { 
  performanceMonitor, 
  memoryMonitor, 
  requestTimeout, 
  cacheControl,
  getPerformanceMetrics,
  resetMetrics,
  healthCheck
} from './middleware/performance';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import inquiryRoutes from './routes/inquiry';
import quotationRoutes from './routes/quotation';
import notificationRoutes from './routes/notification';
import fileRoutes from './routes/file';
import chatRoutes from './routes/chat';
import monitoringRoutes from './routes/monitoring';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Initialize Socket service
let socketService: SocketService;

// Security middleware (must be first)
app.use(securityHeaders);
app.use(requestSizeLimiter);
app.use(suspiciousActivityDetector);
app.use(sanitizeInput);
app.use(preventSQLInjection);

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));
//app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Performance and monitoring middleware
app.use(requestLogger);
app.use(performanceMonitor);
app.use(memoryMonitor.checkMemoryUsage);
app.use(requestTimeout(30000)); // 30 second timeout

// Rate limiting
app.use(generalRateLimit);

// Health check and monitoring endpoints
app.get('/health', cacheControl.shortCache, healthCheck);
app.get('/metrics', adminRateLimit, getPerformanceMetrics);
app.post('/metrics/reset', adminRateLimit, resetMetrics);

// API routes
app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Trade Inquiry Order System API',
      version: '1.0.0',
    },
  });
});

// Authentication routes (with stricter rate limiting)
app.use('/api/auth', authRateLimit, authRoutes);

// Apply language middleware to all API routes (after auth routes)
app.use('/api', setUserLanguage);

// User management routes (admin operations)
app.use('/api/users', adminRateLimit, userRoutes);

// Dashboard routes (cached)
app.use('/api/dashboard', cacheControl.shortCache, dashboardRoutes);

// Inquiry routes
app.use('/api/inquiries', inquiryRoutes);

// Quotation routes
app.use('/api/quotations', quotationRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// File routes (with upload rate limiting and security)
app.use('/api/files', uploadRateLimit, fileUploadSecurity, fileRoutes);

// Chat routes (with chat rate limiting)
app.use('/api/chat', chatRateLimit, chatRoutes);

// Translation routes (with translation rate limiting)
app.use('/api/translate', translationRateLimit, (req, res) => {
  res.json({ success: true, message: 'Translation endpoint placeholder' });
});

// Monitoring and admin routes
app.use('/api/monitoring', monitoringRoutes);

// Initialize Socket.IO service
//socketService = new SocketService(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
    },
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database connections
    await initializeDatabase();
    
    // Initialize controllers with database connection
    FileController.initialize(pool);
    
    // Initialize Socket.IO service
    socketService = new SocketService(io);
    
    // Make socket service available globally
    (global as any).socketService = socketService;
    
    // Initialize notification service with event listeners
    const { NotificationService } = await import('./services/NotificationService');
    const notificationService = new NotificationService(pool);
    notificationService.setupEventListeners();
    
    // Make notification service available globally
    (global as any).notificationService = notificationService;
    
    // Initialize system (run migrations and create default admin)
    const initService = new InitializationService();
    await initService.initialize();
    
    // Start health monitoring
    healthMonitor.startMonitoring();
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Performance metrics: http://localhost:${PORT}/metrics`);
      console.log(`🔌 Socket.IO ready for connections`);
      console.log(`🛡️  Security middleware active`);
      console.log(`⚡ Performance monitoring enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await closeDatabase();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await closeDatabase();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

startServer();