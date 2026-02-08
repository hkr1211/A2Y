import pg from 'pg';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  company: string;
  language: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  constructor(private pool: pg.Pool) {}

  async findByUsername(username: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL',
      [username]
    );
    return rows[0] || null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
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
    role?: string;
  }): Promise<{ items: UserRow[]; total: number }> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.search) {
      conditions.push(`username ILIKE $${paramIndex}`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    if (params.role) {
      conditions.push(`role = $${paramIndex}`);
      values.push(params.role);
      paramIndex++;
    }

    const where = conditions.join(' AND ');
    const allowedSorts = ['created_at', 'username'];
    const sortCol = allowedSorts.includes(params.sort)
      ? params.sort
      : 'created_at';
    const sortDir = params.order === 'asc' ? 'ASC' : 'DESC';

    // Count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM users WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Items
    const offset = (params.page - 1) * params.pageSize;
    const itemsResult = await this.pool.query(
      `SELECT * FROM users WHERE ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, params.pageSize, offset]
    );

    return { items: itemsResult.rows, total };
  }

  async create(data: {
    username: string;
    password_hash: string;
    role: string;
    company: string;
    language: string;
  }): Promise<UserRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO users (username, password_hash, role, company, language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.username, data.password_hash, data.role, data.company, data.language]
    );
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{ role: string; company: string; language: string }>
  ): Promise<UserRow | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.role !== undefined) {
      setClauses.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    if (data.company !== undefined) {
      setClauses.push(`company = $${paramIndex++}`);
      values.push(data.company);
    }
    if (data.language !== undefined) {
      setClauses.push(`language = $${paramIndex++}`);
      values.push(data.language);
    }

    if (setClauses.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND deleted_at IS NULL',
      [passwordHash, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }
}
