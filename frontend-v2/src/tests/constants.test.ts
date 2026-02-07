import { describe, it, expect } from 'vitest';
import {
  INQUIRY_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  INQUIRY_STATUS_TYPES,
  ORDER_STATUS_TYPES,
  ROLE_LABELS,
  COMPANY_LABELS,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
} from '@/utils/constants';

describe('constants', () => {
  describe('INQUIRY_STATUS_LABELS', () => {
    it('has all inquiry statuses', () => {
      expect(Object.keys(INQUIRY_STATUS_LABELS)).toEqual([
        'draft',
        'published',
        'quoted',
        'converted',
        'cancelled',
      ]);
    });

    it('each status has zh and ja labels', () => {
      Object.values(INQUIRY_STATUS_LABELS).forEach((label) => {
        expect(label.zh).toBeTruthy();
        expect(label.ja).toBeTruthy();
      });
    });
  });

  describe('ORDER_STATUS_LABELS', () => {
    it('has all order statuses', () => {
      expect(Object.keys(ORDER_STATUS_LABELS)).toEqual([
        'pending',
        'confirmed',
        'production',
        'shipped',
        'completed',
        'rejected',
        'cancelled',
      ]);
    });
  });

  describe('INQUIRY_STATUS_TYPES', () => {
    it('maps statuses to Element Plus tag types', () => {
      expect(INQUIRY_STATUS_TYPES.draft).toBe('info');
      expect(INQUIRY_STATUS_TYPES.converted).toBe('success');
      expect(INQUIRY_STATUS_TYPES.cancelled).toBe('danger');
    });
  });

  describe('ORDER_STATUS_TYPES', () => {
    it('maps statuses to Element Plus tag types', () => {
      expect(ORDER_STATUS_TYPES.pending).toBe('info');
      expect(ORDER_STATUS_TYPES.completed).toBe('success');
      expect(ORDER_STATUS_TYPES.cancelled).toBe('danger');
    });
  });

  describe('ROLE_LABELS', () => {
    it('has admin, buyer, supplier', () => {
      expect(ROLE_LABELS.admin.zh).toBe('管理员');
      expect(ROLE_LABELS.buyer.zh).toBe('买方');
      expect(ROLE_LABELS.supplier.zh).toBe('供应商');
    });
  });

  describe('COMPANY_LABELS', () => {
    it('has admin, arroz, yunjie', () => {
      expect(COMPANY_LABELS.arroz.zh).toContain('Arroz');
      expect(COMPANY_LABELS.yunjie.zh).toContain('云杰');
    });
  });

  describe('pagination defaults', () => {
    it('has correct values', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(20);
      expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50]);
    });
  });
});
