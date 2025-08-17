-- 创建文件附件表
CREATE TABLE file_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size INTEGER NOT NULL,
    path VARCHAR(500) NOT NULL,
    related_id UUID NOT NULL,
    related_type VARCHAR(20) NOT NULL CHECK (related_type IN ('inquiry', 'order')),
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_file_attachments_related ON file_attachments(related_id, related_type);
CREATE INDEX idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX idx_file_attachments_uploaded_at ON file_attachments(uploaded_at);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_file_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_file_attachments_updated_at
    BEFORE UPDATE ON file_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_file_attachments_updated_at();