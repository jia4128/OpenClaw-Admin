# OpenClaw-Admin 发布计划

**发布版本**: v0.3.0  
**计划发布日期**: 2026-04-12  
**发布经理**: 发布经理  
**文档创建时间**: 2026-04-11 06:10

---

## 1. 版本信息

### 当前版本
- **上一版本**: v0.2.6
- **当前版本**: v0.3.0
- **版本类型**: 次要版本 (Minor) - 新增功能

### 版本号规则
采用 [语义化版本规范](https://semver.org/lang/zh-CN/) (SemVer 2.0.0):

```
主版本号.次版本号.修订号
MAJOR.MINOR.PATCH
```

| 版本号类型 | 触发条件 | 示例 |
|-----------|---------|------|
| **MAJOR** | 不兼容的 API 修改 | 0.2.6 → 1.0.0 |
| **MINOR** | 向下兼容的功能新增 | 0.2.6 → 0.3.0 |
| **PATCH** | 向下兼容的问题修正 | 0.2.6 → 0.2.7 |

**预发布版本后缀**:
- 开发版: `0.3.0-dev`
- 测试版: `0.3.0-beta.1`
- 候选版: `0.3.0-rc.1`
- 正式版: `0.3.0`

---

## 2. 本次发布内容

### 2.1 新增功能 (Added)

#### P0 - 核心功能
1. **多用户支持**
   - 用户注册/登录/Session 管理
   - 密码加密存储 (PBKDF2 + SHA-512)
   - Token 认证机制 (Bearer Token)

2. **RBAC 权限控制**
   - 三种角色: admin / operator / readonly
   - 细粒度权限控制
   - 权限检查中间件

3. **通知中心**
   - 实时消息通知
   - 通知分级 (info/warn/error/success)
   - 未读计数提醒
   - 通知持久化

#### P1 - 重要功能
4. **备份管理**
   - 自动备份调度
   - 备份文件管理
   - 一键恢复功能

5. **Agent 管理**
   - Agent 生命周期管理
   - Agent 状态监控
   - Agent 配置管理

6. **配置管理**
   - 动态配置更新
   - 配置版本控制
   - 配置导入/导出

#### P2 - 优化功能
7. **安全加固**
   - CORS 配置白名单
   - 安全 HTTP 头添加
   - 输入验证增强
   - SQL 注入防护
   - XSS/CSRF防护

8. **文档完善**
   - API 文档更新
   - 用户指南补充
   - 安全说明文档

### 2.2 修复问题 (Fixed)

| 问题 ID | 描述 | 优先级 |
|--------|------|--------|
| TS-001 | TypeScript 构建报错 | P0 |
| TS-002 | DOMPurify SSR 兼容性问题 | P0 |
| TS-003 | Dashboard 图表类型错误 | P1 |
| SEC-001 | tar 包路径遍历漏洞 | 高危 |
| SEC-002 | sqlite3 SQL 注入风险 | 高危 |
| SEC-003 | Token 通过 Query 传递 | 中危 |

### 2.3 已知问题 (Known Issues)

| 问题 | 影响 | 计划修复版本 |
|------|------|-------------|
| 密码哈希未使用 argon2 | 安全性稍低 | v0.4.0 |
| 单用户模式 RBAC 兼容性 | 功能受限 | v0.4.0 |
| 部分大文件加载慢 | 性能优化 | v0.4.0 |

---

## 3. 发布流程

### 3.1 发布前检查清单

#### ✅ 开发阶段 (已完成)
- [x] 所有 P0/P1 功能开发完成
- [x] 代码审查通过
- [x] 单元测试覆盖率 > 80%
- [x] 集成测试全部通过
- [x] 安全测试通过 (0 高危漏洞)
- [x] 性能测试达标

#### ⏳ 发布准备阶段 (进行中)
- [ ] 创建发布分支 `release/v0.3.0`
- [ ] 更新版本号 (package.json)
- [ ] 更新 CHANGELOG.md
- [ ] 生成发布说明
- [ ] 准备发布包

#### ⏳ 测试阶段
- [ ] 在测试环境部署
- [ ] 回归测试 (全量测试)
- [ ] 用户验收测试 (UAT)
- [ ] 性能基准测试

#### ⏳ 发布阶段
- [ ] 创建 Git Tag `v0.3.0`
- [ ] 合并到 main 分支
- [ ] 部署到生产环境
- [ ]  Smoke 测试
- [ ] 发布通知

#### ⏳ 发布后
- [ ] 监控错误日志 (24 小时)
- [ ] 收集用户反馈
- [ ] 更新文档
- [ ] 关闭相关 Issue

### 3.2 详细发布步骤

#### 步骤 1: 创建发布分支
```bash
git checkout main
git pull
git checkout -b release/v0.3.0
```

#### 步骤 2: 更新版本号
编辑 `package.json`:
```json
{
  "version": "0.3.0"
}
```

#### 步骤 3: 更新 CHANGELOG
参考 `CHANGELOG.md` 格式，添加新版本记录。

#### 步骤 4: 提交并打标签
```bash
git add .
git commit -m "chore: prepare release v0.3.0"
git push origin release/v0.3.0

# 创建标签
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin v0.3.0
```

#### 步骤 5: 合并到 main
```bash
git checkout main
git merge --no-ff release/v0.3.0
git push origin main
```

#### 步骤 6: 部署到生产
```bash
# 拉取最新代码
cd /www/wwwroot/ai-work
git pull origin main

# 安装依赖
npm ci

# 构建前端
npm run build

# 重启服务
pm2 restart openclaw-admin
```

#### 步骤 7: 发布验证
```bash
# 健康检查
curl http://localhost:3000/api/health

# 认证测试
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## 4. 发布说明 (Release Notes)

### 🎉 OpenClaw-Admin v0.3.0 发布

**发布日期**: 2026-04-12  
**版本类型**: 次要版本 (Minor Release)

---

#### ✨ 新功能

**多用户与权限管理**
- 支持多用户登录和会话管理
- 实现 RBAC 权限控制 (admin/operator/readonly)
- 细粒度权限检查，保障数据安全

**通知中心**
- 实时消息推送
- 通知分级显示
- 未读消息提醒

**备份管理**
- 自动化备份调度
- 备份文件管理界面
- 一键数据恢复

**Agent 管理**
- Agent 生命周期管理
- 实时状态监控
- 配置热更新

#### 🔒 安全加固

- 修复 tar 包路径遍历漏洞
- 修复 sqlite3 SQL 注入风险
- CORS 配置白名单化
- 添加安全 HTTP 响应头
- 输入验证增强

#### 🐛 问题修复

- 修复 TypeScript 构建错误
- 修复 Dashboard 图表渲染问题
- 优化大文件加载性能
- 修复 Session 持久化问题

#### 📚 文档更新

- 完善 API 文档
- 新增安全说明章节
- 更新用户指南

---

#### ⚠️ 升级注意事项

1. **数据库迁移**: 本次更新需要运行数据库迁移脚本
   ```bash
   npm run migrate
   ```

2. **配置变更**: 检查 `.env` 文件，确保配置项完整

3. **缓存清理**: 建议清除浏览器缓存

#### 🙏 致谢

感谢以下贡献者的贡献:
- WinClaw AI 助手 (安全审计)
- 开发团队成员

---

## 5. 回滚计划

### 5.1 回滚触发条件

出现以下情况时立即执行回滚:

| 优先级 | 场景 | 响应时间 |
|--------|------|---------|
| **P0** | 服务完全不可用 | 立即 |
| **P0** | 数据丢失/损坏 | 立即 |
| **P1** | 核心功能失效 | 15 分钟内 |
| **P1** | 安全漏洞被利用 | 30 分钟内 |
| **P2** | 非核心功能异常 | 1 小时内 |

### 5.2 回滚步骤

#### 步骤 1: 停止服务
```bash
pm2 stop openclaw-admin
```

#### 步骤 2: 回滚代码
```bash
cd /www/wwwroot/ai-work

# 回滚到上一版本标签
git checkout v0.2.6

# 或回滚到指定 commit
git checkout <commit-hash>
```

#### 步骤 3: 回滚数据库 (如需要)
```bash
# 恢复数据库备份
cp /backup/data/openclaw.db.backup /www/wwwroot/ai-work/data/openclaw.db

# 或执行回滚迁移
npm run migrate:rollback
```

#### 步骤 4: 清理并重启
```bash
# 清理构建缓存
rm -rf dist node_modules/.vite

# 重新安装依赖
npm ci

# 重新构建
npm run build

# 重启服务
pm2 restart openclaw-admin
```

#### 步骤 5: 验证回滚
```bash
# 检查服务状态
pm2 status openclaw-admin

# 健康检查
curl http://localhost:3000/api/health

# 验证核心功能
curl http://localhost:3000/api/auth/check
```

### 5.3 回滚后操作

1. **问题排查**: 收集错误日志，分析问题原因
   ```bash
   pm2 logs openclaw-admin --lines 200
   ```

2. **通知相关方**: 告知团队回滚情况

3. **更新状态**: 在飞书多维表格更新发布状态为"已回滚"

4. **制定修复方案**: 根据问题原因制定修复计划

### 5.4 备份策略

| 备份类型 | 频率 | 保留时间 | 存储位置 |
|---------|------|---------|---------|
| 代码备份 | 每次发布前 | 永久 | Git Tag |
| 数据库备份 | 每日 | 7 天 | /backup/data/ |
| 配置文件备份 | 每次修改 | 永久 | /backup/config/ |
| 完整快照 | 每周 | 30 天 | /backup/snapshot/ |

---

## 6. 监控与告警

### 6.1 关键指标监控

| 指标 | 阈值 | 告警级别 |
|------|------|---------|
| 服务可用性 | < 99% | 警告 |
| 响应时间 | > 1s | 警告 |
| 错误率 | > 1% | 严重 |
| CPU 使用率 | > 80% | 警告 |
| 内存使用率 | > 85% | 警告 |
| 磁盘使用率 | > 90% | 严重 |

### 6.2 健康检查端点

```bash
# 健康检查
GET /api/health

# 就绪检查
GET /api/ready

# 存活检查
GET /api/live
```

### 6.3 日志收集

```bash
# 实时日志
pm2 logs openclaw-admin

# 错误日志
pm2 logs openclaw-admin --err

# 导出日志
pm2 logs openclaw-admin --output /tmp/release-v0.3.0.log
```

---

## 7. 发布团队联系

| 角色 | 人员 | 联系方式 |
|------|------|---------|
| 发布经理 | 发布经理 | - |
| 开发负责人 | 系统架构师 | - |
| 测试负责人 | QA 工程师 | - |
| 运维支持 | 运维工程师 | - |
| 安全支持 | 安全工程师 | - |

---

## 8. 附录

### 8.1 相关文件

- [CHANGELOG.md](./CHANGELOG.md) - 更新日志
- [README.md](./README.md) - 项目说明
- [SECURITY_AUDIT_FINAL.md](./SECURITY_AUDIT_FINAL.md) - 安全审计
- [TEST_RESULTS.md](./tests/TEST_RESULTS.md) - 测试结果

### 8.2 版本历史

| 版本 | 发布日期 | 类型 | 说明 |
|------|---------|------|------|
| v0.3.0 | 2026-04-12 | Minor | 多用户 + RBAC + 通知中心 |
| v0.2.6 | 2026-04-10 | Patch | 安全修复 |
| v0.2.5 | 2026-04-08 | Patch | 性能优化 |
| v0.2.0 | 2026-04-05 | Minor | 核心功能 |
| v0.1.0 | 2026-04-01 | Major | 初始版本 |

---

**文档版本**: 1.0  
**最后更新**: 2026-04-11 06:10  
**文档状态**: 待审核
