import bcrypt from 'bcryptjs';
import pg from 'pg';
import { logger } from '../utils/logger.js';

export class InitializationService {
  constructor(private pool: pg.Pool) {}

  async seedDefaultAdmin(): Promise<void> {
    // Check if admin already exists
    const { rows } = await this.pool.query(
      "SELECT id FROM users WHERE username = 'admin' AND deleted_at IS NULL"
    );

    if (rows.length > 0) {
      logger.info('Default admin already exists, skipping seed');
      return;
    }

    const hash = await bcrypt.hash('admin123', 10);
    await this.pool.query(
      `INSERT INTO users (username, password_hash, role, company, language)
       VALUES ('admin', $1, 'admin', 'admin', 'zh')
       ON CONFLICT (username) DO NOTHING`,
      [hash]
    );

    logger.info('Default admin user created (admin/admin123)');
  }
}
