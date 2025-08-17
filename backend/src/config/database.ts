import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'trade_inquiry_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Redis client
export const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

// Database connection initialization
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();

    // Connect to Redis (optional for development)
    try {
      await redisClient.connect();
      console.log('✅ Redis connected successfully');
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', redisError.message);
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('💡 Please check your PostgreSQL configuration:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check your password in .env file');
    console.log('   3. Run fix-postgres-password.bat to reset password');
    process.exit(1);
  }
};

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  try {
    await pool.end();
    await redisClient.quit();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};