# A2Y 贸易询单订单系统 — API 接口详细设计

> 版本：2.1
> 日期：2026-02-07
> 前置文档：requirements-v2.md, architecture-v2.md
> 状态：已确认

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
| format | string | - | 设为 `excel` 时返回 Excel 文件流而非 JSON |

当 `format=excel` 时，忽略 page/pageSize，导出符合筛选条件的全部数据，响应 Content-Type 为 `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`。

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

说明：不提供 logout 接口。JWT 无状态，退出登录由前端清除本地 token 实现。

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

获取用户列表。支持 `format=excel` 导出。

**额外查询参数：** role

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

获取询单列表（不含已软删除）。所有角色可访问。支持 `format=excel` 导出。

**额外查询参数：** status

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

获取询单详情。内嵌附件列表和报价历史，无需额外请求。

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
        "uploadedBy": { "id": "uuid", "username": "tanaka" },
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

### PUT /api/inquiries/:id/action

执行询单状态操作。

**请求：**
```json
{
  "action": "publish"
}
```

**action 取值：**

| action | 角色要求 | 前置状态 | 结果状态 | 说明 |
|--------|---------|---------|---------|------|
| `publish` | buyer（创建者） | draft | published | 发布询单，通知所有 supplier |
| `cancel` | buyer（创建者） | published（未被报价） | cancelled | 作废询单 |

**成功响应 (200)：** 返回更新后的询单对象

**错误 (400)：** `BUSINESS_ERROR` — 当前状态不允许此操作（如已被报价不能作废）

---

## 五、报价模块 `/api/quotations`

### POST /api/quotations

创建报价（对某个询单）。仅 supplier。已有报价时自动递增版本号。

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

首次报价时询单状态从 `published` 变为 `quoted`。

**错误 (400)：** `BUSINESS_ERROR` — 询单状态不允许报价 / 报价已被撤回需先恢复

触发：通知询单创建者

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

说明：报价历史通过 `GET /api/inquiries/:id` 的 quotations 字段获取，无需独立接口。

---

## 六、订单模块 `/api/orders`

### GET /api/orders

获取订单列表。所有角色可访问。支持 `format=excel` 导出。

**额外查询参数：** status

search 搜索范围：order_number, product_name

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "orderNumber": "ORD-20260207-0001",
        "inquiryId": null,
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
}
```

---

### GET /api/orders/:id

获取订单详情。内嵌附件列表和关联询单摘要。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260207-0001",
    "productName": "铝合金零件",
    "materialType": "6061铝合金",
    "specifications": "100x50x30mm",
    "specialRequirements": "表面阳极氧化处理",
    "unitPrice": 15.50,
    "quantity": 1000,
    "totalPrice": 15500.00,
    "status": "shipped",
    "createdBy": { "id": "uuid", "username": "tanaka" },
    "confirmedBy": { "id": "uuid", "username": "zhangsan" },
    "relatedInquiry": {
      "id": "uuid",
      "inquiryNumber": "INQ-20260207-0001"
    },
    "attachments": [
      {
        "id": "uuid",
        "originalName": "invoice.pdf",
        "mimeType": "application/pdf",
        "size": 524288,
        "uploadedBy": { "id": "uuid", "username": "zhangsan" },
        "createdAt": "2026-02-10T10:00:00.000Z"
      }
    ],
    "createdAt": "2026-02-07T14:00:00.000Z",
    "updatedAt": "2026-02-10T10:00:00.000Z"
  }
}
```

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

### PUT /api/orders/:id/action

执行订单状态操作。

**请求：**
```json
{
  "action": "confirm"
}
```

拒绝时可附带原因：
```json
{
  "action": "reject",
  "reason": "交期无法满足"
}
```

**action 取值：**

| action | 角色要求 | 前置状态 | 结果状态 | 说明 |
|--------|---------|---------|---------|------|
| `cancel` | buyer（创建者） | pending | cancelled | 买方作废订单 |
| `reject` | supplier | pending | rejected | 供应商拒绝订单，可附 reason |
| `confirm` | supplier | pending | confirmed | 供应商确认订单，记录 confirmedBy |
| `start_production` | supplier | confirmed | production | 开始生产 |
| `ship` | supplier | production | shipped | 发货（须已上传附件） |
| `complete` | buyer（创建者） | shipped | completed | 买方确认收货 |

**成功响应 (200)：** 返回更新后的订单对象

触发：每次状态变更通知对方（buyer↔supplier）

