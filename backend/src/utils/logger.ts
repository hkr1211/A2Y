import winston from 'winston';
import path from 'path';
import { Request, Response } from 'express';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'trade-inquiry-system' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    }),
    
    // Security logs
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Performance logs
    new winston.transports.File({
      filename: path.join(logsDir, 'performance.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Security event logger
export const securityLogger = {
  logAuthAttempt: (req: Request, success: boolean, username?: string) => {
    logger.warn('Authentication attempt', {
      type: 'AUTH_ATTEMPT',
      success,
      username,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  },

  logRateLimitViolation: (req: Request, endpoint: string) => {
    logger.warn('Rate limit violation', {
      type: 'RATE_LIMIT_VIOLATION',
      endpoint,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });
  },

  logSuspiciousActivity: (req: Request, activity: string, details?: any) => {
    logger.warn('Suspicious activity detected', {
      type: 'SUSPICIOUS_ACTIVITY',
      activity,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  },

  logFileUploadAttempt: (req: Request, filename: string, success: boolean, error?: string) => {
    logger.info('File upload attempt', {
      type: 'FILE_UPLOAD',
      filename,
      success,
      error,
      ip: req.ip,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });
  },

  logPermissionViolation: (req: Request, resource: string, action: string) => {
    logger.warn('Permission violation', {
      type: 'PERMISSION_VIOLATION',
      resource,
      action,
      ip: req.ip,
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      timestamp: new Date().toISOString()
    });
  }
};

// Performance logger
export const performanceLogger = {
  logSlowQuery: (query: string, duration: number, params?: any) => {
    logger.warn('Slow database query', {
      type: 'SLOW_QUERY',
      query,
      duration,
      params,
      timestamp: new Date().toISOString()
    });
  },

  logAPIPerformance: (req: Request, res: Response, duration: number) => {
    const logLevel = duration > 5000 ? 'warn' : 'info';
    logger.log(logLevel, 'API performance', {
      type: 'API_PERFORMANCE',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
  },

  logMemoryUsage: () => {
    const memUsage = process.memoryUsage();
    logger.info('Memory usage', {
      type: 'MEMORY_USAGE',
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    });
  }
};

// Business event logger
export const businessLogger = {
  logInquiryCreated: (userId: string, inquiryId: string, inquiryNumber: string) => {
    logger.info('Inquiry created', {
      type: 'INQUIRY_CREATED',
      userId,
      inquiryId,
      inquiryNumber,
      timestamp: new Date().toISOString()
    });
  },

  logQuotationSubmitted: (userId: string, inquiryId: string, quotationId: string) => {
    logger.info('Quotation submitted', {
      type: 'QUOTATION_SUBMITTED',
      userId,
      inquiryId,
      quotationId,
      timestamp: new Date().toISOString()
    });
  },

  logOrderCreated: (userId: string, orderId: string, orderNumber: string, source: 'inquiry' | 'direct') => {
    logger.info('Order created', {
      type: 'ORDER_CREATED',
      userId,
      orderId,
      orderNumber,
      source,
      timestamp: new Date().toISOString()
    });
  },

  logOrderStatusChanged: (userId: string, orderId: string, oldStatus: string, newStatus: string) => {
    logger.info('Order status changed', {
      type: 'ORDER_STATUS_CHANGED',
      userId,
      orderId,
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    });
  },

  logChatMessage: (senderId: string, relatedId: string, relatedType: string) => {
    logger.info('Chat message sent', {
      type: 'CHAT_MESSAGE_SENT',
      senderId,
      relatedId,
      relatedType,
      timestamp: new Date().toISOString()
    });
  }
};

// Error logger with context
export const errorLogger = {
  logError: (error: Error, context?: any) => {
    logger.error('Application error', {
      type: 'APPLICATION_ERROR',
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  },

  logDatabaseError: (error: Error, query?: string, params?: any) => {
    logger.error('Database error', {
      type: 'DATABASE_ERROR',
      message: error.message,
      stack: error.stack,
      query,
      params,
      timestamp: new Date().toISOString()
    });
  },

  logExternalServiceError: (service: string, error: Error, request?: any) => {
    logger.error('External service error', {
      type: 'EXTERNAL_SERVICE_ERROR',
      service,
      message: error.message,
      stack: error.stack,
      request,
      timestamp: new Date().toISOString()
    });
  }
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    type: 'REQUEST',
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: BufferEncoding) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Response sent', {
      type: 'RESPONSE',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userId: (req as any).user?.id,
      timestamp: new Date().toISOString()
    });

    // Log performance if slow
    performanceLogger.logAPIPerformance(req, res, duration);

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// System health monitoring
export const healthMonitor = {
  startMonitoring: () => {
    // Log memory usage every 5 minutes
    setInterval(() => {
      performanceLogger.logMemoryUsage();
    }, 5 * 60 * 1000);

    // Log system health every hour
    setInterval(() => {
      logger.info('System health check', {
        type: 'HEALTH_CHECK',
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date().toISOString()
      });
    }, 60 * 60 * 1000);
  }
};

export default logger;