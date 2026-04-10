# OpenClaw-Admin 系统架构设计更新文档

> **文档版本**: v2.0  
> **作者**: 系统架构师 (WinClaw AI 助手)  
> **日期**: 2026-04-11  
> **基于**: 原有架构设计 v1.0 + 实际开发成果

---

## 一、架构设计概述

### 1.1 设计目标

本次架构设计更新旨在：
1. **反映实际开发进度**：基于已完成的 25+ 个 API 接口进行架构确认
2. **技术栈最终确认**：明确前后端技术选型
3. **模块划分优化**：根据实际代码结构优化模块划分
4. **安全架构强化**：基于安全审计结果完善安全设计
5. **部署架构明确**：确定生产环境部署方案

### 1.2 当前项目状态

| 模块 | 完成度 | 说明 |
|-----|--------|-----|
| 后端 API | 95% | 25+ 接口已实现，待集成测试 |
| 前端页面 | 80% | 核心页面已完成，待对接 API |
| 数据库 | 100% | 所有表结构已创建 |
| 认证授权 | 90% | RBAC 体系已实现，待完善 |
| 安全审计 | 100% | 已完成安全加固 |
| 文档 | 90% | API 文档完整，待补充用户手册 |

---

## 二、技术栈选型（最终确认）

### 2.1 前端技术栈

| 技术 | 版本 | 用途 | 状态 |
|-----|------|------|------|
| Vue 3 | ^3.5 | 前端框架 | ✅ 已使用 |
| TypeScript | ^5.3 | 类型系统 | ✅ 已使用 |
| Vite | ^7.3 | 构建工具 | ✅ 已使用 |
| Naive UI | ^2.43 | UI 组件库 | ✅ 已使用 |
| Pinia | ^3.0 | 状态管理 | ✅ 已使用 |
| Vue Router | ^4.2 | 路由管理 | ✅ 已使用 |
| Axios | ^1.6 | HTTP 客户端 | ✅ 已使用 |

**前端架构特点**：
- Composition API + `<script setup>` 语法
- 模块化 Store 设计（authStore, rbacStore, notificationStore 等）
- 路由守卫实现权限控制
- 组件库统一（Naive UI）

### 2.2 后端技术栈

| 技术 | 版本 | 用途 | 状态 |
|-----|------|------|------|
| Node.js | v25.8.0 | 运行时 | ✅ 已使用 |
| Express | ^5.2 | Web 框架 | ✅ 已使用 |
| better-sqlite3 | ^12.6 | 数据库驱动 | ✅ 已使用 |
| bcrypt | ^11.0 | 密码哈希 | ✅ 已使用 |
| JWT | ^9.0 | Token 认证 | ✅ 已使用 |
| ws | ^8.14 | WebSocket | ✅ 已使用 |
| ejs | ^3.1 | 模板引擎 | ✅ 已使用 |

**后端架构特点**：
- RESTful API 设计规范
- 中间件链式处理（认证→权限→审计）
- 模块化路由设计（routes/目录）
- 服务层业务逻辑封装（services/目录）

### 2.3 数据库设计

**数据库类型**: SQLite (better-sqlite3)

**核心数据表**：

| 表名 | 用途 | 状态 |
|-----|------|------|
| users | 用户信息 | ✅ 已创建 |
| roles | 角色定义 | ✅ 已创建 |
| permissions | 权限定义 | ✅ 已创建 |
| user_roles | 用户 - 角色关联 | ✅ 已创建 |
| user_permissions | 用户 - 权限关联 | ✅ 已创建 |
| themes | 主题配置 | ✅ 已创建 |
| user_theme_preferences | 用户主题偏好 | ✅ 已创建 |
| audit_logs | 审计日志 | ✅ 已创建 |
| notifications | 通知记录 | ✅ 已创建 |
| alert_channels | 告警渠道 | ✅ 已创建 |
| alert_rules | 告警规则 | ✅ 已创建 |
| office_scenes | Office 场景 | ✅ 已创建 |
| office_agents | Office Agent | ✅ 已创建 |
| office_tasks | Office 任务 | ✅ 已创建 |
| office_messages | Office 消息 | ✅ 已创建 |
| myworld_companies | 虚拟公司 | ✅ 已创建 |
| myworld_members | 公司成员 | ✅ 已创建 |
| myworld_areas | 公司区域 | ✅ 已创建 |

---

## 三、模块划分

### 3.1 前端模块结构

