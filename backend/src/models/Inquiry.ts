import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export type InquiryStatus = 'draft' | 'published' | 'replied' | 'converted' | 'cancelled';

export interface InquiryData {
  id?: string;
  inquiryNumber?: string;
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
  status?: InquiryStatus;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Inquiry {
  public id: string;
  public inquiryNumber: string;
  public productName: string;
  public materialType: string;
  public specifications: string;
  public specialRequirements?: string;
  public quantity: number;
  public status: InquiryStatus;
  public createdBy: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: InquiryData) {
    this.id = data.id || uuidv4();
    this.inquiryNumber = data.inquiryNumber || '';
    this.productName = data.productName;
    this.materialType = data.materialType;
    this.specifications = data.specifications;
    this.specialRequirements = data.specialRequirements;
    this.quantity = data.quantity;
    this.status = data.status || 'draft';
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validates the inquiry data
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.productName || this.productName.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!this.materialType || this.materialType.trim().length === 0) {
      errors.push('Material type is required');
    }

    if (!this.specifications || this.specifications.trim().length === 0) {
      errors.push('Specifications are required');
    }

    if (!this.quantity || this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (!this.createdBy) {
      errors.push('Created by user ID is required');
    }

    const validStatuses: InquiryStatus[] = ['draft', 'published', 'replied', 'converted', 'cancelled'];
    if (!validStatuses.includes(this.status)) {
      errors.push('Invalid inquiry status');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Checks if the inquiry can be modified based on its current status
   */
  canBeModified(): boolean {
    return this.status === 'draft' || this.status === 'published';
  }

  /**
   * Checks if the inquiry can be cancelled based on its current status
   */
  canBeCancelled(): boolean {
    return this.status !== 'cancelled' && this.status !== 'converted';
  }

  /**
   * Updates the inquiry status with validation
   */
  updateStatus(newStatus: InquiryStatus): { success: boolean; error?: string } {
    const validTransitions: Record<InquiryStatus, InquiryStatus[]> = {
      draft: ['published', 'cancelled'],
      published: ['replied', 'cancelled'],
      replied: ['converted', 'cancelled'],
      converted: [], // Final state
      cancelled: [] // Final state
    };

    const allowedTransitions = validTransitions[this.status];
    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        error: `Cannot transition from ${this.status} to ${newStatus}`
      };
    }

    this.status = newStatus;
    this.updatedAt = new Date();
    return { success: true };
  }

  /**
   * Generates a unique inquiry number
   */
  static async generateInquiryNumber(db: Pool): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Get the next sequence number for this year-month
    const query = `
      SELECT COUNT(*) + 1 as next_number 
      FROM inquiries 
      WHERE inquiry_number LIKE $1
    `;
    
