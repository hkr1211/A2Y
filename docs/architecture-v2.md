# A2Y 贸易询单订单系统 — 技术选型与系统架构设计

> 版本：2.0
> 日期：2026-02-07
> 前置文档：requirements-v2.md
> 状态：待确认

---

## 一、技术选型原则

根据业务背景（用户 < 50、访问量低、简单稳定优先），技术选型遵循以下原则：

| 原则 | 说明 |
|------|------|
| **能少则少** | 能用一个组件解决的不引入两个；能不用第三方库的不引入 |
| **能同步则不异步** | 不引入消息队列、事件总线等异步基础设施 |
| **能轮询则不长连接** | 用 HTTP 轮询替代 WebSocket，减少运维复杂度 |
| **用托管服务** | 数据库、文件存储用阿里云托管服务，不自己运维 |
| **单机部署** | 一台 ECS 跑完所有东西，不做微服务拆分 |

---

## 二、技术栈

### 2.1 V1 → V2 技术栈对比

| 组件 | V1 | V2 | 变更原因 |
|------|----|----|----------|
| 前端框架 | Vue 3 + TypeScript | Vue 3 + TypeScript | 保持不变，成熟稳定 |
| UI 库 | Element Plus | Element Plus | 保持不变 |
| 状态管理 | Pinia | Pinia | 保持不变 |
| 构建工具 | Vite | Vite | 保持不变 |
| 后端框架 | Express + TypeScript | Express + TypeScript | 保持不变，重点是重构架构 |
| 数据库 | PostgreSQL（本地） | 阿里云 RDS PostgreSQL | 托管，免运维 |
| 缓存 | Redis | **移除** | JWT 无状态，无需 session 缓存 |
| 实时通信 | Socket.IO | **HTTP 轮询** | 大幅简化，50 用户无性能问题 |
| 文件存储 | 本地磁盘 | 阿里云 OSS | 持久化，不依赖服务器磁盘 |
| 翻译服务 | 百度翻译 API | **移除** | 需求已移除翻译功能 |
| 反向代理 | 无 | Nginx | 静态文件托管 + API 反向代理 + HTTPS |
| 进程管理 | 无 | PM2 | 后端进程守护，崩溃自动重启 |

### 2.2 最终技术栈清单

```
前端：Vue 3.4 + TypeScript + Element Plus + Pinia + Vue Router + Vue I18n + Vite
后端：Node.js 18 + Express + TypeScript
数据库：PostgreSQL 15（阿里云 RDS）
文件存储：阿里云 OSS
运行环境：阿里云 ECS (Ubuntu)
反向代理：Nginx
进程管理：PM2
Excel 导出：exceljs（后端库）
```

### 2.3 移除的依赖

| 移除项 | 原因 |
|--------|------|
| Redis | 无需 session 缓存 |
| Socket.IO / socket.io-client | 轮询替代 |
| 百度翻译 SDK / axios（后端调翻译用） | 翻译功能移除 |
| helmet | Nginx 层统一设置安全 headers |
| compression | Nginx 层统一处理 gzip |
| morgan | 用 Nginx access log 替代 HTTP 日志 |
| express-rate-limit | Nginx 层统一限流 |
| winston | 简化为单文件日志（console + 写文件），不需要多 transport |

---

## 三、部署架构

### 3.1 整体架构图

```
用户浏览器
    │
    │ HTTPS
    ▼
┌──────────────────────────────────────────────┐
│              阿里云 ECS (1台)                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │              Nginx                      │  │
│  │  ┌──────────────┬───────────────────┐  │  │
│  │  │ /            │ /api/*            │  │  │
│  │  │ 静态文件      │ 反向代理           │  │  │
│  │  │ (Vue SPA)    │ → localhost:3000  │  │  │
│  │  └──────────────┴───────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                     │                        │
│                     ▼                        │
│  ┌────────────────────────────────────────┐  │
│  │     Node.js (Express) — PM2 守护       │  │
│  │         localhost:3000                  │  │
│  └──────┬────────────────────┬────────────┘  │
│         │                    │               │
└─────────┼────────────────────┼───────────────┘
          │                    │
          ▼                    ▼
 ┌─────────────────┐  ┌─────────────────┐
 │ 阿里云 RDS       │  │ 阿里云 OSS       │
 │ PostgreSQL 15    │  │ 文件存储         │
 │ (同地域内网访问)  │  │ (同地域内网访问)  │
 └─────────────────┘  └─────────────────┘
```

### 3.2 阿里云资源规划

