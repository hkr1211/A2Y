import { UserModel } from '../models/User';
import { MigrationRunner } from '../utils/migrationRunner';
import { DEFAULT_ADMIN } from '../types/user';

export class InitializationService {
  private migrationRunner: MigrationRunner;

  constructor() {
    this.migrationRunner = new MigrationRunner();
  }

  /**
   * Initialize the system by running migrations and creating default admin
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting system initialization...');

      // Step 1: Run database migrations
      await this.runMigrations();

      // Step 2: Create default admin if no users exist
      await this.createDefaultAdmin();

      console.log('✅ System initialization completed successfully');
    } catch (error) {
      console.error('❌ System initialization failed:', error);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    console.log('📊 Running database migrations...');
    await this.migrationRunner.runMigrations();
  }

  /**
   * Create default admin account if no users exist in the system
   */
  private async createDefaultAdmin(): Promise<void> {
    console.log('👤 Checking for existing users...');

    const hasUsers = await UserModel.hasUsers();
    
    if (!hasUsers) {
      console.log('👤 No users found. Creating default admin account...');
      
      try {
        const adminUser = await UserModel.create(DEFAULT_ADMIN);
        console.log(`✅ Default admin created successfully with ID: ${adminUser.id}`);
        console.log(`📝 Default admin credentials:`);
        console.log(`   Username: ${DEFAULT_ADMIN.username}`);
        console.log(`   Password: ${DEFAULT_ADMIN.password}`);
        console.log(`⚠️  Please change the default password after first login!`);
      } catch (error) {
        // Check if the error is due to admin already existing
        if (error instanceof Error && error.message.includes('Username already exists')) {
          console.log('ℹ️  Default admin account already exists');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️  Users already exist in the system. Skipping default admin creation.');
    }
  }

  /**
   * Check if the system is properly initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      // Check if users table exists and has at least one user
      const hasUsers = await UserModel.hasUsers();
      return hasUsers;
    } catch (error) {
      console.error('Error checking system initialization status:', error);
      return false;
    }
  }

  /**
   * Reset the system by recreating the default admin
   * WARNING: This should only be used in development/testing
   */
  async resetSystem(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('System reset is not allowed in production environment');
    }

    console.log('⚠️  Resetting system...');
    
    try {
      // Find and delete existing admin user if exists
      const existingAdmin = await UserModel.findByUsername(DEFAULT_ADMIN.username);
      if (existingAdmin) {
        await UserModel.delete(existingAdmin.id);
        console.log('🗑️  Existing admin user deleted');
      }

      // Create new default admin
      await this.createDefaultAdmin();
      
      console.log('✅ System reset completed');
    } catch (error) {
      console.error('❌ System reset failed:', error);
      throw error;
    }
  }

  /**
   * Get system status information
   */
  async getSystemStatus(): Promise<{
    initialized: boolean;
    userCount: number;
    hasDefaultAdmin: boolean;
  }> {
    try {
      const initialized = await this.isInitialized();
      
      if (!initialized) {
        return {
          initialized: false,
          userCount: 0,
          hasDefaultAdmin: false
        };
      }

      const users = await UserModel.findAll();
      const userCount = users.length;
      const hasDefaultAdmin = users.some(user => user.username === DEFAULT_ADMIN.username);

      return {
        initialized,
        userCount,
        hasDefaultAdmin
      };
    } catch (error) {
      console.error('Error getting system status:', error);
      return {
        initialized: false,
        userCount: 0,
        hasDefaultAdmin: false
      };
    }
  }
}