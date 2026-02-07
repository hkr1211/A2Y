# A2Y 贸易询单订单系统 — 数据库详细设计

> 版本：2.0
> 日期：2026-02-07
> 前置文档：requirements-v2.md, api-design-v2.md
> 状态：待确认

---

## 一、总体说明

| 项目 | 值 |
|------|-----|
| 数据库 | PostgreSQL 15（阿里云 RDS） |
| 主键策略 | UUID v4（`gen_random_uuid()`） |
| 时间字段 | `TIMESTAMPTZ`（带时区，统一存 UTC） |
| 软删除 | `deleted_at TIMESTAMPTZ`，NULL 表示未删除 |
| 命名规范 | 表名复数小写，字段名 snake_case |
| 迁移策略 | 编号 SQL 文件，启动时自动执行 |

---

## 二、建表 SQL

### 迁移 001：用户表

```sql
-- 001_create_users.sql

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'buyer', 'supplier')),
  company       VARCHAR(20)  NOT NULL CHECK (company IN ('arroz', 'yunjie', 'admin')),
  language      VARCHAR(5)   NOT NULL DEFAULT 'zh' CHECK (language IN ('zh', 'ja')),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 登录查询（排除已删除用户）
CREATE UNIQUE INDEX idx_users_username_active ON users (username) WHERE deleted_at IS NULL;
```

---

### 迁移 002：询单表

```sql
-- 002_create_inquiries.sql

CREATE TABLE inquiries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_number       VARCHAR(20)  NOT NULL UNIQUE,
  product_name         VARCHAR(200) NOT NULL,
  material_type        VARCHAR(100) NOT NULL,
  specifications       TEXT         NOT NULL,
  special_requirements TEXT,
  quantity             INTEGER      NOT NULL CHECK (quantity > 0),
  status               VARCHAR(20)  NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'published', 'quoted', 'converted', 'cancelled')),
  created_by           UUID         NOT NULL REFERENCES users(id),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiries_created_by ON inquiries (created_by);
CREATE INDEX idx_inquiries_status     ON inquiries (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inquiries_created_at ON inquiries (created_at DESC) WHERE deleted_at IS NULL;
```

---

### 迁移 003：报价表

```sql
-- 003_create_quotations.sql

CREATE TABLE quotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID           NOT NULL REFERENCES inquiries(id),
  version       INTEGER        NOT NULL DEFAULT 1,
  unit_price    DECIMAL(12,2)  NOT NULL CHECK (unit_price >= 0),
  total_price   DECIMAL(12,2)  NOT NULL CHECK (total_price >= 0),
  delivery_days INTEGER        NOT NULL CHECK (delivery_days > 0),
  remarks       TEXT,
  is_withdrawn  BOOLEAN        NOT NULL DEFAULT FALSE,
  created_by    UUID           NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  UNIQUE (inquiry_id, version)
);

-- 按询单查报价历史（最新版本优先）
CREATE INDEX idx_quotations_inquiry ON quotations (inquiry_id, version DESC);
```

---

### 迁移 004：订单表

```sql
-- 004_create_orders.sql

CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number         VARCHAR(20)   NOT NULL UNIQUE,
  inquiry_id           UUID          REFERENCES inquiries(id),
  product_name         VARCHAR(200)  NOT NULL,
  material_type        VARCHAR(100)  NOT NULL,
  specifications       TEXT          NOT NULL,
  special_requirements TEXT,
  unit_price           DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity             INTEGER       NOT NULL CHECK (quantity > 0),
  total_price          DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
  status               VARCHAR(20)   NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'confirmed', 'rejected',
                                         'production', 'shipped', 'completed', 'cancelled')),
  created_by           UUID          NOT NULL REFERENCES users(id),
  confirmed_by         UUID          REFERENCES users(id),
  reject_reason        TEXT,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_created_by ON orders (created_by);
CREATE INDEX idx_orders_status     ON orders (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created_at ON orders (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_inquiry_id ON orders (inquiry_id) WHERE inquiry_id IS NOT NULL;
```

---

### 迁移 005：文件附件表

```sql
-- 005_create_file_attachments.sql

CREATE TABLE file_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name VARCHAR(255) NOT NULL,
  storage_key   VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size          INTEGER      NOT NULL CHECK (size > 0),
  related_id    UUID         NOT NULL,
  related_type  VARCHAR(20)  NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  uploaded_by   UUID         NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_file_attachments_related ON file_attachments (related_type, related_id);
```

---

### 迁移 006：聊天消息表

```sql
-- 006_create_chat_messages.sql

CREATE TABLE chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  related_id   UUID        NOT NULL,
  related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  sender_id    UUID        NOT NULL REFERENCES users(id),
  content      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按关联对象查消息（时间正序）
CREATE INDEX idx_chat_messages_related ON chat_messages (related_type, related_id, created_at);

-- 轮询增量查询（since 参数）
CREATE INDEX idx_chat_messages_since ON chat_messages (related_type, related_id, created_at)
  WHERE created_at IS NOT NULL;
```

---

### 迁移 007：聊天已读状态表

```sql
-- 007_create_chat_read_status.sql

CREATE TABLE chat_read_status (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id),
  related_id   UUID        NOT NULL,
  related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('inquiry', 'order')),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, related_type, related_id)
);
```

---

### 迁移 008：通知表