| 资源 | 规格建议 | 预估月费(参考) | 说明 |
|------|----------|---------------|------|
| ECS | 2vCPU 4GB（ecs.t6-c1m2.large） | ~¥100 | 跑 Nginx + Node.js |
| RDS PostgreSQL | 1核1GB 基础版 | ~¥70 | 20GB 存储起步，自动备份 |
| OSS | 标准存储 | 按量（几元/月） | 存储文件附件 |
| 域名 | .com 或 .cn | ~¥60/年 | |
| SSL 证书 | 免费 DV 证书（阿里云提供） | ¥0 | |
| **合计** | | **~¥200/月** | |

### 3.3 Nginx 职责

Nginx 统一承担以下横切关注点，后端代码不再处理：

| 职责 | 说明 |
|------|------|
| HTTPS 终止 | SSL 证书挂在 Nginx，后端只监听 HTTP |
| 静态文件服务 | 直接返回 Vue 构建产物，不经过 Node.js |
| API 反向代理 | `/api/*` 转发到 Node.js `localhost:3000` |
| Gzip 压缩 | 压缩静态文件和 API 响应 |
| 安全 Headers | X-Frame-Options, X-Content-Type-Options 等 |
| 请求限流 | limit_req 模块，防止接口被刷 |
| 访问日志 | access.log 记录所有请求 |
| 文件上传大小限制 | client_max_body_size 20m |

---

## 四、后端架构设计

### 4.1 分层架构

```
HTTP 请求
    │
    ▼
┌──────────┐
│  Routes   │  路由定义，参数提取，调用 Controller
└────┬─────┘
     ▼
┌──────────┐
│Controller │  请求验证，调用 Service，格式化响应
└────┬─────┘
     ▼
┌──────────┐
│ Service   │  业务逻辑，权限校验，状态机流转，调用 Repository
└────┬─────┘
     ▼
┌──────────┐
│Repository │  SQL 查询，数据库交互，返回原始数据
└──────────┘
```

**V1 的问题：** Controller 直接调 Model、部分 Controller 有 Service 部分没有、全局单例 `(global as any).xxx`。

**V2 的改进：**

| 层 | 职责 | 规则 |
|----|------|------|
| Route | URL → Handler 映射 | 只做路由定义和中间件挂载，不含任何业务逻辑 |
| Controller | 入参解析 + 出参格式化 | 不直接访问数据库，不包含业务判断逻辑 |
| Service | 业务逻辑 | 唯一包含业务规则的层（权限校验、状态流转、通知触发等） |
| Repository | 数据存取 | 只做 SQL 和数据映射，不含业务判断 |

### 4.2 模块划分

```
backend/src/
├── app.ts                 # Express app 创建和中间件挂载
├── server.ts              # 启动入口（监听端口）
├── routes/
│   ├── auth.ts
│   ├── user.ts
│   ├── inquiry.ts
│   ├── quotation.ts
│   ├── order.ts
│   ├── chat.ts
│   ├── notification.ts
│   ├── file.ts
│   ├── auditLog.ts
│   └── trash.ts
├── controllers/
│   ├── AuthController.ts
│   ├── UserController.ts
│   ├── InquiryController.ts
│   ├── QuotationController.ts
│   ├── OrderController.ts
│   ├── ChatController.ts
│   ├── NotificationController.ts
│   ├── FileController.ts
│   ├── AuditLogController.ts
│   └── TrashController.ts
├── services/
│   ├── AuthService.ts       # 登录、JWT、密码
│   ├── UserService.ts       # 用户 CRUD
│   ├── InquiryService.ts    # 询单业务逻辑 + 状态机
│   ├── QuotationService.ts  # 报价版本管理
│   ├── OrderService.ts      # 订单业务逻辑 + 状态机
│   ├── ChatService.ts       # 聊天消息
│   ├── NotificationService.ts # 通知创建和查询
│   ├── FileService.ts       # 文件上传/下载（对接 OSS）
│   ├── AuditLogService.ts   # 审计日志记录
│   ├── TrashService.ts      # 回收站管理
│   └── ExportService.ts     # Excel 导出
├── repositories/
│   ├── UserRepository.ts
│   ├── InquiryRepository.ts
│   ├── QuotationRepository.ts
│   ├── OrderRepository.ts
│   ├── ChatMessageRepository.ts
│   ├── NotificationRepository.ts
│   ├── FileAttachmentRepository.ts
│   └── AuditLogRepository.ts
├── middleware/
│   ├── auth.ts              # JWT 验证，挂载 req.user
│   ├── role.ts              # 角色权限校验
│   ├── validate.ts          # 请求参数验证（统一入口）
│   └── errorHandler.ts      # 全局错误处理
├── shared/
│   ├── errors.ts            # AppError 类定义
│   ├── response.ts          # 统一响应格式工具
│   ├── types.ts             # 全局类型定义
│   ├── constants.ts         # 枚举、状态机配置
│   └── validation.ts        # Joi schema 集中定义
├── config/
│   ├── database.ts          # PostgreSQL 连接池
│   └── oss.ts               # 阿里云 OSS 配置
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_inquiries.sql
│   ├── 003_create_quotations.sql
│   ├── 004_create_orders.sql
│   ├── 005_create_file_attachments.sql
│   ├── 006_create_chat_messages.sql
│   ├── 007_create_chat_read_status.sql
│   ├── 008_create_notifications.sql
│   └── 009_create_audit_logs.sql
└── utils/
    ├── logger.ts            # 简单日志（console + 文件）
    └── migrationRunner.ts   # 迁移执行器
```

