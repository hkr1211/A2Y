# A2Y 贸易询单订单系统 — API 接口详细设计

> 版本：2.0
> 日期：2026-02-07
> 前置文档：requirements-v2.md, architecture-v2.md
> 状态：待确认

---

## 一、通用约定

### 1.1 基础信息

| 项目 | 值 |
|------|-----|
| Base URL | `/api` |
| 内容类型 | `application/json`（文件上传除外） |
| 认证方式 | `Authorization: Bearer <token>`（登录接口除外） |
| 字符编码 | UTF-8 |

### 1.2 响应格式

**成功响应：**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-02-07T10:00:00.000Z"
}
```

**分页响应：**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  },
  "timestamp": "2026-02-07T10:00:00.000Z"
}
```

**错误响应：**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "产品名称不能为空"
  },
  "timestamp": "2026-02-07T10:00:00.000Z"
}
```

### 1.3 通用错误码

| code | HTTP 状态码 | 说明 |
|------|-----------|------|
| UNAUTHORIZED | 401 | 未登录或 token 过期 |
| FORBIDDEN | 403 | 无权限执行此操作 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| BUSINESS_ERROR | 400 | 业务规则不允许 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

### 1.4 通用查询参数

分页接口统一支持：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页条数（上限 100） |
| search | string | - | 关键词搜索 |
| sort | string | created_at | 排序字段 |
| order | string | desc | 排序方向：asc / desc |

---

## 二、认证模块 `/api/auth`

### POST /api/auth/login

登录。

**请求：**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "admin",
      "company": "admin",
      "language": "zh"
    }
  }
}
```

**错误 (401)：** `UNAUTHORIZED` — 用户名或密码错误

---

### POST /api/auth/logout

退出登录。需要认证。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "已退出登录" }
}
```

---

### GET /api/auth/me

获取当前登录用户信息。需要认证。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "company": "admin",
    "language": "zh",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### PUT /api/auth/password

修改自己的密码。需要认证。

**请求：**
```json
{
  "oldPassword": "admin123",
  "newPassword": "newPass456"
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "密码修改成功" }
}
```

**错误 (400)：** `BUSINESS_ERROR` — 旧密码不正确

---

## 三、用户管理模块 `/api/users`（仅 admin）

### GET /api/users

获取用户列表。

**查询参数：** page, pageSize, search, role

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "username": "tanaka",
        "role": "buyer",
        "company": "arroz",
        "language": "ja",
        "createdAt": "2026-01-15T00:00:00.000Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### POST /api/users

创建用户。

**请求：**
```json
{
  "username": "tanaka",
  "password": "initial123",
  "role": "buyer",
  "company": "arroz",
  "language": "ja"
}
```

**成功响应 (201)：** 返回创建的用户对象（不含 password）

**错误 (400)：** `VALIDATION_ERROR` — 用户名已存在

---

### PUT /api/users/:id

修改用户信息。不可修改 username。

**请求：**
```json
{
  "role": "buyer",
  "company": "arroz",
  "language": "zh"
}
```

**成功响应 (200)：** 返回更新后的用户对象

---

### PUT /api/users/:id/reset-password

管理员重置用户密码。

**请求：**
```json
{
  "newPassword": "reset123"
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "密码已重置" }
}
```

---

### DELETE /api/users/:id

软删除用户。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "用户已删除" }
}
```

**错误 (400)：** `BUSINESS_ERROR` — 不能删除自己

---

## 四、询单模块 `/api/inquiries`

### GET /api/inquiries

获取询单列表（不含已软删除）。所有角色可访问。

**查询参数：** page, pageSize, search, status, sort, order

search 搜索范围：inquiry_number, product_name

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "inquiryNumber": "INQ-20260207-0001",
        "productName": "铝合金零件",
        "materialType": "6061铝合金",
        "specifications": "100x50x30mm",
        "specialRequirements": null,
        "quantity": 1000,
        "status": "published",
        "createdBy": {
          "id": "uuid",
          "username": "tanaka"
        },
        "attachmentCount": 2,
        "latestQuotation": null,
        "unreadChatCount": 3,
        "createdAt": "2026-02-07T10:00:00.000Z",
        "updatedAt": "2026-02-07T10:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### GET /api/inquiries/:id

