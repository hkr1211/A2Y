# 设计文档

## 概述

本系统是一个专为日本 Arroz 公司（买方）和中国蕴杰公司（供应商）之间外贸业务设计的询单订单管理平台。采用前后端分离的 B/S 架构，使用 RESTful API 进行数据交互，支持实时通信和多语言翻译功能。系统设计考虑了未来扩展微信小程序的需求，提供完整的询单到订单的业务流程管理。

## 架构

### 系统架构

- **前端**: Vue.js 3 + TypeScript + Element Plus UI 框架
- **后端**: Node.js + Express.js + TypeScript
- **数据库**: PostgreSQL（主数据库）+ Redis（缓存和会话）
- **文件存储**: 本地文件系统（支持后续扩展到云存储）
- **实时通信**: Socket.IO
- **翻译服务**: 集成第三方翻译 API（如百度翻译或 Google Translate）

### 部署架构

```
[前端 Vue.js] <---> [Nginx反向代理] <---> [后端 Node.js API] <---> [PostgreSQL数据库]
                                                    |
                                                    v
                                              [Redis缓存]
                                                    |
                                                    v
                                              [文件存储系统]
```

## 组件和接口

### 核心模块设计

#### 1. 用户管理模块 (UserModule)

**设计决策**: 采用基于角色的访问控制(RBAC)，支持三种用户角色：超级管理员、买方用户、供应商用户。系统初始化时自动创建默认管理员账户。

**组件**:

- UserController: 处理用户 CRUD 操作
- AuthController: 处理登录认证和权限验证
- RoleMiddleware: 权限控制中间件
- InitializationService: 系统初始化服务，创建默认管理员账户

**接口**:

```typescript
interface User {
  id: string;
  username: string;
  password: string; // 加密存储
  role: "admin" | "buyer" | "supplier";
  company: "arroz" | "yunjie" | "admin";
  createdAt: Date;
  updatedAt: Date;
  language: "zh" | "ja";
}

// 默认管理员账户配置
const DEFAULT_ADMIN = {
  username: "admin",
  password: "admin123", // 将被加密存储
  role: "admin",
  company: "admin",
  language: "zh",
};
```

#### 2. 询单管理模块 (InquiryModule)

**设计决策**: 询单采用状态机模式管理，支持草稿、已发布、已回复、已转订单、已作废等状态。

**组件**:

- InquiryController: 询单 CRUD 操作
- InquiryService: 业务逻辑处理
- FileUploadService: 附件管理

**接口**:

```typescript
interface Inquiry {
  id: string;
  inquiryNumber: string; // 自动生成的询单号
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  quantity: number;
  attachments: FileAttachment[];
  status: "draft" | "published" | "replied" | "converted" | "cancelled";
  createdBy: string; // 买方用户ID
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. 报价管理模块 (QuotationModule)

**设计决策**: 报价与询单一对一关联，支持供应商修改报价直到买方转为订单。

**组件**:

- QuotationController: 报价操作控制
- NotificationService: 通知服务

**接口**:

```typescript
interface Quotation {
  id: string;
  inquiryId: string;
  unitPrice: number;
  totalPrice: number;
  deliveryTime: number; // 工期（天）
  remarks?: string;
  status: "active" | "cancelled";
  createdBy: string; // 供应商用户ID
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. 订单管理模块 (OrderModule)

**设计决策**: 订单支持两种创建方式：询单转换和独立创建。采用状态机管理订单生命周期。

**组件**:

- OrderController: 订单 CRUD 操作
- OrderService: 订单业务逻辑
- StatusTrackingService: 状态跟踪服务

**接口**:

```typescript
interface Order {
  id: string;
  orderNumber: string; // 自动生成的订单号
  inquiryId?: string; // 可选，从询单转换时存在
  productName: string;
  materialType: string;
  specifications: string;
  specialRequirements?: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  attachments: FileAttachment[];
  status:
    | "pending"
    | "confirmed"
    | "production"
    | "shipped"
    | "completed"
    | "cancelled";
  createdBy: string; // 买方用户ID
  confirmedBy?: string; // 供应商用户ID
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5. 实时通信模块 (ChatModule)

**设计决策**: 使用 Socket.IO 实现实时聊天，消息与询单/订单关联，支持消息翻译功能。

**组件**:

- ChatController: 聊天消息管理
- SocketService: Socket.IO 服务
- TranslationService: 翻译服务

**接口**:

```typescript
interface ChatMessage {
  id: string;
  relatedId: string; // 询单或订单ID
  relatedType: "inquiry" | "order";
  senderId: string;
  content: string;
  translatedContent?: string;
  timestamp: Date;
  isRead: boolean;
}
```

#### 6. 文件管理模块 (FileModule)

**设计决策**: 支持多种文件格式，实现文件预览和下载功能，文件与询单/订单关联。

**接口**:

```typescript
interface FileAttachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  relatedId: string; // 询单或订单ID
  relatedType: "inquiry" | "order";
  uploadedBy: string;
  uploadedAt: Date;
}
```

#### 7. 通知系统模块 (NotificationModule)

**设计决策**: 实现实时通知功能，支持报价通知、订单状态变更通知等业务事件。

**组件**:

- NotificationController: 通知管理
- NotificationService: 通知业务逻辑
- EventEmitter: 事件发布订阅

**接口**:

```typescript
interface Notification {
  id: string;
  userId: string;
  type:
    | "quotation_received"
    | "order_confirmed"
    | "status_updated"
    | "message_received";
  title: string;
  content: string;
  relatedId: string; // 相关询单或订单ID
  relatedType: "inquiry" | "order";
  isRead: boolean;
  createdAt: Date;
}
```

#### 8. 多语言国际化模块 (I18nModule)

**设计决策**: 支持中日文界面切换，用户语言偏好持久化存储。

**组件**:

- I18nService: 国际化服务
- LanguageMiddleware: 语言设置中间件

**接口**:

```typescript
interface I18nConfig {
  defaultLanguage: "zh" | "ja";
  supportedLanguages: ("zh" | "ja")[];
  fallbackLanguage: "zh";
}