### 4.3 统一错误处理

**V1 的问题：** 每个 Controller 自己 try-catch，错误格式不一致。

**V2 方案：** 定义 `AppError` 类，Controller 不写 try-catch，全部由 `errorHandler` 中间件统一捕获。

```
AppError(code, message, statusCode)
    │
    │  Controller / Service 中直接 throw
    ▼
errorHandler 中间件
    │
    │  判断 error 类型
    ▼
┌─ AppError → 返回 { success: false, error: { code, message }, timestamp }
│
└─ 其他 Error → 记录日志 → 返回 500 通用错误
```

常见错误码定义：

| code | statusCode | 场景 |
|------|-----------|------|
| UNAUTHORIZED | 401 | 未登录或 token 过期 |
| FORBIDDEN | 403 | 角色无权限 |
| NOT_FOUND | 404 | 资源不存在 |
| VALIDATION_ERROR | 400 | 参数验证失败 |
| BUSINESS_ERROR | 400 | 业务规则不允许（如已报价的询单不可修改） |
| INTERNAL_ERROR | 500 | 系统内部错误 |

### 4.4 统一响应格式

所有 API 返回统一结构：

```
成功：{ success: true,  data: T,     timestamp: string }
失败：{ success: false, error: {...}, timestamp: string }
分页：{ success: true,  data: { items: T[], total: number, page: number, pageSize: number }, timestamp: string }
```

Controller 层使用工具函数：

```
res.json(ok(data))          → { success: true, data, timestamp }
res.json(paginated(items, total, page, pageSize))
throw new AppError(...)     → 由 errorHandler 格式化
```

### 4.5 参数验证

**V1 的问题：** Joi schema 在 Controller 和 Model 中重复定义。

**V2 方案：** 所有 Joi schema 集中在 `shared/validation.ts`，在 Route 层通过 `validate` 中间件调用：

```
路由定义示例：
router.post('/', validate(schemas.createInquiry), controller.create)

validate 中间件：
  → 验证 req.body / req.query / req.params
  → 失败时 throw new AppError('VALIDATION_ERROR', ...)
  → 成功时 next()
```

### 4.6 依赖注入

**V1 的问题：** `(global as any).socketService` 全局单例，不可测试。

**V2 方案：** 手动构造函数注入，不引入 DI 框架（保持简单）：

```
server.ts 启动时：
  const pool = createPool(config)
  const userRepo = new UserRepository(pool)
  const auditLogService = new AuditLogService(new AuditLogRepository(pool))
  const userService = new UserService(userRepo, auditLogService)
  const userController = new UserController(userService)

路由注册：
  app.use('/api/users', createUserRoutes(userController))
```

所有依赖在启动时一次性组装，每个类通过构造函数声明自己需要什么。

### 4.7 实时消息方案：HTTP 轮询

**V1 的问题：** Socket.IO 引入了连接管理、房间、事件系统、token 刷新等复杂性。

**V2 方案：** 简单 HTTP 轮询。

```
前端每 5 秒调用：
  GET /api/notifications/unread-count → { count: 3 }
  GET /api/chat/new-messages?since=2026-02-07T10:00:00Z → [messages...]

聊天窗口打开时，轮询间隔缩短到 2 秒。
聊天窗口关闭时，停止聊天轮询，只保留通知轮询。
```

| 指标 | 计算 |
|------|------|
| 每用户每分钟请求 | 通知: 12次 + 聊天(打开时): 30次 |
| 50用户同时在线 | 最多 ~2100 次/分钟 ≈ 35 QPS |
| 单台 ECS 承载能力 | 轻松承载 1000+ QPS |

完全不存在性能问题。

### 4.8 审计日志实现

Service 层在关键操作后调用 `AuditLogService.log()`：

