import { pool } from '../config/database';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle ES modules compatibility
let __dirname: string;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  const __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} else {
  // Fallback for Jest/CommonJS environment
  __dirname = path.dirname(__filename);
}

export class MigrationRunner {
  private migrationsPath: string;

  constructor() {
    this.migrationsPath = path.join(__dirname, '../migrations');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<void> {
    try {
      // Create migrations tracking table if it doesn't exist
      await this.createMigrationsTable();

      // Get list of migration files
      const migrationFiles = this.getMigrationFiles();

      // Get already executed migrations
      const executedMigrations = await this.getExecutedMigrations();

      // Run pending migrations
      for (const file of migrationFiles) {
        if (!executedMigrations.includes(file)) {
          console.log(`Running migration: ${file}`);
          await this.runMigration(file);
          await this.recordMigration(file);
          console.log(`✅ Migration completed: ${file}`);
        }
      }

      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Create the migrations tracking table
   */
  private async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(query);
  }

  /**
   * Get list of migration files sorted by name
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }

    return fs
      .readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();
  }

  /**
   * Get list of already executed migrations
   */
  private async getExecutedMigrations(): Promise<string[]> {
    const query = 'SELECT filename FROM migrations ORDER BY executed_at';
    const result = await pool.query(query);
    return result.rows.map(row => row.filename);
  }

  /**
   * Run a single migration file
   */
  private async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsPath, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Execute the migration in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Record that a migration has been executed
   */
  private async recordMigration(filename: string): Promise<void> {
    const query = 'INSERT INTO migrations (filename) VALUES ($1)';
    await pool.query(query, [filename]);
  }
}