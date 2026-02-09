import pg from 'pg';

export interface QuotationRow {
  id: string;
  inquiry_id: string;
  version: number;
  unit_price: string; // DECIMAL comes as string from pg
  total_price: string;
  delivery_days: number;
  remarks: string | null;
  is_withdrawn: boolean;
  created_by: string;
  created_at: string;
}

export interface QuotationWithCreator extends QuotationRow {
  creator_username: string;
}

export class QuotationRepository {
  constructor(private pool: pg.Pool) {}

  async getNextVersion(inquiryId: string): Promise<number> {
    const { rows } = await this.pool.query(
      'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM quotations WHERE inquiry_id = $1',
      [inquiryId]
    );
    return parseInt(rows[0].next_version, 10);
  }

  async findByInquiryId(inquiryId: string): Promise<QuotationWithCreator[]> {
    const { rows } = await this.pool.query(
      `SELECT q.*, u.username AS creator_username
       FROM quotations q
       JOIN users u ON u.id = q.created_by
       WHERE q.inquiry_id = $1
       ORDER BY q.version DESC`,
      [inquiryId]
    );
    return rows;
  }

  async findActiveByInquiryId(
    inquiryId: string
  ): Promise<QuotationRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM quotations
       WHERE inquiry_id = $1 AND is_withdrawn = FALSE
       ORDER BY version DESC LIMIT 1`,
      [inquiryId]
    );
    return rows[0] || null;
  }

  async hasActiveQuotations(inquiryId: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT COUNT(*) FROM quotations WHERE inquiry_id = $1 AND is_withdrawn = FALSE',
      [inquiryId]
    );
    return parseInt(rows[0].count, 10) > 0;
  }

  async create(data: {
    inquiry_id: string;
    version: number;
    unit_price: number;
    total_price: number;
    delivery_days: number;
    remarks?: string | null;
    created_by: string;
  }): Promise<QuotationRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO quotations (inquiry_id, version, unit_price, total_price, delivery_days, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.inquiry_id,
        data.version,
        data.unit_price,
        data.total_price,
        data.delivery_days,
        data.remarks || null,
        data.created_by,
      ]
    );
    return rows[0];
  }

  async withdrawByInquiryId(
    inquiryId: string,
    createdBy: string
  ): Promise<number> {
    const result = await this.pool.query(
      `UPDATE quotations SET is_withdrawn = TRUE
       WHERE inquiry_id = $1 AND created_by = $2 AND is_withdrawn = FALSE`,
      [inquiryId, createdBy]
    );
    return result.rowCount ?? 0;
  }
}
