import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { pool } from '../config/database';
import type { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserRole, 
  Company, 
  Language 
} from '../types/user';

export class UserModel {
  /**
   * Validation schema for creating a user
   */
  private static createUserSchema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .required()
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 50 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 100 characters',
        'any.required': 'Password is required'
      }),
    role: Joi.string()
      .valid('admin', 'buyer', 'supplier')
      .required()
      .messages({
        'any.only': 'Role must be one of: admin, buyer, supplier',
        'any.required': 'Role is required'
      }),
    company: Joi.string()
      .valid('arroz', 'yunjie', 'admin')
      .required()
      .messages({
        'any.only': 'Company must be one of: arroz, yunjie, admin',
        'any.required': 'Company is required'
      }),
    language: Joi.string()
      .valid('zh', 'ja')
      .default('zh')
      .messages({
        'any.only': 'Language must be one of: zh, ja'
      })
  });

  /**
   * Validation schema for updating a user
   */
  private static updateUserSchema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(50)
      .messages({
        'string.alphanum': 'Username must contain only alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 50 characters'
      }),
    password: Joi.string()
      .min(6)
      .max(100)
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 100 characters'
      }),
    role: Joi.string()
      .valid('admin', 'buyer', 'supplier')
      .messages({
        'any.only': 'Role must be one of: admin, buyer, supplier'
      }),
    company: Joi.string()
      .valid('arroz', 'yunjie', 'admin')
      .messages({
        'any.only': 'Company must be one of: arroz, yunjie, admin'
      }),
    language: Joi.string()
      .valid('zh', 'ja')
      .messages({
        'any.only': 'Language must be one of: zh, ja'
      })
  }).min(1); // At least one field must be provided for update

  /**
   * Validate user creation data
   */
  static validateCreateUser(data: CreateUserRequest): { error?: string; value?: CreateUserRequest } {
    const { error, value } = this.createUserSchema.validate(data);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  /**
   * Validate user update data
   */
  static validateUpdateUser(data: UpdateUserRequest): { error?: string; value?: UpdateUserRequest } {
    const { error, value } = this.updateUserSchema.validate(data);
    if (error) {
      return { error: error.details[0].message };
    }
    return { value };
  }

  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Create a new user
   */
  static async create(userData: CreateUserRequest): Promise<User> {
    // Validate input data
    const { error, value } = this.validateCreateUser(userData);
    if (error) {
      throw new Error(`Validation error: ${error}`);
    }

    const validatedData = value!;

    // Check if username already exists
    const existingUser = await this.findByUsername(validatedData.username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(validatedData.password);

    // Generate UUID
    const id = uuidv4();

    // Insert user into database
    const query = `
      INSERT INTO users (id, username, password_hash, role, company, language)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, role, company, language, created_at, updated_at
    `;

    const values = [
      id,
      validatedData.username,
      passwordHash,
      validatedData.role,
      validatedData.company,
      validatedData.language || 'zh'
    ];

    const result = await pool.query(query, values);
    const user = result.rows[0];

    return {
      id: user.id,
      username: user.username,
      password: passwordHash, // Include for consistency with interface
      role: user.role as UserRole,
      company: user.company as Company,
      language: user.language as Language,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, role, company, language, created_at, updated_at
      FROM users
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password_hash,
      role: user.role as UserRole,
      company: user.company as Company,
      language: user.language as Language,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Find user by username
   */
  static async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, username, password_hash, role, company, language, created_at, updated_at
      FROM users
      WHERE username = $1
    `;

    const result = await pool.query(query, [username]);
    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      username: user.username,
      password: user.password_hash,
      role: user.role as UserRole,
      company: user.company as Company,
      language: user.language as Language,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Get all users
   */
  static async findAll(): Promise<Omit<User, 'password'>[]> {
    const query = `
      SELECT id, username, role, company, language, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role as UserRole,
      company: user.company as Company,
      language: user.language as Language,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  }

  /**
   * Update user
   */
  static async update(id: string, updateData: UpdateUserRequest): Promise<User | null> {
    // Validate input data
    const { error, value } = this.validateUpdateUser(updateData);
    if (error) {
      throw new Error(`Validation error: ${error}`);
    }

    const validatedData = value!;

    // Check if user exists
    const existingUser = await this.findById(id);
    if (!existingUser) {
      return null;
    }

    // Check if username is being changed and if it already exists
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const userWithSameUsername = await this.findByUsername(validatedData.username);
      if (userWithSameUsername) {
        throw new Error('Username already exists');
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (validatedData.username) {
      updateFields.push(`username = $${paramIndex++}`);
      values.push(validatedData.username);
    }

    if (validatedData.password) {
      const passwordHash = await this.hashPassword(validatedData.password);
      updateFields.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    if (validatedData.role) {
      updateFields.push(`role = $${paramIndex++}`);
      values.push(validatedData.role);
    }

    if (validatedData.company) {
      updateFields.push(`company = $${paramIndex++}`);
      values.push(validatedData.company);
    }

    if (validatedData.language) {
      updateFields.push(`language = $${paramIndex++}`);
      values.push(validatedData.language);
    }

    if (updateFields.length === 0) {
      return existingUser;
    }

    // Add updated_at field
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, password_hash, role, company, language, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    const user = result.rows[0];

    return {
      id: user.id,
      username: user.username,
      password: user.password_hash,
      role: user.role as UserRole,
      company: user.company as Company,
      language: user.language as Language,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Check if any users exist in the system
   */
  static async hasUsers(): Promise<boolean> {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await pool.query(query);
    return parseInt(result.rows[0].count) > 0;
  }
}