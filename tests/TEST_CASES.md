# 自动化测试用例文档

**项目**: OpenClaw-Admin  
**版本**: 0.2.7  
**测试框架**: Vitest + Playwright  
**更新日期**: 2026-04-11

---

## 1. 单元测试 (Unit Tests)

### 1.1 认证模块 (Auth Store)
**文件**: `tests/unit/auth.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| AU-001 | 初始状态验证 | authEnabled=true, loading=false, error=null, isAuthenticated=false | P0 |
| AU-002 | getToken 返回 null 当无 token | getToken() 返回 null | P0 |
| AU-003 | 登录成功 | 设置 token, isAuthenticated=true, 返回 true | P0 |
| AU-004 | 登录失败 | 设置 error, isAuthenticated=false, 返回 false | P0 |
| AU-005 | 登录过程中 loading 状态 | 请求期间 loading=true | P1 |
| AU-006 | 网络错误处理 | 设置 error 消息，返回 false | P0 |
| AU-007 | 登出功能 | 调用 API, 清除 token, isAuthenticated=false | P0 |
| AU-008 | 有效 token 认证 | checkAuth 返回 true | P0 |
| AU-009 | 无效 token 认证 | checkAuth 返回 false, 清除 token | P0 |
| AU-010 | localStorage 持久化 | 重启 store 后 token 保留 | P0 |

### 1.2 通知中心 (Notification Store)
**文件**: `tests/unit/notification.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| NT-001 | 创建普通通知 | 生成 ID, level='info', persistent=false | P0 |
| NT-002 | 创建 info 通知 | level='info' | P1 |
| NT-003 | 创建 warn 通知 | level='warn' | P1 |
| NT-004 | 创建 error 通知 | level='error', persistent=true | P0 |
| NT-005 | 创建 success 通知 | level='success' | P1 |
| NT-006 | 标记单条已读 | notification.read=true | P0 |
| NT-007 | 标记全部已读 | 所有 notification.read=true | P0 |
| NT-008 | 删除通知 | 从列表中移除 | P0 |
| NT-009 | 清空所有通知 | notifications=[] | P1 |
| NT-010 | 超过上限截断 | maxStored=100, 超出自动删除旧通知 | P0 |
| NT-011 | 未读数计算 | unreadCount 正确计数 | P0 |
| NT-012 | 未读列表限制 | unreadList 最多 20 条 | P1 |

### 1.3 RBAC 权限控制 (RBAC Store)
**文件**: `tests/unit/rbac.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| RB-001 | admin 角色权限 | 拥有所有权限 | P0 |
| RB-002 | operator 角色权限 | 仅有受限权限 | P0 |
| RB-003 | readonly 角色权限 | 仅可读权限 | P0 |
| RB-004 | 未登录用户权限 | 无权限 | P0 |
| RB-005 | canRead 方法 | 正确路由到 hasPermission | P0 |
| RB-006 | canWrite 方法 | 正确路由到 hasPermission | P0 |
| RB-007 | canDelete 方法 | 需要 admin 权限 | P0 |
| RB-008 | 管理员专属操作 | delete user 等需 admin | P0 |
| RB-009 | localStorage 持久化 | 用户信息持久化 | P1 |
| RB-010 | 通配符权限匹配 | `*:*` 匹配所有 | P1 |

### 1.4 Cron 编辑器 (Cron Editor)
**文件**: `tests/unit/cron-editor.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| CE-001 | 初始表单状态 | 所有字段为默认值 | P1 |
| CE-002 | 预设模板 | 包含 minutely/hourly/daily/weekly/monthly | P0 |
| CE-003 | 应用预设 | 点击预设设置 cron 表达式 | P0 |
| CE-004 | Cron 字段切换 | 分钟/小时/日期等正确切换 | P1 |
| CE-005 | Cron 表达式预览 | 显示人类可读描述 | P1 |
| CE-006 | 调度类型切换 | cron/every/at 类型切换 | P1 |
| CE-007 | Every 间隔配置 | 数值 + 单位正确组合 | P1 |
| CE-008 | At 时间配置 | 具体时间 + 日期配置 | P1 |

### 1.5 Cron 数据存储 (Cron Store)
**文件**: `tests/unit/cron-store.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| CS-001 | 初始状态 | jobs=[], loading=false, error=null | P0 |
| CS-002 | 获取任务列表 | 调用 API 获取 jobs | P0 |
| CS-003 | 获取任务状态 | 调用 API 获取 status | P1 |
| CS-004 | 创建任务 | 调用 API 创建 job | P0 |
| CS-005 | 更新任务 | 调用 API 更新 job | P0 |
| CS-006 | 删除任务 | 调用 API 删除 job | P0 |
| CS-007 | 手动运行任务 | force/run 模式 | P1 |
| CS-008 | 任务运行历史 | 获取 run 记录 | P1 |

---

## 2. 集成测试 (Integration Tests)

### 2.1 认证 API 集成测试
**文件**: `tests/integration/auth.api.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| IA-001 | POST /api/auth/login 成功 | 返回 token | P0 |
| IA-002 | POST /api/auth/login 失败 | 返回 401 | P0 |
| IA-003 | GET /api/auth/check 有效 token | 返回 200 | P0 |
| IA-004 | GET /api/auth/check 无效 token | 返回 401 | P0 |
| IA-005 | POST /api/auth/logout | 使 token 失效 | P0 |
| IA-006 | 输入验证 | 缺少用户名/密码返回 400 | P0 |

