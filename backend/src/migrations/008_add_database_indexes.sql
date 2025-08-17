-- Database Performance Optimization Indexes
-- This migration adds indexes to improve query performance

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Inquiries table indexes
CREATE INDEX IF NOT EXISTS idx_inquiries_inquiry_number ON inquiries(inquiry_number);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_by ON inquiries(created_by);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_product_name ON inquiries(product_name);
CREATE INDEX IF NOT EXISTS idx_inquiries_material_type ON inquiries(material_type);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_inquiries_status_created_by ON inquiries(status, created_by);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at_status ON inquiries(created_at DESC, status);

-- Quotations table indexes
CREATE INDEX IF NOT EXISTS idx_quotations_inquiry_id ON quotations(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at);

-- Composite index for quotation queries
CREATE INDEX IF NOT EXISTS idx_quotations_inquiry_status ON quotations(inquiry_id, status);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_inquiry_id ON orders(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON orders(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Composite indexes for order queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created_by ON orders(status, created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status ON orders(created_at DESC, status);

-- Chat messages table indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_related_id_type ON chat_messages(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON chat_messages(is_read);

-- Composite index for chat message queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_related_timestamp ON chat_messages(related_id, related_type, timestamp DESC);

-- File attachments table indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_related_id_type ON file_attachments(related_id, related_type);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by ON file_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_at ON file_attachments(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_file_attachments_mime_type ON file_attachments(mime_type);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id_type ON notifications(related_id, related_type);

-- Composite indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, is_read, created_at DESC);

-- Full-text search indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_inquiries_search ON inquiries USING gin(to_tsvector('english', product_name || ' ' || material_type || ' ' || specifications));
CREATE INDEX IF NOT EXISTS idx_orders_search ON orders USING gin(to_tsvector('english', product_name || ' ' || material_type || ' ' || specifications));

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_inquiries_active ON inquiries(created_at DESC) WHERE status IN ('published', 'replied');
CREATE INDEX IF NOT EXISTS idx_orders_active ON orders(created_at DESC) WHERE status IN ('pending', 'confirmed', 'production', 'shipped');
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(created_at DESC) WHERE is_read = false;

-- Add comments for documentation
COMMENT ON INDEX idx_users_username IS 'Index for user authentication queries';
COMMENT ON INDEX idx_inquiries_status_created_by IS 'Composite index for user-specific inquiry filtering';
COMMENT ON INDEX idx_orders_created_at_status IS 'Index for order listing with status filtering';
COMMENT ON INDEX idx_chat_messages_related_timestamp IS 'Index for chat message retrieval by context';
COMMENT ON INDEX idx_notifications_user_read_created IS 'Index for user notification queries';
COMMENT ON INDEX idx_inquiries_search IS 'Full-text search index for inquiry content';
COMMENT ON INDEX idx_inquiries_active IS 'Partial index for active inquiries only';