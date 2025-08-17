-- 贸易询单订单系统数据库初始化脚本

-- 创建数据库（如果不存在）
-- 注意：这个命令需要在 PostgreSQL 命令行中以超级用户身份运行

-- 连接到默认数据库
\c postgres;

-- 创建数据库
DROP DATABASE IF EXISTS trade_inquiry_db;
CREATE DATABASE trade_inquiry_db;

-- 创建用户（可选）
DROP USER IF EXISTS trade_user;
CREATE USER trade_user WITH PASSWORD 'password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE trade_inquiry_db TO trade_user;

-- 连接到新创建的数据库
\c trade_inquiry_db;

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建枚举类型
CREATE TYPE user_role AS ENUM ('admin', 'customer', 'supplier');
CREATE TYPE inquiry_status AS ENUM ('draft', 'submitted', 'quoted', 'closed');
CREATE TYPE quotation_status AS ENUM ('draft', 'submitted', 'accepted', 'rejected', 'expired');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'completed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('inquiry', 'quotation', 'order', 'chat', 'system');

-- Database initialization completed successfully
-- Database: trade_inquiry_db
-- User: trade_user  
-- Password: password