    const prefix = `INQ${year}${month}`;
    const result = await db.query(query, [`${prefix}%`]);
    const nextNumber = result.rows[0].next_number;
    
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Saves the inquiry to the database
   */
  async save(db: Pool): Promise<{ success: boolean; error?: string }> {
    const validation = this.validate();
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', ')
      };
    }

    try {
      // Generate inquiry number if not set
      if (!this.inquiryNumber) {
        this.inquiryNumber = await Inquiry.generateInquiryNumber(db);
      }

      const query = `
        INSERT INTO inquiries (
          id, inquiry_number, product_name, material_type, specifications,
          special_requirements, quantity, status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          material_type = EXCLUDED.material_type,
          specifications = EXCLUDED.specifications,
          special_requirements = EXCLUDED.special_requirements,
          quantity = EXCLUDED.quantity,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `;

      const values = [
        this.id,
        this.inquiryNumber,
        this.productName,
        this.materialType,
        this.specifications,
        this.specialRequirements,
        this.quantity,
        this.status,
        this.createdBy,
        this.createdAt,
        this.updatedAt
      ];

      const result = await db.query(query, values);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Finds an inquiry by ID
   */
  static async findById(db: Pool, id: string): Promise<Inquiry | null> {
    try {
      const query = 'SELECT * FROM inquiries WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return new Inquiry({
        id: row.id,
        inquiryNumber: row.inquiry_number,
        productName: row.product_name,
        materialType: row.material_type,
        specifications: row.specifications,
        specialRequirements: row.special_requirements,
        quantity: row.quantity,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      });
    } catch (error) {
      throw new Error(`Failed to find inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds inquiries by creator
   */
  static async findByCreator(db: Pool, createdBy: string): Promise<Inquiry[]> {
    try {
      const query = 'SELECT * FROM inquiries WHERE created_by = $1 ORDER BY created_at DESC';
      const result = await db.query(query, [createdBy]);
      
      return result.rows.map(row => new Inquiry({
        id: row.id,
        inquiryNumber: row.inquiry_number,
        productName: row.product_name,
        materialType: row.material_type,
        specifications: row.specifications,
        specialRequirements: row.special_requirements,
        quantity: row.quantity,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to find inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds all inquiries (for admin users)
   */
  static async findAll(db: Pool): Promise<Inquiry[]> {
    try {
      const query = 'SELECT * FROM inquiries ORDER BY created_at DESC';
      const result = await db.query(query);
      
      return result.rows.map(row => new Inquiry({
        id: row.id,
        inquiryNumber: row.inquiry_number,
        productName: row.product_name,
        materialType: row.material_type,
        specifications: row.specifications,
        specialRequirements: row.special_requirements,
        quantity: row.quantity,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      throw new Error(`Failed to find inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds all inquiries with pagination and filters (for admin users)
   */
  static async findAllWithPagination(
    db: Pool, 
    options: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    }
  ): Promise<{ inquiries: Inquiry[]; total: number }> {
    try {
      const { page, limit, search, status } = options;
      const offset = (page - 1) * limit;
      
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(
          product_name ILIKE $${paramIndex} OR 
          material_type ILIKE $${paramIndex} OR 
          inquiry_number ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM inquiries ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get inquiries with pagination
      const dataQuery = `
        SELECT * FROM inquiries 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);
      
      const result = await db.query(dataQuery, queryParams);
      
      const inquiries = result.rows.map(row => new Inquiry({
        id: row.id,
        inquiryNumber: row.inquiry_number,
        productName: row.product_name,
        materialType: row.material_type,
        specifications: row.specifications,
        specialRequirements: row.special_requirements,
        quantity: row.quantity,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return { inquiries, total };
    } catch (error) {
      throw new Error(`Failed to find inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finds inquiries by creator with pagination and filters
   */
  static async findByCreatorWithPagination(
    db: Pool, 
    createdBy: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    }
  ): Promise<{ inquiries: Inquiry[]; total: number }> {
    try {
      const { page, limit, search, status } = options;
      const offset = (page - 1) * limit;
      
      let whereConditions: string[] = ['created_by = $1'];
      let queryParams: any[] = [createdBy];
      let paramIndex = 2;

      if (search) {
        whereConditions.push(`(
          product_name ILIKE $${paramIndex} OR 
          material_type ILIKE $${paramIndex} OR 
          inquiry_number ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM inquiries ${whereClause}`;
      const countResult = await db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get inquiries with pagination
      const dataQuery = `
        SELECT * FROM inquiries 
        ${whereClause}
        ORDER BY created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);
      
      const result = await db.query(dataQuery, queryParams);
      
      const inquiries = result.rows.map(row => new Inquiry({
        id: row.id,
        inquiryNumber: row.inquiry_number,
        productName: row.product_name,
        materialType: row.material_type,
        specifications: row.specifications,
        specialRequirements: row.special_requirements,
        quantity: row.quantity,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      return { inquiries, total };
    } catch (error) {
      throw new Error(`Failed to find inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes an inquiry by ID
   */
  static async deleteById(db: Pool, id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const query = 'DELETE FROM inquiries WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rowCount === 0) {
        return {
          success: false,
          error: 'Inquiry not found'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}