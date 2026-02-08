import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDatabase, closeDatabase, getPool } from './config/database.js';
import { MigrationRunner } from './utils/migrationRunner.js';
import { InitializationService } from './services/InitializationService.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    // Connect to database
    const pool = await connectDatabase();

    // Run migrations
    const migrationRunner = new MigrationRunner(pool);
    await migrationRunner.run();

    // Seed default admin user
    const initService = new InitializationService(pool);
    await initService.seedDefaultAdmin();

    // Create and start Express app
    const app = createApp(getPool());
    const port = parseInt(process.env.PORT || '3000', 10);

    const server = app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      server.close(async () => {
        await closeDatabase();
        logger.info('Server shut down complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

main();