```
src/
├── views/                    # 页面组件
│   ├── Dashboard/           # 仪表盘
│   ├── Sessions/            # 会话管理
│   ├── Agents/              # Agent 管理
│   ├── Channels/            # 渠道管理
│   ├── Office/              # Office 智能体工坊
│   ├── MyWorld/             # MyWorld 虚拟公司
│   ├── Users/               # 用户管理
│   ├── RBAC/                # 权限管理
│   ├── Audit/               # 审计日志
│   ├── Alerts/              # 告警配置
│   └── Settings/            # 系统设置
│
├── components/              # 通用组件
│   ├── common/              # 通用组件
│   │   ├── DataTable.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── RoleTag.vue
│   │   └── NotificationBell.vue
│   └── layout/              # 布局组件
│       ├── Header.vue
│       ├── Sidebar.vue
│       └── Footer.vue
│
├── stores/                  # 状态管理
│   ├── auth.ts              # 认证状态
│   ├── rbac.ts              # 权限状态
│   ├── notification.ts      # 通知状态
│   ├── office.ts            # Office 状态
│   ├── myworld.ts           # MyWorld 状态
│   └── user.ts              # 用户状态
│
├── router/                  # 路由配置
│   ├── index.ts             # 主路由
│   └── guards.ts            # 路由守卫
│
├── api/                     # API 客户端
│   ├── auth.ts              # 认证 API
│   ├── users.ts             # 用户 API
│   ├── rbac.ts              # RBAC API
│   └── ...                  # 其他 API
│
└── utils/                   # 工具函数
    ├── request.ts           # HTTP 请求封装
    ├── permission.ts        # 权限工具
    └── format.ts            # 格式化工具
```

### 3.2 后端模块结构

```
server/
├── index.js                 # 主入口文件
├── auth.js                  # 认证模块
├── database.js              # 数据库操作
├── gateway.js               # OpenClaw Gateway 集成
├── notifications.js         # 通知服务
├── office.js                # Office 业务逻辑
├── myworld.js               # MyWorld 业务逻辑
│
├── routes/                  # 路由层
│   ├── auth.routes.js       # 认证路由
│   ├── user.routes.js       # 用户路由
│   ├── rbac.routes.js       # RBAC 路由
│   ├── notification.routes.js
│   ├── alert.routes.js
│   ├── audit.routes.js
│   ├── office.routes.js
│   ├── myworld.routes.js
│   ├── batch.routes.js      # 批量操作路由
│   ├── search.routes.js     # 搜索路由
│   ├── stats.routes.js      # 统计路由
│   └── themes.routes.js     # 主题路由
│
├── middleware/              # 中间件
│   ├── requireAuth.js       # 认证中间件
│   ├── requirePermission.js # 权限中间件
│   └── auditLog.js          # 审计中间件
│
├── services/                # 服务层
│   ├── AuthService.js       # 认证服务
│   ├── UserService.js       # 用户服务
│   ├── RBACService.js       # RBAC 服务
│   ├── AlertService.js      # 告警服务
│   ├── OfficeService.js     # Office 服务
│   └── MyWorldService.js    # MyWorld 服务
│
├── models/                  # 数据模型
│   └── ...                  # 数据库模型定义
│
└── utils/                   # 工具函数
    ├── crypto.js            # 加密工具
    ├── validator.js         # 数据验证
    └── logger.js            # 日志工具
```

---

## 四、API 设计

### 4.1 API 设计规范

- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **认证方式**: JWT Token / Session Cookie
- **版本控制**: URL 路径版本化 (`/api/v1/...`)
- **响应格式**: 统一响应结构

```json
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": { ... }
}

// 错误响应
{
  "code": 400,
  "message": "错误描述",
  "errors": [...]
}
```

### 4.2 API 接口清单

#### 认证模块 (`/api/auth/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| POST | `/api/auth/login` | 用户登录 | 公开 |
| POST | `/api/auth/logout` | 用户登出 | 登录 |
| GET | `/api/auth/me` | 当前用户信息 | 登录 |
| POST | `/api/auth/change-password` | 修改密码 | 登录 |

#### 用户管理 (`/api/users/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/users` | 用户列表 | admin |
| POST | `/api/users` | 创建用户 | admin |
| GET | `/api/users/:id` | 用户详情 | admin |
| PATCH | `/api/users/:id` | 更新用户 | admin |
| DELETE | `/api/users/:id` | 删除用户 | admin |

#### RBAC 权限 (`/api/rbac/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/rbac/permissions` | 权限列表 | 登录 |
| POST | `/api/rbac/permissions` | 创建权限 | admin |
| GET | `/api/rbac/roles` | 角色列表 | admin |
| POST | `/api/rbac/roles` | 创建角色 | admin |
| PUT | `/api/rbac/roles/:id/permissions` | 分配权限 | admin |
| POST | `/api/rbac/check` | 权限检查 | 登录 |