获取询单详情。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "inquiryNumber": "INQ-20260207-0001",
    "productName": "铝合金零件",
    "materialType": "6061铝合金",
    "specifications": "100x50x30mm",
    "specialRequirements": "表面阳极氧化处理",
    "quantity": 1000,
    "status": "quoted",
    "createdBy": {
      "id": "uuid",
      "username": "tanaka"
    },
    "attachments": [
      {
        "id": "uuid",
        "originalName": "design.pdf",
        "mimeType": "application/pdf",
        "size": 1048576,
        "createdAt": "2026-02-07T10:00:00.000Z"
      }
    ],
    "quotations": [
      {
        "id": "uuid",
        "version": 2,
        "unitPrice": 15.50,
        "totalPrice": 15500.00,
        "deliveryDays": 30,
        "remarks": "含运费",
        "isWithdrawn": false,
        "createdBy": { "id": "uuid", "username": "zhangsan" },
        "createdAt": "2026-02-07T12:00:00.000Z"
      },
      {
        "id": "uuid",
        "version": 1,
        "unitPrice": 18.00,
        "totalPrice": 18000.00,
        "deliveryDays": 45,
        "remarks": null,
        "isWithdrawn": false,
        "createdBy": { "id": "uuid", "username": "zhangsan" },
        "createdAt": "2026-02-07T11:00:00.000Z"
      }
    ],
    "createdAt": "2026-02-07T10:00:00.000Z",
    "updatedAt": "2026-02-07T12:00:00.000Z"
  }
}
```

---

### POST /api/inquiries

创建询单（草稿）。仅 buyer。

**请求：**
```json
{
  "productName": "铝合金零件",
  "materialType": "6061铝合金",
  "specifications": "100x50x30mm",
  "specialRequirements": "表面阳极氧化处理",
  "quantity": 1000
}
```

**成功响应 (201)：** 返回创建的询单对象，status 为 `draft`

---

### PUT /api/inquiries/:id

修改询单。仅 buyer 且为创建者，且状态为 draft 或 published（未被报价）。

**请求：** 同创建，字段均可选（只传需要修改的字段）

**成功响应 (200)：** 返回更新后的询单对象

**错误 (403)：** `FORBIDDEN` — 只能修改自己创建的询单
**错误 (400)：** `BUSINESS_ERROR` — 询单当前状态不允许修改

---

### PUT /api/inquiries/:id/publish

发布询单。仅 buyer 且为创建者，状态须为 draft。

**成功响应 (200)：** 返回更新后的询单对象，status 为 `published`

触发：通知所有 supplier 用户

---

### PUT /api/inquiries/:id/cancel

作废询单。仅 buyer 且为创建者，状态须为 published 且未被报价。

**成功响应 (200)：** 返回更新后的询单对象，status 为 `cancelled`

**错误 (400)：** `BUSINESS_ERROR` — 已被报价的询单不能作废

---

### GET /api/inquiries/export

导出询单列表为 Excel。

**查询参数：** search, status（同列表筛选条件）

**成功响应 (200)：** Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

返回 Excel 文件流。

---

## 五、报价模块 `/api/quotations`

### POST /api/quotations

创建报价（对某个询单）。仅 supplier。

**请求：**
```json
{
  "inquiryId": "uuid",
  "unitPrice": 15.50,
  "totalPrice": 15500.00,
  "deliveryDays": 30,
  "remarks": "含运费"
}
```

**成功响应 (201)：** 返回创建的报价对象，version 自动递增

**错误 (400)：** `BUSINESS_ERROR` — 询单状态不允许报价（非 published/quoted）

触发：通知询单创建者

---

### GET /api/quotations/inquiry/:inquiryId

获取某询单的全部报价历史。按 version 倒序。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "version": 2, "unitPrice": 15.50, "totalPrice": 15500.00, "deliveryDays": 30, "remarks": "含运费", "isWithdrawn": false, "createdBy": { "id": "uuid", "username": "zhangsan" }, "createdAt": "..." },
    { "id": "uuid", "version": 1, "unitPrice": 18.00, "totalPrice": 18000.00, "deliveryDays": 45, "remarks": null, "isWithdrawn": false, "createdBy": { "id": "uuid", "username": "zhangsan" }, "createdAt": "..." }
  ]
}
```

---

### PUT /api/quotations/inquiry/:inquiryId/withdraw

