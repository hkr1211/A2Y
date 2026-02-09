import pg from 'pg';

export interface OrderRow {
  id: string;
  order_number: string;
  inquiry_id: string | null;
  product_name: string;
  material_type: string;
  specifications: string;
  special_requirements: string | null;
  unit_price: string; // DECIMAL comes as string
  quantity: number;
  total_price: string;
  status: string;
  created_by: string;
  confirmed_by: string | null;
  reject_reason: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderListRow extends OrderRow {
  creator_username: string;
  confirmer_username: string | null;
}

export class OrderRepository {
  constructor(private pool: pg.Pool) {}

  async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const prefix = `ORD-${dateStr}-`;

    const { rows } = await this.pool.query(
      `SELECT order_number FROM orders
       WHERE order_number LIKE $1
       ORDER BY order_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let seq = 1;
    if (rows.length > 0) {
      const lastNum = rows[0].order_number;
      const lastSeq = parseInt(lastNum.slice(prefix.length), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findById(id: string): Promise<OrderRow | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return rows[0] || null;
  }

  async findAll(params: {
    page: number;
    pageSize: number;
    search: string;
    sort: string;
    order: string;
    status?: string;
  }): Promise<{ items: OrderListRow[]; total: number }> {
    const conditions: string[] = ['o.deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(o.order_number ILIKE $${paramIndex} OR o.product_name ILIKE $${paramIndex})`
      );
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`o.status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const allowedSorts = ['created_at', 'order_number'];
    const sortCol = allowedSorts.includes(params.sort)
      ? `o.${params.sort}`
      : 'o.created_at';
    const sortDir = params.order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM orders o WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (params.page - 1) * params.pageSize;
    const itemsResult = await this.pool.query(
      `SELECT o.*, uc.username AS creator_username, ucf.username AS confirmer_username
       FROM orders o
       JOIN users uc ON uc.id = o.created_by
       LEFT JOIN users ucf ON ucf.id = o.confirmed_by
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, params.pageSize, offset]
    );

    return { items: itemsResult.rows, total };
  }

  async create(data: {
    order_number: string;
    inquiry_id?: string | null;
    product_name: string;
    material_type: string;
    specifications: string;
    special_requirements?: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
    created_by: string;
  }): Promise<OrderRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO orders (order_number, inquiry_id, product_name, material_type, specifications, special_requirements, unit_price, quantity, total_price, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.order_number,
        data.inquiry_id || null,
        data.product_name,
        data.material_type,
        data.specifications,
        data.special_requirements || null,
        data.unit_price,
        data.quantity,
        data.total_price,
        data.created_by,
      ]
    );
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      status: string;
      confirmed_by: string;
      reject_reason: string;
    }>
  ): Promise<OrderRow | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'status',
      'confirmed_by',
      'reject_reason',
    ] as const;

    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex++}`);
        values.push(data[field]);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
