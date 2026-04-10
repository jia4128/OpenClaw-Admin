# 部署脚本说明文档

## 概述

本文档介绍项目中的各种部署脚本及其使用方法。

## 脚本列表

### 1. deploy.sh - 传统部署脚本

**功能**: 使用传统方式部署应用（非容器化）

**使用场景**:
- 服务器未安装 Docker
- 需要直接运行 Node.js 应用
- 开发环境快速部署

**使用方法**:
```bash
cd /www/wwwroot/ai-work
./scripts/deploy.sh
```

**执行流程**:
1. 检查依赖 (Node.js, npm, MySQL)
2. 备份当前版本
3. 拉取最新代码
4. 安装依赖
5. 执行数据库迁移
6. 构建前端资源
7. 重启服务
8. 健康检查

**日志位置**: `/www/wwwroot/ai-work/logs/deploy.log`

---

### 2. deploy-docker.sh - Docker 部署脚本

**功能**: 使用 Docker 容器化部署应用

**使用场景**:
- 生产环境部署
- 需要环境隔离
- 快速回滚和扩容

**使用方法**:
```bash
cd /www/wwwroot/ai-work
./scripts/deploy-docker.sh
```

**执行流程**:
1. 检查 Docker 依赖
2. 构建 Docker 镜像
3. 停止现有容器
4. 启动新容器
5. 健康检查

**日志位置**: `/www/wwwroot/ai-work/logs/deploy-docker.log`

**访问地址**:
- 应用：http://localhost:10001
- Grafana: http://localhost:3002 (admin/admin123)
- Prometheus: http://localhost:9090

---

### 3. setup-server.sh - 服务器环境配置脚本

**功能**: 配置服务器运行环境

**使用场景**:
- 新服务器初始化
- 部署前环境准备
- 安装监控组件

**使用方法**:
```bash
sudo ./scripts/setup-server.sh
```

**安装组件**:
- Docker & Docker Compose
- kubectl & Helm
- Prometheus
- Node Exporter
- Grafana
- 防火墙配置

**服务状态检查**:
```bash
systemctl status docker
systemctl status prometheus
systemctl status node_exporter
systemctl status grafana-server
```

---

### 4. health-check.sh - 健康检查脚本

**功能**: 检查应用和服务的健康状态

**使用方法**:
```bash
./scripts/health-check.sh
```

**检查项**:
- 应用服务状态
- 数据库连接
- Redis 连接 (如启用)
- 磁盘空间
- 内存使用
- CPU 使用

**输出示例**:
```
[2026-04-11 05:00:00] 应用服务：✅ 运行中
[2026-04-11 05:00:00] 数据库：✅ 连接正常
[2026-04-11 05:00:00] 磁盘空间：✅ 可用 50GB
[2026-04-11 05:00:00] 内存使用：✅ 65%
```

---

### 5. log-collector.sh - 日志收集脚本

**功能**: 收集和打包应用日志

**使用方法**:
```bash
./scripts/log-collector.sh
```

**输出**:
- 日志打包到 `/www/wwwroot/ai-work/backups/logs_YYYYMMDD_HHMMSS.tar.gz`
- 包含所有服务日志

**用途**:
- 问题排查
- 审计分析
- 日志归档

---

### 6. performance-monitor.sh - 性能监控脚本

**功能**: 监控系统性能指标

**使用方法**:
```bash
./scripts/performance-monitor.sh
```

**监控指标**:
- CPU 使用率
- 内存使用率
- 磁盘 I/O
- 网络流量
- 应用响应时间

**输出**: 性能报告到 `/www/wwwroot/ai-work/reports/performance_YYYYMMDD.txt`

---

### 7. rollback.sh - 回滚脚本

**功能**: 回滚到上一个版本

**使用方法**:
```bash
./scripts/rollback.sh
```

**执行流程**:
1. 查找最新备份
2. 停止当前服务
3. 恢复备份文件
4. 重启服务
5. 健康检查

**备份位置**: `/www/wwwroot/ai-work/backups/`

---

## 自动化部署流程

### GitHub Actions 自动部署

**触发条件**:
- 推送代码到 main 分支
- 手动触发 workflow_dispatch

**流程**:
```
git push main
    ↓
GitHub Actions 触发
    ↓
CI: lint → test → build → docker build
    ↓
CD: deploy → health-check
    ↓
飞书通知
```

**查看流水线状态**:
- GitHub Actions 页面
- 实时日志输出

---

## 常见问题

### 1. 部署失败

**问题**: 部署脚本执行失败

**排查步骤**:
1. 检查日志文件
2. 验证依赖是否安装
3. 检查磁盘空间
4. 验证网络连接

### 2. 健康检查失败

**问题**: 服务启动但健康检查失败

**排查步骤**:
1. 检查应用日志
2. 验证端口监听
3. 检查数据库连接
4. 增加等待时间

### 3. Docker 镜像拉取失败

**问题**: 无法拉取 Docker 镜像

**解决方法**:
```bash
# 配置镜像加速
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 最佳实践

### 1. 部署前检查

```bash
# 1. 检查代码
npm run lint
npm run test

# 2. 本地构建
npm run build

# 3. 检查磁盘空间
df -h

# 4. 备份数据库
mysqldump -u root -p database > backup.sql
```

### 2. 部署后验证

```bash
# 1. 检查服务状态
docker-compose ps

# 2. 健康检查
curl http://localhost:10001/health

# 3. 查看日志
docker-compose logs --tail=50

# 4. 功能测试
curl http://localhost:10001/api/health
```

### 3. 监控告警配置

```bash
# 配置飞书告警
# 编辑 monitoring/prometheus/alerts.yml
# 添加飞书 Webhook 通知
```

---

## 附录

### 环境变量配置

创建 `.env` 文件:
```env
NODE_ENV=production
PORT=10001
DATABASE_URL=mysql://user:password@localhost:3306/openclaw
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
```

### 服务管理命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec app sh
```

### 日志轮转配置

编辑 `/etc/logrotate.d/openclaw-admin`:
```
/www/wwwroot/ai-work/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 root root
}
```

---
*最后更新：2026-04-11*
*版本：1.0*
