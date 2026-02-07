import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { logger } from './logger.js';

export class MigrationRunner {
  constructor(private pool: pg.Pool) {}

  async run(): Promise<void> {
    // Create migrations tracking table if not exists
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationsDir = path.resolve('src/migrations');

    if (!fs.existsSync(migrationsDir)) {
      logger.info('No migrations directory found, skipping');
      return;
    }

    // Read and sort migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.info('No migration files found');
      return;
    }

    // Get already executed migrations
    const { rows: executed } = await this.pool.query(
      'SELECT name FROM _migrations ORDER BY name'
    );
    const executedSet = new Set(executed.map((r) => r.name));

    // Run pending migrations
    for (const file of files) {
      if (executedSet.has(file)) {
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8').trim();

      if (!sql) {
        logger.warn(`Migration ${file} is empty, skipping`);
        continue;
      }

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [
          file,
        ]);
        await client.query('COMMIT');
        logger.info(`Migration ${file} executed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Migration ${file} failed`, error);
        throw error;
      } finally {
        client.release();
      }
    }
  }
}
