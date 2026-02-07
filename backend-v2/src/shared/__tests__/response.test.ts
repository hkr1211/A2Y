import { jest } from '@jest/globals';
import { ok, created, paginated } from '../response.js';

describe('Response helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-07T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ok()', () => {
    it('wraps data in success response', () => {
      const result = ok({ id: '123', name: 'test' });
      expect(result).toEqual({
        success: true,
        data: { id: '123', name: 'test' },
        timestamp: '2026-02-07T12:00:00.000Z',
      });
    });

    it('works with null data', () => {
      const result = ok(null);
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('created()', () => {
    it('wraps data in success response', () => {
      const result = created({ id: '456' });
      expect(result).toEqual({
        success: true,
        data: { id: '456' },
        timestamp: '2026-02-07T12:00:00.000Z',
      });
    });
  });

  describe('paginated()', () => {
    it('wraps items with pagination metadata', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = paginated(items, 50, 1, 20);
      expect(result).toEqual({
        success: true,
        data: {
          items,
          total: 50,
          page: 1,
          pageSize: 20,
        },
        timestamp: '2026-02-07T12:00:00.000Z',
      });
    });

    it('works with empty items', () => {
      const result = paginated([], 0, 1, 20);
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    });
  });
});