```
async createInquiry(userId, data) {
  const inquiry = await this.inquiryRepo.create(data);
  await this.auditLog.log({
    userId,
    action: 'create',
    targetType: 'inquiry',
    targetId: inquiry.id,
    summary: `创建询单 ${inquiry.inquiryNumber}`,
  });
  return inquiry;
}
```

审计日志是同步写入，不用消息队列。日志量小（每天几十到几百条），直接写数据库即可。

---

## 五、前端架构设计

### 5.1 目录结构

```
frontend/src/
├── main.ts                  # 入口：创建 app，注册插件
├── App.vue                  # 根组件：布局框架
├── router/
│   └── index.ts             # 路由定义 + 导航守卫
├── stores/
│   └── auth.ts              # 认证状态（唯一 store）
├── services/
│   ├── api.ts               # axios 实例创建 + 拦截器（唯一入口）
│   ├── authService.ts
│   ├── userService.ts
│   ├── inquiryService.ts
│   ├── quotationService.ts
│   ├── orderService.ts
│   ├── chatService.ts
│   ├── notificationService.ts
│   └── fileService.ts
├── composables/
│   ├── usePagination.ts     # 分页逻辑复用
│   ├── usePolling.ts        # 轮询逻辑复用
│   └── useExport.ts         # 导出逻辑复用
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   └── AppSidebar.vue   （如需要）
│   ├── common/
│   │   ├── StatusTag.vue    # 状态标签（统一样式）
│   │   ├── FileUpload.vue   # 文件上传组件
│   │   └── ChatPanel.vue    # 聊天面板（通用）
│   └── dialogs/
│       ├── InquiryFormDialog.vue
│       ├── QuotationFormDialog.vue
│       ├── OrderFormDialog.vue
│       └── UserFormDialog.vue
├── views/
│   ├── Login.vue
│   ├── Dashboard.vue
│   ├── UserList.vue
│   ├── InquiryList.vue
│   ├── InquiryDetail.vue
│   ├── OrderList.vue
│   ├── OrderDetail.vue
│   ├── Trash.vue
│   ├── AuditLog.vue
│   └── ChangePassword.vue
├── locales/
│   ├── zh.ts
│   └── ja.ts
├── types/
│   └── index.ts             # 所有类型集中定义
└── utils/
    └── constants.ts          # 状态枚举、颜色映射等
```

### 5.2 解决 V1 的前端问题

| V1 问题 | V2 方案 |
|---------|---------|
| API 响应解析重复 30+ 次 | `api.ts` 中拦截器统一解包，service 直接返回 data |
| 分页逻辑 5 个 View 重复 | `usePagination()` composable 复用 |
| 状态标签 switch-case 重复 | `StatusTag.vue` 组件 + `constants.ts` 配置映射 |
| 角色判断散落各处 | `auth.ts` store 提供 `canCreateInquiry` 等计算属性 |
| axios 拦截器注册多次 | `api.ts` 创建独立 axios 实例，拦截器只注册一次 |
| `customer` / `buyer` 类型不一致 | 统一为 `buyer`，类型定义在 `types/index.ts` 一处 |

### 5.3 API 调用模式

```
api.ts:
  创建 axios 实例
  请求拦截器：从 auth store 读 token，写入 header
  响应拦截器：
    成功 → 解包 response.data.data，直接返回业务数据
    401 → 清除登录态，跳转登录页
    其他错误 → 抛出带 code/message 的错误

各 service:
  import api from './api'
  export async function getInquiries(params) {
    return api.get('/inquiries', { params })
    // 直接得到 { items, total, page, pageSize }，无需再解包
  }

各 view:
  const { data, loading } = usePagination(getInquiries, filters)
  // 分页、加载状态、错误处理全部封装在 composable 中
```

### 5.4 轮询方案

```
usePolling composable:
  - 接收一个异步函数和间隔时间
  - 组件 mount 时启动，unmount 时自动清除
  - 提供 start() / stop() / 手动调用

使用示例：
  // App.vue 中全局轮询通知
  usePolling(() => notificationService.getUnreadCount(), 5000)

  // ChatPanel.vue 中轮询新消息
  usePolling(() => chatService.getMessages(relatedId, since), 2000)
```

---

## 六、数据库设计补充

### 6.1 索引策略