**错误 (400)：** `BUSINESS_ERROR` — 当前状态不允许此操作

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

**文件类型白名单：** `.jpg`, `.jpeg`, `.png`, `.pdf`, `.xlsx`, `.xls`, `.docx`, `.doc`, `.step`, `.stp`, `.stl`

**大小限制：** 单文件 20MB

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
| since | string (ISO 8601) | 可选，只返回此时间之后的消息（轮询增量获取） |
| page | number | 首次加载用分页（与 since 互斥） |
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

**额外查询参数：** isRead (boolean, 可选)

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

获取未读通知数量（轮询用，每 5 秒调一次）。

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "count": 3 }
}
```

---

### PUT /api/notifications/read

标记通知已读。支持单条和全部。

**标记单条：**
```json
{
  "id": "uuid"
}
```

**标记全部：**
```json
{
  "all": true
}
```

**成功响应 (200)：**
```json
{
  "success": true,
  "data": { "message": "已标记已读" }
}
```

---

## 十、审计日志模块 `/api/audit-logs`（仅 admin）

### GET /api/audit-logs

获取审计日志列表。支持 `format=excel` 导出。

**额外查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
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

## 十一、回收站模块 `/api/trash`（仅 admin）

### GET /api/trash

获取已软删除的数据列表。

**额外查询参数：** type（`inquiry` / `order` / `user`）

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

| # | 方法 | 路径 | 角色 | 说明 |
|---|------|------|------|------|
| 1 | POST | /api/auth/login | 公开 | 登录 |
| 2 | GET | /api/auth/me | 已认证 | 获取个人信息 |
| 3 | PUT | /api/auth/password | 已认证 | 修改密码 |
| 4 | GET | /api/users | admin | 用户列表（+Excel 导出） |
| 5 | POST | /api/users | admin | 创建用户 |
| 6 | PUT | /api/users/:id | admin | 修改用户 |
| 7 | PUT | /api/users/:id/reset-password | admin | 重置密码 |
| 8 | DELETE | /api/users/:id | admin | 删除用户 |
| 9 | GET | /api/inquiries | 已认证 | 询单列表（+Excel 导出） |
| 10 | GET | /api/inquiries/:id | 已认证 | 询单详情（含附件+报价历史） |
| 11 | POST | /api/inquiries | buyer | 创建询单 |
| 12 | PUT | /api/inquiries/:id | buyer(创建者) | 修改询单 |
| 13 | PUT | /api/inquiries/:id/action | buyer(创建者) | 询单状态操作（publish/cancel） |
| 14 | POST | /api/quotations | supplier | 提交/更新报价 |
| 15 | PUT | /api/quotations/inquiry/:id/withdraw | supplier(创建者) | 撤回报价 |
| 16 | GET | /api/orders | 已认证 | 订单列表（+Excel 导出） |
| 17 | GET | /api/orders/:id | 已认证 | 订单详情（含附件+关联询单） |
| 18 | POST | /api/orders | buyer | 创建订单 |
| 19 | PUT | /api/orders/:id/action | buyer/supplier | 订单状态操作（6 种 action） |
| 20 | POST | /api/files | 已认证 | 上传文件 |
| 21 | GET | /api/files/:id/download | 已认证 | 获取下载链接 |
| 22 | DELETE | /api/files/:id | 上传者/admin | 删除文件 |
| 23 | GET | /api/chat/:type/:id/messages | 已认证 | 获取聊天消息 |
| 24 | POST | /api/chat/:type/:id/messages | 已认证 | 发送消息 |
| 25 | PUT | /api/chat/:type/:id/read | 已认证 | 标记聊天已读 |
| 26 | GET | /api/notifications | 已认证 | 通知列表 |
| 27 | GET | /api/notifications/unread-count | 已认证 | 未读通知数 |
| 28 | PUT | /api/notifications/read | 已认证 | 标记通知已读（单条/全部） |
| 29 | GET | /api/audit-logs | admin | 审计日志（+Excel 导出） |
| 30 | GET | /api/trash | admin | 回收站列表 |
| 31 | PUT | /api/trash/:type/:id/restore | admin | 恢复数据 |
| 32 | DELETE | /api/trash/:type/:id | admin | 永久删除 |
| 33 | GET | /api/dashboard | 已认证 | Dashboard 数据 |

**合计：33 个接口**

---

> **下一步：** 进入**第四步：数据库详细设计**（完整建表 SQL + 索引 + 迁移脚本），然后**第五步：实施计划**。
