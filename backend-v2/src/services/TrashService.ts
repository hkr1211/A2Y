import pg from 'pg';
import { AppError } from '../shared/errors.js';
import { logger } from '../utils/logger.js';

interface TrashItem {
  id: string;
  type: string;
  title: string;
  deletedAt: string;
}

export class TrashService {
  constructor(private pool: pg.Pool) {}

  async list(params: {
    page: number;
    pageSize: number;
    type?: string;
  }) {
    const items: TrashItem[] = [];
    let total = 0;

    const types = params.type
      ? [params.type]
      : ['inquiry', 'order', 'user'];

    for (const type of types) {
      const result = await this.queryDeletedItems(type);
      items.push(...result);
    }

    // Sort by deletedAt DESC
    items.sort(
      (a, b) =>
        new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
    );

    total = items.length;
    const offset = (params.page - 1) * params.pageSize;
    const paged = items.slice(offset, offset + params.pageSize);

    return { items: paged, total };
  }

  private async queryDeletedItems(type: string): Promise<TrashItem[]> {
    switch (type) {
      case 'inquiry': {
        const result = await this.pool.query(
          `SELECT id, inquiry_number, product_name, deleted_at
           FROM inquiries WHERE deleted_at IS NOT NULL
           ORDER BY deleted_at DESC`
        );
        return result.rows.map((r) => ({
          id: r.id,
          type: 'inquiry',
          title: `${r.inquiry_number} - ${r.product_name}`,
          deletedAt: r.deleted_at,
        }));
      }
      case 'order': {
        const result = await this.pool.query(
          `SELECT id, order_number, product_name, deleted_at
           FROM orders WHERE deleted_at IS NOT NULL
           ORDER BY deleted_at DESC`
        );
        return result.rows.map((r) => ({
          id: r.id,
          type: 'order',
          title: `${r.order_number} - ${r.product_name}`,
          deletedAt: r.deleted_at,
        }));
      }
      case 'user': {
        const result = await this.pool.query(
          `SELECT id, username, deleted_at
           FROM users WHERE deleted_at IS NOT NULL
           ORDER BY deleted_at DESC`
        );
        return result.rows.map((r) => ({
          id: r.id,
          type: 'user',
          title: r.username,
          deletedAt: r.deleted_at,
        }));
      }
      default:
        return [];
    }
  }

  async restore(type: string, id: string, username: string) {
    const table = this.getTable(type);
    const result = await this.pool.query(
      `UPDATE ${table} SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      throw AppError.notFound('数据不存在或未被删除');
    }

    logger.info(
      `[AUDIT] User ${username} restored ${type} ${id}`
    );

    return { message: '数据已恢复' };
  }

  async permanentDelete(type: string, id: string, username: string) {
    const table = this.getTable(type);
    const result = await this.pool.query(
      `DELETE FROM ${table} WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id`,
      [id]
    );
    if (result.rowCount === 0) {
      throw AppError.notFound('数据不存在或未被删除');
    }

    logger.info(
      `[AUDIT] User ${username} permanently deleted ${type} ${id}`
    );

    return { message: '数据已永久删除' };
  }

  private getTable(type: string): string {
    switch (type) {
      case 'inquiry':
        return 'inquiries';
      case 'order':
        return 'orders';
      case 'user':
        return 'users';
      default:
        throw AppError.validation(`不支持的类型: ${type}`);
    }
  }
}
