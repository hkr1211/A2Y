# A2Y 贸易询单订单系统 — 实施计划

> 版本：2.0
> 日期：2026-02-07
> 前置文档：requirements-v2.md, architecture-v2.md, api-design-v2.md, database-design-v2.md
> 状态：待确认

---

## 一、实施原则

| 原则 | 说明 |
|------|------|
| **纵向切片** | 每个阶段交付完整的、可运行的功能（前端+后端+数据库），而非先写完所有后端再写前端 |
| **核心先行** | 先做认证和询单→报价→订单主流程，再做辅助功能（通知、聊天、导出等） |
| **每阶段可验收** | 每个阶段结束后有明确的验收标准，可以直接在浏览器上操作验证 |
| **基础设施一次到位** | 第一阶段把项目骨架、分层架构、统一错误处理等搭好，后续阶段只加业务代码 |

---

## 二、阶段划分

```
阶段 0  项目骨架 + 基础设施
  │
  ▼
阶段 1  用户管理 + 认证
  │
  ▼
阶段 2  询单管理
  │
  ▼
阶段 3  报价管理
  │
  ▼
阶段 4  订单管理
  │
  ▼
阶段 5  文件附件（对接 OSS）
  │
  ▼
阶段 6  聊天 + 通知
  │
  ▼
阶段 7  审计日志 + 回收站 + Excel 导出
  │
  ▼
阶段 8  多语言 + UI 完善
  │
  ▼
阶段 9  部署上线（阿里云）
```

---

## 三、各阶段详细内容

### 阶段 0：项目骨架 + 基础设施

**目标：** 搭建可运行的空项目，所有分层架构和通用机制就位。

**后端任务：**
- 初始化 Node.js + Express + TypeScript 项目
- 配置 ESLint + Prettier
- 创建目录结构（routes / controllers / services / repositories / middleware / shared / config）
- 实现 `shared/errors.ts`（AppError 类）
- 实现 `shared/response.ts`（ok / paginated 工具函数）
- 实现 `middleware/errorHandler.ts`（全局错误捕获）
- 实现 `middleware/validate.ts`（Joi 验证中间件）
- 实现 `config/database.ts`（PostgreSQL 连接池）
- 实现 `utils/migrationRunner.ts`（迁移执行器）
- 实现 `utils/logger.ts`（简单日志：console + 文件）
- 创建 `server.ts` + `app.ts`（分离 app 创建和启动）
- 编写 `.env.example`
- 验证：`npm run dev` 启动成功，`GET /api` 返回 `{ success: true }`

**前端任务：**
- 初始化 Vue 3 + TypeScript + Vite 项目
- 安装并配置 Element Plus、Pinia、Vue Router、Vue I18n
- 配置 ESLint + Prettier
- 创建目录结构（views / components / services / composables / stores / types / locales）
- 实现 `services/api.ts`（axios 实例 + 拦截器）
- 实现 `types/index.ts`（所有类型定义）
- 实现 `utils/constants.ts`（状态枚举 + 颜色映射）
- 配置 Vite 代理（/api → localhost:3000）
- 验证：`npm run dev` 启动成功，能看到空白页面

**验收标准：**
- [x] 前后端均可启动，无报错
- [x] 后端 `GET /api` 返回正确 JSON
- [x] 前端页面可加载
- [x] 代码通过 lint 检查

---

### 阶段 1：用户管理 + 认证

**目标：** 管理员可以登录、管理用户、修改密码。

**数据库：** 执行迁移 001（users 表）+ 011（默认管理员逻辑）

**后端任务：**
- 实现 `middleware/auth.ts`（JWT 验证，挂载 req.user）
- 实现 `middleware/role.ts`（角色权限校验）
- 实现 `shared/validation.ts`（登录、用户 CRUD 的 Joi schema）
- 实现 UserRepository → UserService → UserController → user routes
- 实现 AuthService → AuthController → auth routes
- 实现 InitializationService（启动时创建默认管理员）
- 涉及接口：#1 #2 #3 #4 #5 #6 #7 #8