### 2.2 Cron 调度器集成测试
**文件**: `tests/integration/cron-scheduler.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| IS-001 | 创建 cron job | 任务成功创建 | P0 |
| IS-002 | 更新 cron job | 任务成功更新 | P0 |
| IS-003 | 删除 cron job | 任务成功删除 | P0 |
| IS-004 | 启用/禁用任务 | 状态正确切换 | P1 |
| IS-005 | 手动触发任务 | 任务立即执行 | P1 |
| IS-006 | 任务执行历史 | 记录执行日志 | P1 |

---

## 3. 安全测试 (Security Tests)

### 3.1 认证安全测试
**文件**: `tests/security/auth.security.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| SA-001 | 密码哈希长度 | 输出 128 字符 | P0 |
| SA-002 | 不同盐值不同哈希 | 相同密码不同盐产生不同哈希 | P0 |
| SA-003 | 恒时比较 | 使用 timingSafeEqual | P0 |
| SA-004 | 盐值长度 | 32 字节 (64 字符 hex) | P0 |
| SA-005 | Token 长度 | >90 字符 | P0 |
| SA-006 | Token 唯一性 | 100 个 token 全部唯一 | P0 |
| SA-007 | Token 哈希 | SHA-256 输出 64 字符 | P0 |
| SA-008 | 哈希不可逆 | 无法从哈希推导原始数据 | P0 |
| SA-009 | 会话过期检查 | 过期会话被拒绝 | P0 |

### 3.2 RBAC 安全测试
**文件**: `tests/security/rbac.security.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| RS-001 | 角色继承权限 | 高级角色拥有低级角色权限 | P0 |
| RS-002 | 未认证用户拒绝 | 无权限访问 | P0 |
| RS-003 | 跨角色权限边界 | operator 不能执行 admin 操作 | P0 |
| RS-004 | 垂直越权防护 | 不能提权 | P0 |
| RS-005 | 管理员操作双重检查 | 敏感操作双重验证 | P0 |

---

## 4. 性能测试 (Performance Tests)

### 4.1 认证性能测试
**文件**: `tests/performance/auth.perf.test.ts`

| 用例 ID | 测试场景 | 阈值 | 预期结果 | 优先级 |
|--------|---------|------|---------|--------|
| PA-001 | 密码哈希性能 | <2000ms | 10 万次迭代完成 | P0 |
| PA-002 | Token 生成性能 | >30 tokens/ms | 快速生成唯一 token | P1 |
| PA-003 | Token 哈希性能 | >100 hashes/ms | SHA-256 快速 | P1 |

---

## 5. 端到端测试 (E2E Tests)

### 5.1 Cron 编辑器用户流程
**文件**: `tests/e2e/cron-editor.e2e.test.ts`

| 用例 ID | 测试场景 | 预期结果 | 优先级 |
|--------|---------|---------|--------|
| EE-001 | 创建简单任务 (预设) | 使用预设创建任务成功 | P0 |
| EE-002 | 创建自定义 cron 任务 | 手动输入表达式成功 | P0 |
| EE-003 | 使用 Every 调度器 | 间隔配置成功 | P1 |
| EE-004 | 使用 At 调度器 | 具体时间配置成功 | P1 |
| EE-005 | 编辑现有任务 | 修改计划成功 | P0 |
| EE-006 | 切换任务启用状态 | 启用/禁用成功 | P0 |
| EE-007 | 删除任务 | 确认后删除成功 | P0 |
| EE-008 | 任务列表显示 | 正确显示所有任务 | P0 |
| EE-009 | 过滤启用任务 | 只显示启用任务 | P1 |
| EE-010 | 按下次运行时间排序 | 正确排序 | P1 |
| EE-011 | 手动运行任务 | 立即执行并记录 | P1 |
| EE-012 | 显示运行历史 | 显示 runCount 和 lastRun | P1 |
| EE-013 | 无效表达式错误 | 显示验证错误 | P0 |
| EE-014 | 有效表达式预览 | 显示人类可读描述 | P0 |
| EE-015 | 可视化构建表达式 | 通过 UI 选择构建 | P1 |
| EE-016 | API 错误处理 | 显示错误消息 | P0 |
| EE-017 | 网络错误处理 | 显示网络错误 | P0 |
| EE-018 | 加载状态显示 | API 调用期间显示加载 | P1 |

---

## 测试覆盖率目标

| 模块 | 当前覆盖率 | 目标覆盖率 |
|------|-----------|-----------|
| src/stores/auth.ts | 84% | 90% |
| src/stores/notification.ts | 97.6% | 95% |
| src/stores/rbac.ts | 93.3% | 95% |
| server/auth.ts | 84% | 90% |
| server/notification.ts | 97.6% | 95% |
| server/rbac.ts | 93.3% | 95% |

---

## 测试执行命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- tests/unit/auth.test.ts

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行特定类别测试
npm test -- tests/security/
npm test -- tests/performance/
npm test -- tests/e2e/
```
