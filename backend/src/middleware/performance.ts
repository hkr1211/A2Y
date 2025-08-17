import { Request, Response, NextFunction } from 'express';
import { performanceLogger } from '../utils/logger';

// Performance metrics storage
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  errorCount: number;
  lastReset: Date;
}

const metrics: Map<string, PerformanceMetrics> = new Map();

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;

  // Initialize metrics for endpoint if not exists
  if (!metrics.has(endpoint)) {
    metrics.set(endpoint, {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      errorCount: 0,
      lastReset: new Date()
    });
  }

  const endpointMetrics = metrics.get(endpoint)!;
  endpointMetrics.requestCount++;

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: BufferEncoding) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Update metrics
    endpointMetrics.averageResponseTime = 
      (endpointMetrics.averageResponseTime * (endpointMetrics.requestCount - 1) + duration) / 
      endpointMetrics.requestCount;

    // Track slow requests (>2 seconds)
    if (duration > 2000) {
      endpointMetrics.slowRequests++;
      performanceLogger.logSlowQuery(`API: ${endpoint}`, duration);
    }

    // Track errors
    if (res.statusCode >= 400) {
      endpointMetrics.errorCount++;
    }

    // Log performance data
    performanceLogger.logAPIPerformance(req, res, duration);

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Database query performance monitor
export const queryPerformanceMonitor = {
  wrapQuery: async <T>(queryName: string, queryFn: () => Promise<T>): Promise<T> => {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await queryFn();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      // Log slow queries (>1 second)
      if (duration > 1000) {
        performanceLogger.logSlowQuery(queryName, duration);
      }
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      performanceLogger.logSlowQuery(`FAILED: ${queryName}`, duration, { error: (error as Error).message });
      throw error;
    }
  }
};

// Memory usage monitor
export const memoryMonitor = {
  checkMemoryUsage: (req: Request, res: Response, next: NextFunction) => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    // Warn if memory usage is high (>500MB)
    if (heapUsedMB > 500) {
      performanceLogger.logMemoryUsage();
      console.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`);
    }
    
    // Add memory info to response headers in development
    if (process.env.NODE_ENV === 'development') {
      res.set('X-Memory-Usage', `${heapUsedMB.toFixed(2)}MB`);
    }
    
    next();
  }
};

// Response compression middleware
export const compressionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Enable compression for JSON responses
  if (req.accepts('gzip') && res.get('Content-Type')?.includes('application/json')) {
    res.set('Content-Encoding', 'gzip');
  }
  
  next();
};

// Cache control middleware
export const cacheControl = {
  // No cache for dynamic content
  noCache: (req: Request, res: Response, next: NextFunction) => {
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    next();
  },

  // Short cache for semi-static content
  shortCache: (_req: Request, res: Response, next: NextFunction) => {
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'ETag': `"${Date.now()}"`
    });
    next();
  },

  // Long cache for static content
  longCache: (_req: Request, res: Response, next: NextFunction) => {
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      'ETag': `"${Date.now()}"`
    });
    next();
  }
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        performanceLogger.logSlowQuery(`TIMEOUT: ${req.method} ${req.path}`, timeoutMs);
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: '请求超时'
          }
        });
      }
    }, timeoutMs);

    // Clear timeout when response is sent
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding?: BufferEncoding) {
      clearTimeout(timeout);
      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Performance metrics endpoint
export const getPerformanceMetrics = (_req: Request, res: Response) => {
  const metricsData = Array.from(metrics.entries()).map(([endpoint, data]) => ({
    endpoint,
    ...data,
    errorRate: data.errorCount / data.requestCount,
    slowRequestRate: data.slowRequests / data.requestCount
  }));

  // System metrics
  const systemMetrics = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform
  };

  res.json({
    success: true,
    data: {
      endpoints: metricsData,
      system: systemMetrics,
      timestamp: new Date().toISOString()
    }
  });
};

// Reset metrics
export const resetMetrics = (_req: Request, res: Response) => {
  metrics.clear();
  res.json({
    success: true,
    message: 'Performance metrics reset',
    timestamp: new Date().toISOString()
  });
};

// Health check endpoint
export const healthCheck = (_req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      used: heapUsedMB,
      total: memUsage.heapTotal / 1024 / 1024,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    },
    timestamp: new Date().toISOString()
  };

  // Check if system is unhealthy
  if (heapUsedMB > 1000) { // >1GB memory usage
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === 'healthy',
    data: health
  });
};

// Cleanup old metrics (run periodically)
export const cleanupMetrics = () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [_endpoint, data] of metrics.entries()) {
    if (data.lastReset < oneHourAgo) {
      // Reset counters but keep the endpoint
      data.requestCount = 0;
      data.averageResponseTime = 0;
      data.slowRequests = 0;
      data.errorCount = 0;
      data.lastReset = new Date();
    }
  }
};

// Run cleanup every hour
setInterval(cleanupMetrics, 60 * 60 * 1000);

export { metrics };