**前端任务：**
- 实现 `stores/auth.ts`（登录态管理）
- 实现 `router/index.ts`（路由定义 + 导航守卫）
- 实现 `views/Login.vue`（登录页）
- 实现 `App.vue`（布局框架 + AppHeader）
- 实现 `components/layout/AppHeader.vue`（导航栏 + 退出登录）
- 实现 `views/UserList.vue`（用户列表 + 增删改）
- 实现 `components/dialogs/UserFormDialog.vue`
- 实现 `views/ChangePassword.vue`（修改密码）
- 实现 `composables/usePagination.ts`

**验收标准：**
- [ ] admin/admin123 可以登录
- [ ] 管理员可以创建 buyer 和 supplier 用户
- [ ] 管理员可以修改、删除用户
- [ ] 管理员可以重置用户密码
- [ ] 所有用户可以修改自己的密码
- [ ] 未登录访问受保护页面时跳转到登录页
- [ ] 非 admin 角色无法访问用户管理页面

---

### 阶段 2：询单管理

**目标：** 买方可以创建、发布、修改、作废询单，所有角色可查看询单列表和详情。

**数据库：** 执行迁移 002（inquiries 表）

**后端任务：**
- 实现 InquiryRepository → InquiryService → InquiryController → inquiry routes
- 实现询单状态机（draft → published → cancelled）
- 实现询单编号自动生成（INQ-YYYYMMDD-XXXX）
- 实现 AuditLogService 基础版（记录操作日志到 console，待阶段 7 写入数据库）
- 涉及接口：#9 #10 #11 #12 #13

**前端任务：**
- 实现 `views/InquiryList.vue`（询单列表 + 状态筛选 + 搜索）
- 实现 `views/InquiryDetail.vue`（询单详情页，暂无报价和聊天）
- 实现 `components/dialogs/InquiryFormDialog.vue`（创建/编辑询单）
- 实现 `components/common/StatusTag.vue`（通用状态标签）
- 实现 `views/Dashboard.vue`（基础版，显示询单统计）

**验收标准：**
- [ ] 买方可以创建询单（草稿）
- [ ] 买方可以发布询单
- [ ] 买方可以修改草稿/已发布的询单
- [ ] 买方可以作废已发布的询单
- [ ] 所有角色可以查看询单列表和详情
- [ ] 询单编号自动生成且唯一
- [ ] 状态筛选和搜索正常工作

---

### 阶段 3：报价管理

**目标：** 供应商可以对询单报价，买方可以查看报价历史。

**数据库：** 执行迁移 003（quotations 表）

**后端任务：**
- 实现 QuotationRepository → QuotationService → QuotationController → quotation routes
- 实现报价版本递增逻辑
- 实现报价撤回逻辑（联动询单状态）
- 更新 InquiryService（报价后状态变为 quoted）
- 涉及接口：#14 #15（报价历史通过 #10 询单详情返回）

**前端任务：**
- 实现 `components/dialogs/QuotationFormDialog.vue`（提交报价）
- 更新 `views/InquiryDetail.vue`（展示报价历史列表 + 撤回按钮）
- 根据角色显示不同操作按钮（buyer 看报价，supplier 提交报价）

**验收标准：**
- [ ] 供应商可以对已发布询单提交报价
- [ ] 供应商可以修改报价（自动新版本）
- [ ] 买方可以查看全部报价历史
- [ ] 供应商可以撤回报价，询单回到已发布状态
- [ ] 已被报价的询单不可被买方作废或修改

---

### 阶段 4：订单管理

**目标：** 买方可以创建订单（从询单转换或独立创建），供应商可以确认/拒绝/更新状态，买方可以确认收货。

**数据库：** 执行迁移 004（orders 表）

**后端任务：**
- 实现 OrderRepository → OrderService → OrderController → order routes
- 实现订单状态机（pending → confirmed → production → shipped → completed）
- 实现从询单创建订单（联动询单状态变为 converted）
- 实现独立创建订单
- 实现订单编号自动生成（ORD-YYYYMMDD-XXXX）
- 涉及接口：#16 #17 #18 #19

