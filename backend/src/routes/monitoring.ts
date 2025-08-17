import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';
import { 
  getPerformanceMetrics, 
  resetMetrics, 
  healthCheck 
} from '../middleware/performance';
import { violationStore } from '../middleware/rateLimiter';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

const router = Router();

// All monitoring endpoints require admin access
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Health check endpoint
router.get('/health', healthCheck);

// Performance metrics endpoint
router.get('/performance', getPerformanceMetrics);

// Reset performance metrics
router.post('/performance/reset', resetMetrics);

// Rate limiting violations
router.get('/rate-limit-violations', (req, res) => {
  const violations = Array.from(violationStore.entries()).map(([ip, data]) => ({
    ip,
    violationCount: data.count,
    lastViolation: data.lastViolation
  }));

  res.json({
    success: true,
    data: {
      violations,
      totalViolations: violations.reduce((sum, v) => sum + v.violationCount, 0),
      timestamp: new Date().toISOString()
    }
  });
});

// Database performance metrics
router.get('/database', async (req, res) => {
  try {
    // Get database connection info
    const connectionInfo = await pool.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    // Get database size
    const dbSize = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `);

    // Get table sizes
    const tableSizes = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC
      LIMIT 10
    `);

    // Get slow queries (if pg_stat_statements is available)
    let slowQueries = [];
    try {
      const slowQueriesResult = await pool.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        ORDER BY mean_time DESC 
        LIMIT 10
      `);
      slowQueries = slowQueriesResult.rows;
    } catch (error) {
      // pg_stat_statements extension not available
    }

    // Get index usage
    const indexUsage = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC 
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        connections: connectionInfo.rows[0],
        size: dbSize.rows[0],
        tableSizes: tableSizes.rows,
        slowQueries,
        indexUsage: indexUsage.rows,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Database metrics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_METRICS_ERROR',
        message: 'Failed to retrieve database metrics'
      }
    });
  }
});

// System resource usage
router.get('/system', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.json({
    success: true,
    data: {
      uptime: process.uptime(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date().toISOString()
    }
  });
});

// Security events log
router.get('/security-events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const severity = req.query.severity as string;

    // This would typically read from a security events table
    // For now, we'll return a placeholder response
    const events = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'AUTH_ATTEMPT',
        severity: 'medium',
        ip: '192.168.1.100',
        description: 'Failed login attempt',
        details: { username: 'admin', attempts: 3 }
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: 'RATE_LIMIT_VIOLATION',
        severity: 'low',
        ip: '192.168.1.101',
        description: 'Rate limit exceeded',
        details: { endpoint: '/api/auth/login', violations: 5 }
      }
    ];

    const filteredEvents = severity 
      ? events.filter(e => e.severity === severity)
      : events;

    const paginatedEvents = filteredEvents.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        events: paginatedEvents,
        total: filteredEvents.length,
        limit,
        offset,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Security events error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SECURITY_EVENTS_ERROR',
        message: 'Failed to retrieve security events'
      }
    });
  }
});

// Application logs
router.get('/logs', async (req, res) => {
  try {
    const level = req.query.level as string || 'info';
    const limit = parseInt(req.query.limit as string) || 100;
    
    // This would typically read from log files or a logging service
    // For now, we'll return recent log entries
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Server started successfully',
        service: 'trade-inquiry-system'
      },
      {
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        level: 'warn',
        message: 'High memory usage detected',
        service: 'trade-inquiry-system'
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'error',
        message: 'Database connection timeout',
        service: 'trade-inquiry-system'
      }
    ];

    const filteredLogs = logs.filter(log => 
      level === 'all' || log.level === level
    ).slice(0, limit);

    res.json({
      success: true,
      data: {
        logs: filteredLogs,
        level,
        limit,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Logs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGS_ERROR',
        message: 'Failed to retrieve logs'
      }
    });
  }
});

// Clear rate limit violations
router.post('/rate-limit-violations/clear', (req, res) => {
  violationStore.clear();
  
  res.json({
    success: true,
    message: 'Rate limit violations cleared',
    timestamp: new Date().toISOString()
  });
});

export default router;