| 表 | 索引 | 说明 |
|----|------|------|
| users | username (UNIQUE) | 登录查询 |
| inquiries | created_by, status | 按创建者和状态筛选 |
| inquiries | inquiry_number (UNIQUE) | 编号查询 |
| quotations | inquiry_id, version | 按询单查报价历史 |
| orders | created_by, status | 按创建者和状态筛选 |
| orders | order_number (UNIQUE) | 编号查询 |
| chat_messages | related_type, related_id, created_at | 按关联对象查消息列表 |
| chat_read_status | user_id, related_type, related_id (UNIQUE) | 查已读状态 |
| notifications | user_id, is_read, created_at | 查未读通知 |
| audit_logs | user_id, created_at | 按操作人和时间查 |
| audit_logs | target_type, target_id | 按操作对象查 |
| file_attachments | related_type, related_id | 按关联对象查附件 |

### 6.2 软删除查询约定

所有查询默认加 `WHERE deleted_at IS NULL`。回收站查询用 `WHERE deleted_at IS NOT NULL`。

Repository 层提供两组方法：

```
findAll()     → WHERE deleted_at IS NULL（默认）
findDeleted() → WHERE deleted_at IS NOT NULL（回收站）
softDelete()  → UPDATE SET deleted_at = NOW()
restore()     → UPDATE SET deleted_at = NULL
hardDelete()  → DELETE（仅永久删除时使用）
```

---

## 七、安全设计

### 7.1 各层安全职责划分

| 层 | 职责 | 不做的事 |
|----|------|---------|
| **Nginx** | HTTPS、安全 Headers、限流、请求大小限制 | 不做业务鉴权 |
| **Auth 中间件** | 验证 JWT Token、挂载 req.user | 不做角色判断 |
| **Role 中间件** | 检查用户角色是否有权访问该路由 | 不做数据级权限判断 |
| **Service** | 数据级权限（"这条询单是不是你创建的"） | 不做 SQL |
| **Repository** | 参数化查询（防 SQL 注入） | 不做业务判断 |

### 7.2 移除 V1 的正则 SQL 注入检测

V1 中 `security.ts` 用正则匹配 SQL 关键词（SELECT、UPDATE 等），会误杀合法业务文本。V2 中完全移除此层，安全完全依赖参数化查询。

### 7.3 文件上传安全

| 检查项 | 实现位置 |
|--------|---------|
| 文件大小 ≤ 20MB | Nginx `client_max_body_size` + Multer `limits` |
| 文件类型白名单 | Service 层校验扩展名（`.jpg/.png/.pdf/.xlsx/.docx/.step/.stl`） |
| 文件存储隔离 | 上传到 OSS，用 UUID 重命名，不暴露原始文件名在 URL 中 |
| 下载鉴权 | 不使用 OSS 公开 URL，通过后端 API 签发临时下载链接 |

---

## 八、开发与部署流程

### 8.1 本地开发

```
1. 启动本地 PostgreSQL（或连接阿里云 RDS 测试实例）
2. cd backend && npm install && npm run dev   → localhost:3000
3. cd frontend && npm install && npm run dev  → localhost:5173（自动代理 /api）
```

### 8.2 构建与部署

```
本地构建：
  cd frontend && npm run build  → dist/
  cd backend && npm run build   → dist/

上传到 ECS：
  scp -r frontend/dist backend/dist backend/package.json user@ecs:/app/

ECS 上：
  cd /app/backend && npm install --production
  pm2 start dist/server.js --name a2y-api
  # Nginx 配置指向 /app/frontend/dist 和 localhost:3000
```

### 8.3 目录结构（ECS 上）

```
/app/
├── frontend/dist/     # Vue 构建产物（Nginx 直接服务）
├── backend/
│   ├── dist/          # TypeScript 编译产物
│   ├── node_modules/  # 生产依赖
│   └── .env           # 环境变量
└── nginx/
    └── a2y.conf       # Nginx 站点配置
```

---

## 九、需要你确认的决策点

| 序号 | 决策 | 我的建议 | 需要你确认 |
|------|------|---------|-----------|
| 1 | 实时消息用轮询还是 WebSocket？ | **轮询**（5秒通知/2秒聊天），50 用户无压力 | 你能接受聊天有 2 秒延迟吗？ |
| 2 | 后端 HTTP 日志交给 Nginx？ | **是**，后端只记业务日志和错误 | 可以吗？ |
| 3 | 文件下载通过后端签发临时 URL？ | **是**，不暴露 OSS 直接地址 | 可以吗？ |
| 4 | 前后端同机部署？ | **是**，一台 ECS 跑完 | 可以吗？ |
| 5 | 暂不做自动化 CI/CD？ | **是**，手动 scp 部署，后续有需要再加 | 可以吗？ |

---

> **下一步：** 确认以上决策后，进入**第三步：API 接口详细设计**（每个接口的 URL、Method、请求参数、响应结构、错误码）。