**前端任务：**
- 实现 `views/OrderList.vue`（订单列表 + 状态筛选 + 搜索）
- 实现 `views/OrderDetail.vue`（订单详情 + 操作按钮）
- 实现 `components/dialogs/OrderFormDialog.vue`（独立创建订单）
- 在 InquiryDetail 中添加"转为订单"按钮
- 根据角色和状态显示不同操作按钮
- 更新 Dashboard（添加订单统计）

**验收标准：**
- [ ] 买方可以从已报价询单创建订单
- [ ] 买方可以独立创建订单
- [ ] 供应商可以确认/拒绝订单
- [ ] 供应商可以更新生产状态和发货状态
- [ ] 买方可以确认收货
- [ ] 买方可以作废未确认的订单
- [ ] 已确认的订单不可作废
- [ ] 完整状态机流转正确

---

### 阶段 5：文件附件

**目标：** 询单和订单可以上传/下载/删除附件，文件存储在阿里云 OSS。

**数据库：** 执行迁移 005（file_attachments 表）

**后端任务：**
- 配置阿里云 OSS SDK（`config/oss.ts`）
- 实现 FileRepository → FileService → FileController → file routes
- 实现文件上传到 OSS（UUID 重命名）
- 实现签名临时下载 URL
- 实现文件类型和大小验证
- 涉及接口：#20 #21 #22

**前端任务：**
- 实现 `components/common/FileUpload.vue`（通用文件上传组件）
- 在 InquiryFormDialog 中集成文件上传
- 在 InquiryDetail / OrderDetail 中展示附件列表 + 下载/删除按钮
- 发货操作时提示上传单据

**验收标准：**
- [ ] 可以上传支持格式的文件（图片、PDF、Excel、Word、3D）
- [ ] 不支持的格式和超大文件被拦截并显示错误
- [ ] 可以下载附件（OSS 签名 URL）
- [ ] 上传者和管理员可以删除附件
- [ ] 附件正确关联到询单/订单

**注意：** 本地开发时如未配置 OSS，可暂时使用本地文件系统，部署时切换到 OSS。

---

### 阶段 6：聊天 + 通知

**目标：** 询单/订单内可以聊天，业务事件触发通知，轮询机制工作正常。

**数据库：** 执行迁移 006（chat_messages）、007（chat_read_status）、008（notifications）

**后端任务：**
- 实现 ChatRepository → ChatService → ChatController → chat routes
- 实现 NotificationRepository → NotificationService → NotificationController → notification routes
- 在各 Service 中注入 NotificationService，业务操作后创建通知
- 涉及接口：#23 #24 #25 #26 #27 #28

**前端任务：**
- 实现 `components/common/ChatPanel.vue`（通用聊天面板）
- 实现 `composables/usePolling.ts`（轮询 composable）
- 在 InquiryDetail / OrderDetail 中集成 ChatPanel
- 实现 `components/layout/NotificationDropdown.vue`（Header 中的通知下拉）
- AppHeader 中集成通知未读数轮询（5 秒）
- ChatPanel 打开时启动消息轮询（2 秒）
- 在列表页显示未读聊天数

**验收标准：**
- [ ] 可以在询单/订单详情页发送和查看聊天消息
- [ ] 聊天消息 2 秒内可被对方看到
- [ ] 打开聊天后自动标记已读
- [ ] 列表页显示未读聊天消息数
- [ ] 业务操作后对方收到通知（报价、订单状态等）
- [ ] 通知栏显示未读数量
- [ ] 可以标记单条/全部通知已读
- [ ] 点击通知跳转到对应详情页

---

### 阶段 7：审计日志 + 回收站 + Excel 导出

**目标：** 管理员可以查看操作日志、管理回收站、所有列表支持 Excel 导出。

**数据库：** 执行迁移 009（audit_logs）

**后端任务：**
- 实现 AuditLogRepository → 完善 AuditLogService（写入数据库）
- 在各 Service 中补充审计日志记录调用
- 实现 TrashService → TrashController → trash routes
- 实现 ExportService（使用 exceljs 库）
- 在 inquiry/order/audit-log 的列表接口中支持 `format=excel`
- 涉及接口：#29 #30 #31 #32（导出复用列表接口 #4 #9 #16 #29）