#### 批量操作 (`/api/batch/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| DELETE | `/api/batch/:resource` | 批量删除 | 相应权限 |
| PATCH | `/api/batch/:resource/status` | 批量更新状态 | 相应权限 |
| POST | `/api/batch/:resource/export` | 批量导出 | 相应权限 |

#### 搜索筛选 (`/api/search/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/search/global` | 全局搜索 | 登录 |
| POST | `/api/:resource/filter` | 高级筛选 | 登录 |
| GET | `/api/search/suggest` | 搜索建议 | 登录 |

#### 数据统计 (`/api/stats/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/stats/overview` | 系统统计 | admin |
| GET | `/api/stats/users` | 用户统计 | admin |
| GET | `/api/stats/tasks` | 任务统计 | 登录 |
| GET | `/api/stats/audit` | 审计统计 | admin |

#### 主题配置 (`/api/themes/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/themes` | 主题列表 | 登录 |
| POST | `/api/themes/custom` | 创建主题 | 登录 |
| PUT | `/api/themes/:id` | 更新主题 | 登录 |
| DELETE | `/api/themes/:id` | 删除主题 | admin |

#### Office 智能体 (`/api/office/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/office/scenes` | 场景列表 | 登录 |
| POST | `/api/office/scenes` | 创建场景 | operator+ |
| POST | `/api/office/scenes/:id/execute` | 执行场景 | operator+ |

#### MyWorld 虚拟公司 (`/api/myworld/*`)

| Method | Path | 说明 | 权限 |
|-------|------|------|------|
| GET | `/api/myworld/companies` | 公司列表 | 登录 |
| POST | `/api/myworld/companies` | 创建公司 | admin |
| POST | `/api/myworld/companies/:id/join` | 加入公司 | 登录 |

---

## 五、数据库设计

### 5.1 核心表结构

#### 用户表 (users)

```sql
CREATE TABLE users (
    id            TEXT    PRIMARY KEY,
    username      TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    display_name  TEXT,
    email         TEXT,
    avatar        TEXT,
    status        TEXT    DEFAULT 'active',
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_login_at INTEGER
);
```

#### 角色表 (roles)

```sql
CREATE TABLE roles (
    id          TEXT    PRIMARY KEY,
    name        TEXT    UNIQUE NOT NULL,
    description TEXT,
    created_at  INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

#### 权限表 (permissions)

```sql
CREATE TABLE permissions (
    id          TEXT    PRIMARY KEY,
    name        TEXT    UNIQUE NOT NULL,
    resource    TEXT    NOT NULL,
    action      TEXT    NOT NULL,
    description TEXT,
    created_at  INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

#### 审计日志表 (audit_logs)

```sql
CREATE TABLE audit_logs (
    id             TEXT    PRIMARY KEY,
    user_id        TEXT,
    username       TEXT,
    action         TEXT    NOT NULL,
    resource       TEXT,
    resource_id    TEXT,
    details        TEXT    DEFAULT '{}',
    ip_address     TEXT,
    user_agent     TEXT,
    status         TEXT    DEFAULT 'success',
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

### 5.2 索引设计

```sql
-- 用户查询优化
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);

-- 审计日志查询优化
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- 通知查询优化
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## 六、安全架构

### 6.1 认证安全

- **密码存储**: bcrypt (cost=12)
- **Token 机制**: JWT + HttpOnly Cookie
- **登录限制**: 5 次失败后锁定 15 分钟
- **Token 过期**: 24 小时可刷新

### 6.2 授权安全

- **RBAC 模型**: 用户 → 角色 → 权限
- **权限检查**: 中间件统一拦截
- **细粒度**: resource + action 组合
- **默认拒绝**: 未明确允许的权限一律拒绝

### 6.3 数据安全

- **SQL 注入防护**: 参数化查询
- **XSS 防护**: 输入过滤 + 输出转义
- **CSRF 防护**: Token 验证
- **敏感数据加密**: AES-256-GCM

### 6.4 审计安全

- **全操作审计**: 所有写操作记录日志
- **日志不可篡改**: 只写模式存储
- **日志保留**: 90 天自动清理
- **异常告警**: 敏感操作实时通知

### 6.5 网络安全

- **HTTPS 强制**: 生产环境强制 HTTPS
- **CORS 限制**: 仅允许配置域名
- **速率限制**: 单 IP 请求频率限制
- **请求验证**: 输入数据严格校验

---

## 七、部署架构

### 7.1 部署方案

