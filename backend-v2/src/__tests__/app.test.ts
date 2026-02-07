import request from 'supertest';
import { createApp } from '../app.js';

describe('Express App', () => {
  const app = createApp();

  describe('GET /health', () => {
    it('returns healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api', () => {
    it('returns API info', async () => {
      const res = await request(app).get('/api');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('A2Y Trade System API v2.0');
    });
  });

  describe('404 handler', () => {
    it('returns 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('error handling', () => {
    it('handles JSON parse errors', async () => {
      const res = await request(app)
        .post('/api')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(res.status).toBe(400);
    });
  });
});
