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
