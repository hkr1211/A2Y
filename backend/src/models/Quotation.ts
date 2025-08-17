import { Pool } from 'pg';
import { Quotation, CreateQuotationRequest, UpdateQuotationRequest } from '../types/quotation';

export class QuotationModel {
  constructor(private db: Pool) {}

  /**
   * 验证报价数据
   */
  private validateQuotationData(data: CreateQuotationRequest | UpdateQuotationRequest): string[] {
    const errors: string[] = [];

    if ('unitPrice' in data && data.unitPrice !== undefined) {
      if (typeof data.unitPrice !== 'number' || data.unitPrice <= 0) {
        errors.push('单价必须是大于0的数字');
      }
    }

    if ('totalPrice' in data && data.totalPrice !== undefined) {
      if (typeof data.totalPrice !== 'number' || data.totalPrice <= 0) {
        errors.push('总价必须是大于0的数字');
      }
    }

    if ('deliveryTime' in data && data.deliveryTime !== undefined) {
      if (typeof data.deliveryTime !== 'number' || data.deliveryTime <= 0 || !Number.isInteger(data.deliveryTime)) {
        errors.push('工期必须是大于0的整数');
      }
    }

    if ('remarks' in data && data.remarks !== undefined) {
      if (typeof data.remarks !== 'string') {
        errors.push('备注必须是字符串');
      } else if (data.remarks.length > 1000) {
        errors.push('备注长度不能超过1000个字符');
      }
    }

    return errors;
  }

  /**
   * 创建报价
   */
  async create(data: CreateQuotationRequest, createdBy: string): Promise<Quotation> {
    // 验证数据
    const errors = this.validateQuotationData(data);
    if (errors.length > 0) {
      throw new Error(`数据验证失败: ${errors.join(', ')}`);
    }

    // 检查询单是否存在且状态为已发布
    const inquiryCheck = await this.db.query(
      'SELECT id, status FROM inquiries WHERE id = $1',
      [data.inquiryId]
    );

    if (inquiryCheck.rows.length === 0) {
      throw new Error('询单不存在');
    }

    if (inquiryCheck.rows[0].status !== 'published') {
      throw new Error('只能对已发布的询单进行报价');
    }

    // 检查是否已存在活跃的报价
    const existingQuotation = await this.db.query(
      'SELECT id FROM quotations WHERE inquiry_id = $1 AND status = $2',
      [data.inquiryId, 'active']
    );

    if (existingQuotation.rows.length > 0) {
      throw new Error('该询单已存在活跃的报价');
    }

    const query = `
      INSERT INTO quotations (inquiry_id, unit_price, total_price, delivery_time, remarks, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      data.inquiryId,
      data.unitPrice,
      data.totalPrice,
      data.deliveryTime,
      data.remarks || null,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToQuotation(result.rows[0]);
  }

  /**
   * 根据ID获取报价
   */
  async findById(id: string): Promise<Quotation | null> {
    const query = 'SELECT * FROM quotations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuotation(result.rows[0]);
  }

  /**
   * 根据询单ID获取报价
   */
  async findByInquiryId(inquiryId: string): Promise<Quotation | null> {
    const query = 'SELECT * FROM quotations WHERE inquiry_id = $1 AND status = $2';
    const result = await this.db.query(query, [inquiryId, 'active']);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToQuotation(result.rows[0]);
  }

  /**
   * 获取用户创建的所有报价
   */
  async findByCreatedBy(createdBy: string): Promise<Quotation[]> {
    const query = `
      SELECT * FROM quotations 
      WHERE created_by = $1 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [createdBy]);
    
    return result.rows.map(row => this.mapRowToQuotation(row));
  }

  /**
   * 更新报价
   */
  async update(id: string, data: UpdateQuotationRequest, userId: string): Promise<Quotation> {
    // 验证数据
    const errors = this.validateQuotationData(data);
    if (errors.length > 0) {
      throw new Error(`数据验证失败: ${errors.join(', ')}`);
    }

    // 检查报价是否存在且属于当前用户
    const existingQuotation = await this.findById(id);
    if (!existingQuotation) {
      throw new Error('报价不存在');
    }

    if (existingQuotation.createdBy !== userId) {
      throw new Error('只能修改自己创建的报价');
    }

    if (existingQuotation.status !== 'active') {
      throw new Error('只能修改活跃状态的报价');
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.unitPrice !== undefined) {
      updateFields.push(`unit_price = $${paramIndex++}`);
      values.push(data.unitPrice);
    }

    if (data.totalPrice !== undefined) {
      updateFields.push(`total_price = $${paramIndex++}`);
      values.push(data.totalPrice);
    }

    if (data.deliveryTime !== undefined) {
      updateFields.push(`delivery_time = $${paramIndex++}`);
      values.push(data.deliveryTime);
    }

    if (data.remarks !== undefined) {
      updateFields.push(`remarks = $${paramIndex++}`);
      values.push(data.remarks);
    }

    if (updateFields.length === 0) {
      return existingQuotation;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE quotations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToQuotation(result.rows[0]);
  }

  /**
   * 作废报价
   */
  async cancel(id: string, userId: string): Promise<Quotation> {
    // 检查报价是否存在且属于当前用户
    const existingQuotation = await this.findById(id);
    if (!existingQuotation) {
      throw new Error('报价不存在');
    }

    if (existingQuotation.createdBy !== userId) {
      throw new Error('只能作废自己创建的报价');
    }

    if (existingQuotation.status !== 'active') {
      throw new Error('只能作废活跃状态的报价');
    }

    const query = `
      UPDATE quotations 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await this.db.query(query, [id]);
    return this.mapRowToQuotation(result.rows[0]);
  }

  /**
   * 删除报价（仅管理员）
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM quotations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * 将数据库行映射为Quotation对象
   */
  private mapRowToQuotation(row: any): Quotation {
    return {
      id: row.id,
      inquiryId: row.inquiry_id,
      unitPrice: parseFloat(row.unit_price),
      totalPrice: parseFloat(row.total_price),
      deliveryTime: row.delivery_time,
      remarks: row.remarks,
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}