```sql
-- 008_create_notifications.sql

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID         NOT NULL REFERENCES users(id),
  type         VARCHAR(30)  NOT NULL
               CHECK (type IN ('quotation_new', 'quotation_updated', 'quotation_withdrawn',
                               'order_new', 'order_confirmed', 'order_rejected',
                               'order_status_changed', 'chat_message')),
  title        VARCHAR(200) NOT NULL,
  content      TEXT,
  related_id   UUID,
  related_type VARCHAR(20)  CHECK (related_type IN ('inquiry', 'order')),
  is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 查当前用户未读通知（轮询用）
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

-- 查当前用户全部通知（列表用）
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
```

---

### 迁移 009：审计日志表

```sql
-- 009_create_audit_logs.sql

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id   UUID,
  summary     TEXT,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 按操作人和时间查
CREATE INDEX idx_audit_logs_user      ON audit_logs (user_id, created_at DESC);
-- 按操作对象查
CREATE INDEX idx_audit_logs_target    ON audit_logs (target_type, target_id);
-- 按时间范围查
CREATE INDEX idx_audit_logs_created   ON audit_logs (created_at DESC);
```

---

### 迁移 010：自动更新 updated_at 触发器

```sql
-- 010_create_updated_at_trigger.sql

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inquiries_updated_at
  BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

### 迁移 011：初始化默认管理员

```sql
-- 011_create_default_admin.sql
-- 注意：密码 hash 在应用启动时由 InitializationService 生成
-- 此迁移仅创建占位，实际插入由应用代码完成
-- 应用启动逻辑：若 users 表中不存在 username='admin' 的记录，则插入默认管理员
```

---

## 三、索引策略总结

| 表 | 索引 | 用途 |
|----|------|------|
| users | username (UNIQUE, partial) | 登录查询，排除已删除 |
| inquiries | created_by | 按创建者查询 |
| inquiries | status (partial) | 按状态筛选，排除已删除 |
| inquiries | created_at DESC (partial) | 列表默认排序 |
| quotations | (inquiry_id, version DESC) | 按询单查报价历史 |
| quotations | (inquiry_id, version) UNIQUE | 防止版本号重复 |
| orders | created_by | 按创建者查询 |
| orders | status (partial) | 按状态筛选 |
| orders | created_at DESC (partial) | 列表默认排序 |
| orders | inquiry_id (partial) | 查关联询单 |
| file_attachments | (related_type, related_id) | 按关联对象查附件 |
| chat_messages | (related_type, related_id, created_at) | 查消息列表 + 增量轮询 |
| chat_read_status | (user_id, related_type, related_id) UNIQUE | 查/更新已读状态 |
| notifications | (user_id, is_read, created_at DESC) partial | 未读通知轮询 |
| notifications | (user_id, created_at DESC) | 通知列表 |
| audit_logs | (user_id, created_at DESC) | 按操作人查 |
| audit_logs | (target_type, target_id) | 按对象查 |
| audit_logs | (created_at DESC) | 按时间范围查 |

---

## 四、查询约定

### 4.1 软删除

```sql
-- 默认查询（列表、详情）
SELECT * FROM inquiries WHERE deleted_at IS NULL AND ...;

-- 回收站查询
SELECT * FROM inquiries WHERE deleted_at IS NOT NULL;

-- 软删除
UPDATE inquiries SET deleted_at = NOW() WHERE id = $1;

-- 恢复
UPDATE inquiries SET deleted_at = NULL WHERE id = $1;

-- 永久删除
DELETE FROM inquiries WHERE id = $1 AND deleted_at IS NOT NULL;
```

### 4.2 未读消息数计算

```sql
-- 某用户在某询单/订单中的未读消息数
SELECT COUNT(*) FROM chat_messages cm
WHERE cm.related_type = $1
  AND cm.related_id = $2
  AND cm.created_at > COALESCE(
    (SELECT last_read_at FROM chat_read_status
     WHERE user_id = $3 AND related_type = $1 AND related_id = $2),
    '1970-01-01'
  )
  AND cm.sender_id != $3;
```

### 4.3 编号自动生成

```sql
-- 询单编号：INQ-YYYYMMDD-XXXX
-- 每天从 0001 开始递增
SELECT COALESCE(
  MAX(CAST(SUBSTRING(inquiry_number FROM 14) AS INTEGER)),
  0
) + 1 AS next_seq
FROM inquiries
WHERE inquiry_number LIKE 'INQ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

-- 组装：'INQ-20260207-' || LPAD(next_seq::TEXT, 4, '0')
-- 结果：INQ-20260207-0001

-- 订单编号同理：ORD-YYYYMMDD-XXXX
```

### 4.4 报价版本号递增

```sql
-- 获取下一个版本号
SELECT COALESCE(MAX(version), 0) + 1 AS next_version
FROM quotations
WHERE inquiry_id = $1;
```

---

## 五、ER 关系图

```
users
  │
  ├──1:N── inquiries (created_by)
  │            │
  │            ├──1:N── quotations (inquiry_id)
  │            │           └── created_by → users
  │            │
  │            ├──0:1── orders (inquiry_id，可空)
  │            │
  │            ├──1:N── file_attachments (related_id, related_type='inquiry')
  │            │
  │            ├──1:N── chat_messages (related_id, related_type='inquiry')
  │            │
  │            └──1:N── chat_read_status (related_id, related_type='inquiry')
  │
  ├──1:N── orders (created_by)
  │            │
  │            ├── confirmed_by → users
  │            │
  │            ├──1:N── file_attachments (related_id, related_type='order')
  │            │
  │            ├──1:N── chat_messages (related_id, related_type='order')
  │            │
  │            └──1:N── chat_read_status (related_id, related_type='order')
  │
  ├──1:N── notifications (user_id)
  │
  └──1:N── audit_logs (user_id)
```

---

> **下一步：** 见 `implementation-plan-v2.md` 实施计划。
