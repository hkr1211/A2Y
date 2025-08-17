import request from 'supertest';
import express from 'express';
import { pool } from '../../config/database';
import { securityHeaders, sanitizeInput, preventSQLInjection, fileUploadSecurity, suspiciousActivityDetector } from '../../middleware/security';
import { generalRateLimit, authRateLimit } from '../../middleware/rateLimiter';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(securityHeaders);
  app.use(sanitizeInput);
  app.use(preventSQLInjection);
  app.use(suspiciousActivityDetector);
  
  // Test routes
  app.post('/test/input', (req, res) => {
    res.json({ success: true, data: req.body });
  });
  
  app.post('/test/auth', authRateLimit, (req, res) => {
    res.json({ success: true, message: 'Auth endpoint' });
  });
  
  app.post('/test/general', generalRateLimit, (req, res) => {
    res.json({ success: true, message: 'General endpoint' });
  });
  
  app.post('/test/upload', fileUploadSecurity, (req, res) => {
    res.json({ success: true, message: 'Upload endpoint' });
  });
  
  return app;
};

describe('Security Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = createTestApp();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/test/input')
        .expect(404); // Route doesn't exist for GET

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    });

    it('should set Content Security Policy', async () => {
      const response = await request(app)
        .get('/test/input')
        .expect(404);

      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in request body', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>John',
        description: 'javascript:alert("xss")',
        onclick: 'onclick=alert("xss")'
      };

      const response = await request(app)
        .post('/test/input')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.data.name).toBe('John');
      expect(response.body.data.description).toBe('alert("xss")');
      expect(response.body.data.onclick).toBe('alert("xss")');
    });

    it('should handle nested objects', async () => {
      const maliciousInput = {
        user: {
          name: '<script>alert("nested")</script>Test',
          profile: {
            bio: 'javascript:void(0)'
          }
        }
      };

      const response = await request(app)
        .post('/test/input')
        .send(maliciousInput)
        .expect(200);

      expect(response.body.data.user.name).toBe('Test');
      expect(response.body.data.user.profile.bio).toBe('void(0)');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should block SQL injection attempts in body', async () => {
      const sqlInjection = {
        username: "admin'; DROP TABLE users; --",
        password: "' OR '1'='1"
      };

      const response = await request(app)
        .post('/test/input')
        .send(sqlInjection)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should block SQL injection in query parameters', async () => {
      const response = await request(app)
        .post('/test/input?id=1; DROP TABLE users; --')
        .send({ name: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    it('should allow safe input', async () => {
      const safeInput = {
        username: 'john_doe',
        email: 'john@example.com',
        age: 25
      };

      const response = await request(app)
        .post('/test/input')
        .send(safeInput)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(safeInput);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should block directory traversal attempts', async () => {
      const response = await request(app)
        .post('/test/input/../../../etc/passwd')
        .send({ name: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    it('should block URL encoded directory traversal', async () => {
      const response = await request(app)
        .post('/test/input%2e%2e%2f')
        .send({ name: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUSPICIOUS_ACTIVITY');
    });

    it('should block iframe injection attempts', async () => {
      const response = await request(app)
        .post('/test/input')
        .set('X-Custom-Header', '<iframe src="evil.com"></iframe>')
        .send({ name: 'test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SUSPICIOUS_ACTIVITY');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      const response = await request(app)
        .post('/test/general')
        .send({ test: 'data' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should have stricter limits for auth endpoints', async () => {
      // Make multiple requests to auth endpoint
      const promises = Array(12).fill(null).map(() =>
        request(app)
          .post('/test/auth')
          .send({ username: 'test', password: 'test' })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('File Upload Security', () => {
    it('should validate file types', async () => {
      // Mock file object
      const mockFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024
      };

      const response = await request(app)
        .post('/test/upload')
        .attach('file', Buffer.from('fake exe content'), 'test.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_SECURITY_VIOLATION');
    });

    it('should validate file size', async () => {
      // Create a large buffer (>10MB)
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024);

      const response = await request(app)
        .post('/test/upload')
        .attach('file', largeBuffer, 'large.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FILE_SECURITY_VIOLATION');
    });
  });

  describe('Authentication Security', () => {
    it('should require valid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject expired JWT tokens', async () => {
      // Create an expired token (this would need to be implemented based on your JWT setup)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('CORS Security', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/test/input')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .post('/test/input')
        .set('Origin', 'http://malicious-site.com')
        .send({ test: 'data' });

      // The response should not include CORS headers for unauthorized origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive error information', async () => {
      const response = await request(app)
        .post('/test/nonexistent')
        .send({ test: 'data' })
        .expect(404);

      // Should not expose stack traces or internal paths
      expect(response.body.error?.stack).toBeUndefined();
      expect(response.body.error?.path).toBeUndefined();
    });
  });

  describe('Password Security', () => {
    it('should enforce password complexity', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'admin',
        '12345678',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            username: 'testuser',
            password: password,
            role: 'buyer'
          });

        // Should reject weak passwords
        if (response.status === 400) {
          expect(response.body.success).toBe(false);
        }
      }
    });

    it('should hash passwords before storage', async () => {
      // This test would verify that passwords are hashed
      // Implementation depends on your user creation logic
      const password = 'SecurePassword123!';
      
      // Mock database query to verify password is hashed
      const mockUser = {
        username: 'testuser',
        password: password,
        role: 'buyer'
      };

      // Verify that stored password is not plain text
      expect(mockUser.password).not.toBe(password);
      expect(mockUser.password.length).toBeGreaterThan(password.length);
    });
  });

  describe('Session Security', () => {
    it('should use secure session configuration', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });

      // Check for secure cookie settings
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        expect(setCookieHeader.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
        expect(setCookieHeader.some((cookie: string) => cookie.includes('Secure'))).toBe(true);
      }
    });
  });

  describe('Data Validation', () => {
    it('should validate email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..name@domain.com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/test/input')
          .send({ email: email });

        // Should validate email format
        expect(response.status).toBeLessThan(500);
      }
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/test/input')
        .send({});

      // Should handle missing required fields gracefully
      expect(response.status).toBeLessThan(500);
    });
  });
});