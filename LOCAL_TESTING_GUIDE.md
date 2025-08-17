# 本地测试指南

## 🚀 快速启动

### 前置要求

确保你的系统已安装：
- Node.js (v18+)
- PostgreSQL (v13+)
- Redis (可选，用于缓存和会话管理)

### 1. 数据库设置

#### 安装并启动 PostgreSQL
```bash
# Windows (使用 Chocolatey)
choco install postgresql

# 或者下载安装包：https://www.postgresql.org/download/windows/
```

#### 创建数据库
```bash
# 连接到 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE trade_inquiry_db;

# 创建用户（可选）
CREATE USER trade_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE trade_inquiry_db TO trade_user;

# 退出
\q
```

### 2. 后端设置

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 复制环境变量文件
copy .env.example .env

# 编辑 .env 文件，确保数据库连接信息正确
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=trade_inquiry_db
# DB_USER=postgres
# DB_PASSWORD=your_password

# 启动开发服务器
npm run dev
```

### 3. 前端设置

```bash
# 新开一个终端，进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 4. 访问应用

- 前端应用：http://localhost:5173
- 后端 API：http://localhost:3000
- API 文档：http://localhost:3000/api/monitoring/health

## 🧪 测试功能

### 自动化测试

#### 后端测试
```bash
cd backend

# 运行所有测试
npm test

# 运行安全测试
npm run security:test

# 运行特定测试
npm test -- --testNamePattern="User"
```

#### 前端测试
```bash
cd frontend

# 运行单元测试
npm test

# 运行 E2E 测试
npm run e2e

# 打开 Cypress 测试界面
npm run e2e:open
```

### 手动功能测试

#### 1. 用户认证测试
1. 访问 http://localhost:5173
2. 系统会自动创建默认管理员账户：
   - 用户名：admin
   - 密码：admin123
3. 尝试登录和退出

#### 2. 用户管理测试
1. 以管理员身份登录
2. 访问用户管理页面
3. 创建新用户（客户、供应商角色）
4. 编辑和删除用户

#### 3. 询单管理测试
1. 以客户身份登录
2. 创建新询单
3. 上传文件附件
4. 查看询单列表和详情

#### 4. 报价管理测试
1. 以供应商身份登录
2. 查看收到的询单
3. 创建报价回复
4. 管理报价状态

#### 5. 订单管理测试
1. 客户确认报价创建订单
2. 跟踪订单状态
3. 订单完成流程

#### 6. 实时聊天测试
1. 在询单或订单页面打开聊天
2. 发送消息
3. 测试消息翻译功能

#### 7. 多语言测试
1. 切换界面语言（中文/英文）
2. 验证所有文本正确翻译
3. 测试聊天消息翻译

## 🔧 故障排除

### 常见问题

#### 数据库连接失败
```bash
# 检查 PostgreSQL 是否运行
pg_isready -h localhost -p 5432

# 检查数据库是否存在
psql -U postgres -l
```

#### 端口冲突
```bash
# 检查端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# 修改端口（在 .env 或 vite.config.ts 中）
```

#### 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 日志查看

#### 后端日志
- 开发模式：控制台输出
- 日志文件：`backend/logs/` 目录

#### 前端日志
- 浏览器开发者工具 Console
- Network 标签查看 API 请求

## 📊 性能监控

访问监控端点：
- 系统健康：http://localhost:3000/api/monitoring/health
- 性能指标：http://localhost:3000/api/monitoring/metrics
- 数据库状态：http://localhost:3000/api/monitoring/database

## 🛡️ 安全测试

```bash
cd backend

# 运行完整安全测试套件
npm run security:all

# 单独运行安全审计
npm run security:audit

# 运行漏洞扫描
npm run security:scan
```

## 📱 测试数据

系统启动时会自动创建：
- 默认管理员账户
- 示例用户数据
- 测试询单和订单数据

你可以使用这些数据进行功能测试，或者创建自己的测试数据。

## 🎯 测试重点

重点测试以下功能：
1. ✅ 用户认证和权限控制
2. ✅ 询单创建和文件上传
3. ✅ 报价回复和通知
4. ✅ 订单创建和状态跟踪
5. ✅ 实时聊天和消息翻译
6. ✅ 多语言界面切换
7. ✅ 系统安全和性能

## 📞 获取帮助

如果遇到问题：
1. 查看控制台错误信息
2. 检查日志文件
3. 运行相关测试用例
4. 查看 API 响应状态