撤回某询单的所有报价。仅 supplier 且为报价创建者。询单须未转为订单。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "报价已撤回" }
}
```

触发：询单状态回到 `published`，通知询单创建者

**错误 (400)：** `BUSINESS_ERROR` — 询单已转为订单，不能撤回

---

## 六、订单模块 `/api/orders`

### GET /api/orders

获取订单列表。所有角色可访问。

**查询参数：** page, pageSize, search, status, sort, order

search 搜索范围：order_number, product_name

**成功响应 (200)：** 结构同询单列表，字段替换为订单字段，额外包含：
```json
{
  "items": [
    {
      "id": "uuid",
      "orderNumber": "ORD-20260207-0001",
      "inquiryId": "uuid 或 null",
      "productName": "铝合金零件",
      "materialType": "6061铝合金",
      "specifications": "100x50x30mm",
      "specialRequirements": null,
      "unitPrice": 15.50,
      "quantity": 1000,
      "totalPrice": 15500.00,
      "status": "confirmed",
      "createdBy": { "id": "uuid", "username": "tanaka" },
      "confirmedBy": { "id": "uuid", "username": "zhangsan" },
      "attachmentCount": 3,
      "unreadChatCount": 0,
      "createdAt": "2026-02-07T14:00:00.000Z",
      "updatedAt": "2026-02-07T15:00:00.000Z"
    }
  ],
  "total": 30,
  "page": 1,
  "pageSize": 20
}
```

---

### GET /api/orders/:id

获取订单详情（含附件列表）。

**成功响应 (200)：** 包含完整订单信息 + `attachments[]` + `relatedInquiry`（如有）

---

### POST /api/orders

创建订单。仅 buyer。

**从询单创建：**
```json
{
  "inquiryId": "uuid"
}
```
自动从询单和最新报价中填充产品信息和价格。询单状态变为 `converted`。

**独立创建：**
```json
{
  "productName": "铝合金零件",
  "materialType": "6061铝合金",
  "specifications": "100x50x30mm",
  "specialRequirements": "表面阳极氧化处理",
  "unitPrice": 15.50,
  "quantity": 1000,
  "totalPrice": 15500.00
}
```

**成功响应 (201)：** 返回创建的订单对象，status 为 `pending`

触发：通知所有 supplier 用户

**错误 (400)：** `BUSINESS_ERROR` — 询单状态不允许转订单

---

### PUT /api/orders/:id/cancel

买方作废订单。仅 buyer 且为创建者，状态须为 pending。

**成功响应 (200)：** status 变为 `cancelled`

---

### PUT /api/orders/:id/reject

供应商拒绝订单。仅 supplier，状态须为 pending。

**请求（可选）：**
```json
{
  "reason": "交期无法满足"
}
```

**成功响应 (200)：** status 变为 `rejected`

触发：通知订单创建者

---

### PUT /api/orders/:id/confirm

供应商确认订单。仅 supplier，状态须为 pending。

**成功响应 (200)：** status 变为 `confirmed`，confirmedBy 记录供应商 ID

触发：通知订单创建者

---

### PUT /api/orders/:id/start-production

供应商更新为生产中。仅 supplier，状态须为 confirmed。

**成功响应 (200)：** status 变为 `production`

触发：通知订单创建者

---

### PUT /api/orders/:id/ship

供应商发货。仅 supplier，状态须为 production。

**说明：** 发货时必须上传至少一个附件（发票/运单/材质单），附件通过 `/api/files` 接口预先上传，此接口只负责状态变更。

**成功响应 (200)：** status 变为 `shipped`

触发：通知订单创建者

---

### PUT /api/orders/:id/complete

买方确认收货。仅 buyer 且为创建者，状态须为 shipped。

**成功响应 (200)：** status 变为 `completed`

触发：通知供应商

---

### GET /api/orders/export

导出订单列表为 Excel。

**查询参数：** search, status

**成功响应 (200)：** Excel 文件流

---

## 七、文件附件模块 `/api/files`

### POST /api/files

上传文件。需要认证。

**请求：** `Content-Type: multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 文件内容 |
| relatedId | string | 是 | 关联的询单或订单 ID |
| relatedType | string | 是 | `inquiry` 或 `order` |

