import pg from 'pg';

export interface InquiryRow {
  id: string;
  inquiry_number: string;
  product_name: string;
  material_type: string;
  specifications: string;
  special_requirements: string | null;
  quantity: number;
  status: string;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InquiryListRow extends InquiryRow {
  creator_username: string;
}

export class InquiryRepository {
  constructor(private pool: pg.Pool) {}

  async generateInquiryNumber(): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');

    const prefix = `INQ-${dateStr}-`;

    const { rows } = await this.pool.query(
      `SELECT inquiry_number FROM inquiries
       WHERE inquiry_number LIKE $1
       ORDER BY inquiry_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let seq = 1;
    if (rows.length > 0) {
      const lastNum = rows[0].inquiry_number;
      const lastSeq = parseInt(lastNum.slice(prefix.length), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(4, '0')}`;
  }

  async findById(id: string): Promise<InquiryRow | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM inquiries WHERE id = $1 AND deleted_at IS NULL',
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
  }): Promise<{ items: InquiryListRow[]; total: number }> {
    const conditions: string[] = ['i.deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(
        `(i.inquiry_number ILIKE $${paramIndex} OR i.product_name ILIKE $${paramIndex})`
      );
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`i.status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const allowedSorts = ['created_at', 'inquiry_number'];
    const sortCol = allowedSorts.includes(params.sort)
      ? `i.${params.sort}`
      : 'i.created_at';
    const sortDir = params.order === 'asc' ? 'ASC' : 'DESC';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM inquiries i WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (params.page - 1) * params.pageSize;
    const itemsResult = await this.pool.query(
      `SELECT i.*, u.username AS creator_username
       FROM inquiries i
       JOIN users u ON u.id = i.created_by
       WHERE ${where}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, params.pageSize, offset]
    );

    return { items: itemsResult.rows, total };
  }

  async create(data: {
    inquiry_number: string;
    product_name: string;
    material_type: string;
    specifications: string;
    special_requirements?: string | null;
    quantity: number;
    created_by: string;
  }): Promise<InquiryRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO inquiries (inquiry_number, product_name, material_type, specifications, special_requirements, quantity, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.inquiry_number,
        data.product_name,
        data.material_type,
        data.specifications,
        data.special_requirements || null,
        data.quantity,
        data.created_by,
      ]
    );
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      product_name: string;
      material_type: string;
      specifications: string;
      special_requirements: string | null;
      quantity: number;
      status: string;
    }>
  ): Promise<InquiryRow | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fields = [
      'product_name',
      'material_type',
      'specifications',
      'special_requirements',
      'quantity',
      'status',
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
      `UPDATE inquiries SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE inquiries SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
