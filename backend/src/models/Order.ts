import { Pool } from 'pg';
import { Order, OrderStatus, CreateOrderData, UpdateOrderData } from '../types/order';

export class OrderModel {
  private db: Pool;

  constructor(db: Pool) {
    this.db = db;
  }

  /**
   * 生成唯一的订单号
   * 格式: ORD-YYYYMMDD-XXXX (ORD-20240101-0001)
   */
  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `ORD-${dateStr}`;

    // 查询今天已有的订单数量
    const query = `
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE order_number LIKE $1
    `;
    
    const result = await this.db.query(query, [`${prefix}-%`]);
    const count = parseInt(result.rows[0].count) + 1;
    const sequence = count.toString().padStart(4, '0');
    
    return `${prefix}-${sequence}`;
  }

  /**
   * 创建订单
   */
  async create(orderData: CreateOrderData): Promise<Order> {
    const orderNumber = await this.generateOrderNumber();
    
    const query = `
      INSERT INTO orders (
        order_number, inquiry_id, product_name, material_type, 
        specifications, special_requirements, unit_price, quantity, 
        total_price, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      orderNumber,
      orderData.inquiryId || null,
      orderData.productName,
      orderData.materialType,
      orderData.specifications,
      orderData.specialRequirements || null,
      orderData.unitPrice,
      orderData.quantity,
      orderData.totalPrice,
      orderData.createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToOrder(result.rows[0]);
  }

  /**
   * 根据ID查找订单
   */
  async findById(id: string): Promise<Order | null> {
    const query = `
      SELECT o.*, 
             creator.username as creator_name,
             confirmer.username as confirmer_name
      FROM orders o
      LEFT JOIN users creator ON o.created_by = creator.id
      LEFT JOIN users confirmer ON o.confirmed_by = confirmer.id
      WHERE o.id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null;
  }

  /**
   * 根据订单号查找订单
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const query = `
      SELECT o.*, 
             creator.username as creator_name,
             confirmer.username as confirmer_name
      FROM orders o
      LEFT JOIN users creator ON o.created_by = creator.id
      LEFT JOIN users confirmer ON o.confirmed_by = confirmer.id
      WHERE o.order_number = $1
    `;
    
    const result = await this.db.query(query, [orderNumber]);
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null;
  }

  /**
   * 获取所有订单（支持分页和筛选）
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    createdBy?: string;
    confirmedBy?: string;
  } = {}): Promise<{ orders: Order[]; total: number }> {
    const { page = 1, limit = 10, status, createdBy, confirmedBy } = options;
    const offset = (page - 1) * limit;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(`o.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (createdBy) {
      whereConditions.push(`o.created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    if (confirmedBy) {
      whereConditions.push(`o.confirmed_by = $${paramIndex}`);
      queryParams.push(confirmedBy);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) as total
      FROM orders o
      ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // 获取订单列表
    const query = `
      SELECT o.*, 
             creator.username as creator_name,
             confirmer.username as confirmer_name
      FROM orders o
      LEFT JOIN users creator ON o.created_by = creator.id
      LEFT JOIN users confirmer ON o.confirmed_by = confirmer.id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await this.db.query(query, queryParams);
    const orders = result.rows.map(row => this.mapRowToOrder(row));

    return { orders, total };
  }

  /**
   * 更新订单
   */
  async update(id: string, updateData: UpdateOrderData): Promise<Order | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 动态构建更新字段
    if (updateData.productName !== undefined) {
      fields.push(`product_name = $${paramIndex}`);
      values.push(updateData.productName);
      paramIndex++;
    }

    if (updateData.materialType !== undefined) {
      fields.push(`material_type = $${paramIndex}`);
      values.push(updateData.materialType);
      paramIndex++;
    }

    if (updateData.specifications !== undefined) {
      fields.push(`specifications = $${paramIndex}`);
      values.push(updateData.specifications);
      paramIndex++;
    }

    if (updateData.specialRequirements !== undefined) {
      fields.push(`special_requirements = $${paramIndex}`);
      values.push(updateData.specialRequirements);
      paramIndex++;
    }

    if (updateData.unitPrice !== undefined) {
      fields.push(`unit_price = $${paramIndex}`);
      values.push(updateData.unitPrice);
      paramIndex++;
    }

    if (updateData.quantity !== undefined) {
      fields.push(`quantity = $${paramIndex}`);
      values.push(updateData.quantity);
      paramIndex++;
    }

    if (updateData.totalPrice !== undefined) {
      fields.push(`total_price = $${paramIndex}`);
      values.push(updateData.totalPrice);
      paramIndex++;
    }

    if (updateData.status !== undefined) {
      fields.push(`status = $${paramIndex}`);
      values.push(updateData.status);
      paramIndex++;
    }

    if (updateData.confirmedBy !== undefined) {
      fields.push(`confirmed_by = $${paramIndex}`);
      values.push(updateData.confirmedBy);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE orders 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    values.push(id);
    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToOrder(result.rows[0]) : null;
  }

  /**
   * 删除订单
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM orders WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * 检查订单状态是否可以更新
   */
  canUpdateStatus(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['production', 'cancelled'],
      'production': ['shipped'],
      'shipped': ['completed'],
      'completed': [],
      'cancelled': []
    };

    return statusTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * 检查订单是否可以被作废
   */
  canCancel(order: Order): boolean {
    return ['pending', 'confirmed'].includes(order.status);
  }

  /**
   * 检查订单是否可以被修改
   */
  canModify(order: Order): boolean {
    return order.status === 'pending';
  }

  /**
   * 将数据库行映射为Order对象
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      orderNumber: row.order_number,
      inquiryId: row.inquiry_id || undefined,
      productName: row.product_name,
      materialType: row.material_type,
      specifications: row.specifications,
      specialRequirements: row.special_requirements,
      unitPrice: parseFloat(row.unit_price),
      quantity: row.quantity,
      totalPrice: parseFloat(row.total_price),
      status: row.status as OrderStatus,
      createdBy: row.created_by,
      confirmedBy: row.confirmed_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creatorName: row.creator_name,
      confirmerName: row.confirmer_name
    };
  }
}