**成功响应 (201)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "originalName": "design.pdf",
    "mimeType": "application/pdf",
    "size": 1048576,
    "relatedId": "uuid",
    "relatedType": "inquiry",
    "uploadedBy": { "id": "uuid", "username": "tanaka" },
    "createdAt": "2026-02-07T10:00:00.000Z"
  }
}
```

**错误 (400)：** `VALIDATION_ERROR` — 文件类型不支持 / 文件过大

---

### GET /api/files/:id/download

获取文件的临时下载 URL。需要认证。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.oss-cn-xxx.aliyuncs.com/xxx?Expires=...&Signature=...",
    "expiresIn": 300
  }
}
```

返回一个 5 分钟有效的 OSS 签名 URL。

---

### DELETE /api/files/:id

删除附件。仅上传者本人或 admin。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "附件已删除" }
}
```

---

## 八、聊天模块 `/api/chat`

### GET /api/chat/:relatedType/:relatedId/messages

获取某询单/订单的聊天消息。

**路径参数：**
- relatedType: `inquiry` 或 `order`
- relatedId: 询单/订单 ID

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| since | string (ISO 8601) | 可选，只返回此时间之后的消息（轮询用） |
| page | number | 首次加载用分页 |
| pageSize | number | 默认 50 |

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "content": "你好，请问这个零件能做吗？",
        "sender": { "id": "uuid", "username": "tanaka", "role": "buyer" },
        "createdAt": "2026-02-07T10:30:00.000Z"
      }
    ],
    "total": 25
  }
}
```

---

### POST /api/chat/:relatedType/:relatedId/messages

发送聊天消息。

**请求：**
```json
{
  "content": "你好，请问这个零件能做吗？"
}
```

**成功响应 (201)：** 返回创建的消息对象

触发：创建通知给其他相关用户

---

### PUT /api/chat/:relatedType/:relatedId/read

标记已读。将当前用户在此聊天中的 last_read_at 更新为当前时间。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "已标记已读" }
}
```

---

## 九、通知模块 `/api/notifications`

### GET /api/notifications

获取当前用户的通知列表。

**查询参数：** page, pageSize, isRead (boolean, 可选)

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "quotation_new",
        "title": "收到新报价",
        "content": "询单 INQ-20260207-0001 收到了新的报价",
        "relatedId": "uuid",
        "relatedType": "inquiry",
        "isRead": false,
        "createdAt": "2026-02-07T12:00:00.000Z"
      }
    ],
    "total": 15,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### GET /api/notifications/unread-count

获取未读通知数量（轮询用）。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "count": 3 }
}
```

---

### PUT /api/notifications/:id/read

标记单条通知为已读。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "已标记已读" }
}
```

---

### PUT /api/notifications/read-all

标记所有通知为已读。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "已全部标记已读" }
}
```

---

## 十、审计日志模块 `/api/audit-logs`（仅 admin）

### GET /api/audit-logs

获取审计日志列表。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码 |
| pageSize | number | 每页条数 |
| userId | string | 按操作人筛选 |
| action | string | 按操作类型筛选 |
| targetType | string | 按对象类型筛选 |
| startDate | string | 开始时间 |
| endDate | string | 结束时间 |

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user": { "id": "uuid", "username": "zhangsan" },
        "action": "status_change",
        "targetType": "order",
        "targetId": "uuid",
        "summary": "将订单 ORD-20260207-0001 从 pending 改为 confirmed",
        "ipAddress": "203.0.113.1",
        "createdAt": "2026-02-07T15:00:00.000Z"
      }
    ],
    "total": 500,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### GET /api/audit-logs/export

导出审计日志为 Excel。

**查询参数：** 同列表筛选条件

**成功响应 (200)：** Excel 文件流

---

## 十一、回收站模块 `/api/trash`（仅 admin）

### GET /api/trash

获取已软删除的数据列表。

**查询参数：** page, pageSize, type（`inquiry` / `order` / `user`）

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "inquiry",
        "title": "INQ-20260207-0001 - 铝合金零件",
        "deletedAt": "2026-02-07T16:00:00.000Z",
        "deletedBy": { "id": "uuid", "username": "admin" }
      }
    ],
    "total": 5,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### PUT /api/trash/:type/:id/restore

恢复软删除的数据。

**路径参数：**
- type: `inquiry` / `order` / `user`
- id: 数据 ID

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "数据已恢复" }
}
```

---

### DELETE /api/trash/:type/:id

永久删除。需二次确认（前端处理）。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "数据已永久删除" }
}
```

---

## 十二、Dashboard 模块 `/api/dashboard`