**前端任务：**
- 实现 `views/AuditLog.vue`（审计日志列表 + 筛选）
- 实现 `views/Trash.vue`（回收站 + 恢复/永久删除）
- 实现 `composables/useExport.ts`（导出 composable）
- 在各列表页添加"导出 Excel"按钮
- 更新路由和导航菜单

**验收标准：**
- [ ] 所有关键操作自动记录审计日志
- [ ] 管理员可以按人、时间、类型筛选日志
- [ ] 管理员删除的数据出现在回收站
- [ ] 可以恢复和永久删除回收站数据
- [ ] 询单、订单、日志列表可导出 Excel

---

### 阶段 8：多语言 + UI 完善

**目标：** 中日文界面切换，UI 细节打磨。

**后端任务：**
- 无新增后端工作（语言偏好存储已在 users 表中）

**前端任务：**
- 编写 `locales/zh.ts` 和 `locales/ja.ts`（完整翻译所有界面文本）
- 实现 `components/layout/LanguageSwitcher.vue`
- 更新 `composables/useLanguage.ts`（切换时保存到后端）
- 替换所有硬编码中文文本为 `$t('key')` 调用
- UI 细节打磨：响应式布局、加载状态、空状态、确认弹窗等
- 完善 Dashboard（角色差异化展示）

**验收标准：**
- [ ] 点击语言切换按钮，全部界面文本立即切换
- [ ] 语言偏好保存，下次登录自动使用
- [ ] 无硬编码文本遗漏
- [ ] 各页面在正常和边界情况下显示正常

---

### 阶段 9：部署上线

**目标：** 系统部署到阿里云，可通过域名访问。

**任务：**
- 购买/配置阿里云 ECS
- 安装 Node.js 18、Nginx、PM2
- 购买/配置阿里云 RDS PostgreSQL
- 创建数据库，配置连接
- 购买/配置阿里云 OSS
- 创建 Bucket，配置 CORS
- 绑定域名 + 配置 SSL 证书
- 编写 Nginx 配置文件（静态文件 + API 代理 + HTTPS + 安全 Headers + 限流）
- 前端构建 `npm run build`，上传 dist 到 ECS
- 后端构建 `npm run build`，上传 dist 到 ECS
- 配置后端 `.env`（生产环境数据库、OSS 配置）
- PM2 启动后端，验证进程守护
- 端到端测试：注册→询单→报价→订单→完成
- 修改默认管理员密码

**验收标准：**
- [ ] 通过域名 HTTPS 访问系统
- [ ] 完整业务流程可走通
- [ ] 文件上传下载正常
- [ ] 聊天和通知正常工作
- [ ] PM2 进程守护正常（kill 后自动重启）
- [ ] RDS 自动备份已开启

---

## 四、阶段依赖关系

```
阶段 0 ─── 阶段 1 ─── 阶段 2 ─── 阶段 3 ─── 阶段 4
                                                  │
                                     阶段 5 ──────┤
                                                  │
                                     阶段 6 ──────┤
                                                  │
                                     阶段 7 ──────┘
                                        │
                                     阶段 8 ─── 阶段 9
```

- 阶段 0→1→2→3→4 必须严格顺序（核心业务流程有依赖）
- 阶段 5/6/7 可以在阶段 4 完成后并行开发
- 阶段 8 在所有功能完成后进行
- 阶段 9 在阶段 8 完成后进行

---

## 五、文档体系总结

到目前为止，完整的设计文档清单：

| 序号 | 文档 | 内容 | 状态 |
|------|------|------|------|
| 1 | `docs/requirements-v2.md` | 需求规格说明书 | ✅ 已确认 |
| 2 | `docs/architecture-v2.md` | 技术选型与系统架构 | ✅ 已确认 |
| 3 | `docs/api-design-v2.md` | API 接口详细设计（33 个接口） | ✅ 已确认 |
| 4 | `docs/database-design-v2.md` | 数据库详细设计（11 个迁移） | 待确认 |
| 5 | `docs/implementation-plan-v2.md` | 实施计划（10 个阶段） | 待确认 |

---

> **下一步：** 确认数据库设计和实施计划后，从**阶段 0**开始写代码。