```
┌─────────────────────────────────────────────────────┐
│                   Nginx (反向代理)                   │
│              SSL 终止 / 负载均衡 / 静态资源            │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────┐
│              PM2 (进程管理器)                        │
│        ┌─────────────┐  ┌─────────────┐             │
│        │ Node.js #1 │  │ Node.js #2 │  (集群模式)   │
│        └──────┬──────┘  └──────┬──────┘             │
│               │                │                    │
│        ┌──────┴────────────────┴──────┐            │
│        │      Express 应用             │            │
│        └──────┬────────────────┬──────┘            │
│               │                │                    │
│        ┌──────┴────────────────┴──────┐            │
│        │    better-sqlite3 (SQLite)   │            │
│        │         wizard.db            │            │
│        └──────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

### 7.2 环境配置

**生产环境变量** (`.env`):

```env
NODE_ENV=production
PORT=3000
DB_PATH=./data/wizard.db
JWT_SECRET=<强随机密钥>
JWT_EXPIRES_IN=24h
SESSION_SECRET=<强随机密钥>
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

### 7.3 部署脚本

```bash
# 安装依赖
npm ci --production

# 数据库迁移
node scripts/migrate.js

# 启动服务
pm2 start ecosystem.config.js

# 日志管理
pm2 logs --lines 100

# 健康检查
curl http://localhost:3000/api/health
```

### 7.4 监控方案

- **应用监控**: PM2 + 自定义指标
- **日志收集**: 文件日志 + 审计日志表
- **性能监控**: 请求耗时 + 数据库查询耗时
- **告警通知**: 飞书/钉钉 Webhook

---

## 八、开发规范

### 8.1 代码规范

- **前端**: ESLint + Prettier + Vue Style Guide
- **后端**: ESLint + Express Best Practices
- **类型**: TypeScript 严格模式
- **提交**: Commitlint + Conventional Commits

### 8.2 分支策略

```
main           # 生产分支
├── develop    # 开发分支
├── feature/*  # 功能分支
├── bugfix/*   # 修复分支
└── hotfix/*   # 紧急修复
```

### 8.3 测试规范

- **单元测试**: Vitest (前端) + Jest (后端)
- **集成测试**: API 接口测试
- **E2E 测试**: Playwright
- **覆盖率**: 核心模块 > 80%

---

## 九、性能优化

### 9.1 前端优化

- **代码分割**: 路由级懒加载
- **资源压缩**: Gzip + Brotli
- **CDN 加速**: 静态资源 CDN
- **缓存策略**: 强缓存 + 协商缓存

### 9.2 后端优化

- **数据库索引**: 关键查询字段索引
- **查询优化**: 避免 N+1 查询
- **缓存策略**: Redis 缓存热点数据
- **连接池**: 数据库连接复用

### 9.3 性能指标

| 指标 | 目标值 | 说明 |
|-----|--------|------|
| 首屏加载 | < 2s | 3G 网络下 |
| API 响应 | < 200ms | 95% 请求 |
| 并发支持 | > 1000 | QPS |
| 可用性 | > 99.9% | 月度 |

---

## 十、后续规划

### 10.1 短期目标 (P0)

- [x] 完成所有 P0 功能开发
- [x] 安全审计与加固
- [ ] 集成测试覆盖
- [ ] 性能基准测试

### 10.2 中期目标 (P1)

- [ ] 自定义时间范围统计
- [ ] Cron 可视化编辑器
- [ ] 批量操作优化
- [ ] 模型配置测试

### 10.3 长期目标 (P2)

- [ ] 多租户支持
- [ ] 插件系统
- [ ] 国际化 (i18n)
- [ ] 移动端适配

---

## 十一、架构决策记录 (ADR)

### ADR-001: 数据库选型 SQLite

**背景**: 项目需要轻量级、零配置的数据库方案

**决策**: 使用 better-sqlite3 (SQLite)

**理由**:
- 零配置，无需独立数据库服务
- 单文件存储，便于备份迁移
- 性能足够支持中小规模场景
- 与 Node.js 天然集成

**影响**: 
- 不支持高并发写入场景
- 需要定期备份数据文件

### ADR-002: 认证方案 JWT + Session

**背景**: 需要同时支持 Web 端和 API 调用

**决策**: 双轨认证机制

**理由**:
- Web 端使用 Session Cookie，安全性高
- API 调用使用 JWT Token，便于程序化调用
- 两者可互换，灵活性高

**影响**:
- 需要维护两套认证逻辑
- Token 需要定期刷新

---

**文档版本**: v2.0  
**状态**: 已评审  
**最后更新**: 2026-04-11 05:07