### GET /api/dashboard

获取 Dashboard 数据。根据当前用户角色返回不同统计信息。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalInquiries": 50,
      "publishedInquiries": 10,
      "quotedInquiries": 15,
      "totalOrders": 30,
      "pendingOrders": 5,
      "productionOrders": 8,
      "completedOrders": 12,
      "totalUsers": 20
    },
    "recentActivities": [
      {
        "id": "uuid",
        "type": "order_confirmed",
        "description": "供应商确认了订单 ORD-20260207-0001",
        "relatedId": "uuid",
        "relatedType": "order",
        "createdAt": "2026-02-07T15:00:00.000Z"
      }
    ]
  }
}
```

**角色差异：**
- admin: 全部统计 + totalUsers
- buyer: 自己的询单/订单统计
- supplier: 待回复询单数 + 自己相关的订单统计

---

## 十三、接口清单总览

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| POST | /api/auth/login | 公开 | 登录 |
| POST | /api/auth/logout | 已认证 | 退出 |
| GET | /api/auth/me | 已认证 | 获取个人信息 |
| PUT | /api/auth/password | 已认证 | 修改密码 |
| GET | /api/users | admin | 用户列表 |
| POST | /api/users | admin | 创建用户 |
| PUT | /api/users/:id | admin | 修改用户 |
| PUT | /api/users/:id/reset-password | admin | 重置密码 |
| DELETE | /api/users/:id | admin | 删除用户 |
| GET | /api/inquiries | 已认证 | 询单列表 |
| GET | /api/inquiries/:id | 已认证 | 询单详情 |
| POST | /api/inquiries | buyer | 创建询单 |
| PUT | /api/inquiries/:id | buyer(创建者) | 修改询单 |
| PUT | /api/inquiries/:id/publish | buyer(创建者) | 发布询单 |
| PUT | /api/inquiries/:id/cancel | buyer(创建者) | 作废询单 |
| GET | /api/inquiries/export | 已认证 | 导出询单 Excel |
| POST | /api/quotations | supplier | 提交报价 |
| GET | /api/quotations/inquiry/:inquiryId | 已认证 | 报价历史 |
| PUT | /api/quotations/inquiry/:inquiryId/withdraw | supplier(创建者) | 撤回报价 |
| GET | /api/orders | 已认证 | 订单列表 |
| GET | /api/orders/:id | 已认证 | 订单详情 |
| POST | /api/orders | buyer | 创建订单 |
| PUT | /api/orders/:id/cancel | buyer(创建者) | 作废订单 |
| PUT | /api/orders/:id/reject | supplier | 拒绝订单 |
| PUT | /api/orders/:id/confirm | supplier | 确认订单 |
| PUT | /api/orders/:id/start-production | supplier | 开始生产 |
| PUT | /api/orders/:id/ship | supplier | 发货 |
| PUT | /api/orders/:id/complete | buyer(创建者) | 确认收货 |
| GET | /api/orders/export | 已认证 | 导出订单 Excel |
| POST | /api/files | 已认证 | 上传文件 |
| GET | /api/files/:id/download | 已认证 | 获取下载链接 |
| DELETE | /api/files/:id | 上传者/admin | 删除文件 |
| GET | /api/chat/:type/:id/messages | 已认证 | 获取聊天消息 |
| POST | /api/chat/:type/:id/messages | 已认证 | 发送消息 |
| PUT | /api/chat/:type/:id/read | 已认证 | 标记已读 |
| GET | /api/notifications | 已认证 | 通知列表 |
| GET | /api/notifications/unread-count | 已认证 | 未读数 |
| PUT | /api/notifications/:id/read | 已认证 | 标记已读 |
| PUT | /api/notifications/read-all | 已认证 | 全部已读 |
| GET | /api/audit-logs | admin | 审计日志 |
| GET | /api/audit-logs/export | admin | 导出日志 |
| GET | /api/trash | admin | 回收站 |
| PUT | /api/trash/:type/:id/restore | admin | 恢复数据 |
| DELETE | /api/trash/:type/:id | admin | 永久删除 |
| GET | /api/dashboard | 已认证 | Dashboard |

**合计：42 个接口**

---

> **下一步：** 确认 API 设计后，进入**第四步：数据库详细设计**（完整建表 SQL + 索引 + 迁移脚本），然后第五步制定**实施计划**（分阶段开发排期）。