interface TranslationKey {
  zh: string;
  ja: string;
}
```

#### 9. Dashboard 模块 (DashboardModule)

**设计决策**: 根据用户角色显示不同的仪表板内容和功能入口。

**组件**:

- DashboardController: 仪表板数据聚合
- RoleBasedViewService: 基于角色的视图服务

**接口**:

```typescript
interface DashboardData {
  userRole: string;
  availableFeatures: string[];
  statistics: {
    totalInquiries?: number;
    pendingQuotations?: number;
    activeOrders?: number;
    totalUsers?: number; // 仅管理员可见
  };
  recentActivities: Activity[];
}

interface Activity {
  id: string;
  type:
    | "inquiry_created"
    | "quotation_received"
    | "order_confirmed"
    | "status_updated";
  description: string;
  timestamp: Date;
  relatedId: string;
}
```

## 数据模型

### 数据库设计

**用户表 (users)**

- id (UUID, Primary Key)
- username (VARCHAR, Unique)
- password_hash (VARCHAR)
- role (ENUM: admin, buyer, supplier)
- company (ENUM: arroz, yunjie, admin)
- language (ENUM: zh, ja)
- created_at, updated_at (TIMESTAMP)

**询单表 (inquiries)**

- id (UUID, Primary Key)
- inquiry_number (VARCHAR, Unique)
- product_name (VARCHAR)
- material_type (VARCHAR)
- specifications (TEXT)
- special_requirements (TEXT)
- quantity (INTEGER)
- status (ENUM)
- created_by (UUID, Foreign Key)
- created_at, updated_at (TIMESTAMP)

**报价表 (quotations)**

- id (UUID, Primary Key)
- inquiry_id (UUID, Foreign Key)
- unit_price (DECIMAL)
- total_price (DECIMAL)
- delivery_time (INTEGER)
- remarks (TEXT)
- status (ENUM)
- created_by (UUID, Foreign Key)
- created_at, updated_at (TIMESTAMP)

**订单表 (orders)**

- id (UUID, Primary Key)
- order_number (VARCHAR, Unique)
- inquiry_id (UUID, Foreign Key, Nullable)
- product_name (VARCHAR)
- material_type (VARCHAR)
- specifications (TEXT)
- special_requirements (TEXT)
- unit_price (DECIMAL)
- quantity (INTEGER)
- total_price (DECIMAL)
- status (ENUM)
- created_by (UUID, Foreign Key)
- confirmed_by (UUID, Foreign Key, Nullable)
- created_at, updated_at (TIMESTAMP)

**聊天消息表 (chat_messages)**

- id (UUID, Primary Key)
- related_id (UUID)
- related_type (ENUM: inquiry, order)
- sender_id (UUID, Foreign Key)
- content (TEXT)
- translated_content (TEXT, Nullable)
- timestamp (TIMESTAMP)
- is_read (BOOLEAN)

**文件附件表 (file_attachments)**

- id (UUID, Primary Key)
- filename (VARCHAR)
- original_name (VARCHAR)
- mime_type (VARCHAR)
- size (INTEGER)
- path (VARCHAR)
- related_id (UUID)
- related_type (ENUM: inquiry, order)
- uploaded_by (UUID, Foreign Key)
- uploaded_at (TIMESTAMP)

**通知表 (notifications)**

- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- type (ENUM: quotation_received, order_confirmed, status_updated, message_received)
- title (VARCHAR)
- content (TEXT)
- related_id (UUID)
- related_type (ENUM: inquiry, order)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)

## 错误处理

### 错误分类和处理策略

1. **认证错误**: 401 Unauthorized

   - 未登录或 token 过期
   - 返回统一错误格式，前端跳转登录页

2. **权限错误**: 403 Forbidden

   - 用户角色权限不足
   - 显示友好的权限不足提示

3. **业务逻辑错误**: 400 Bad Request

   - 询单状态不允许修改
   - 订单已确认无法作废
   - 返回具体的业务错误信息

4. **文件上传错误**: 400 Bad Request

   - 文件格式不支持
   - 文件大小超限
   - 返回详细的文件错误信息

5. **系统错误**: 500 Internal Server Error
   - 数据库连接失败
   - 第三方服务调用失败
   - 记录错误日志，返回通用错误信息

### 错误响应格式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

## 测试策略

### 单元测试

- **覆盖率目标**: 80%以上
- **测试框架**: Jest + Supertest
- **测试重点**:
  - 业务逻辑函数
  - 数据验证逻辑
  - 权限控制逻辑

### 集成测试

- **API 接口测试**: 使用 Postman/Newman
- **数据库集成测试**: 使用测试数据库
- **文件上传测试**: 模拟各种文件格式

### 端到端测试

- **测试框架**: Cypress
- **测试场景**:
  - 完整的询单到订单流程
  - 用户权限控制
  - 多语言切换
  - 实时聊天功能

### 性能测试

- **负载测试**: 使用 Artillery.js
- **数据库性能**: 查询优化和索引测试
- **文件上传性能**: 大文件上传测试

### 安全测试

- **认证安全**: JWT token 安全性
- **文件上传安全**: 文件类型和大小限制
- **SQL 注入防护**: 参数化查询
- **XSS 防护**: 输入输出过滤
