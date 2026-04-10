# OpenClaw-Admin 部署文档

## 概述

本文档提供 OpenClaw-Admin 项目的完整部署指南，包括 CI/CD 流水线配置、自动化部署脚本、安全扫描集成和监控告警配置。

**项目路径**: `/www/wwwroot/ai-work/`  
**最后更新**: 2026-04-11  
**版本**: 1.0

---

## 目录

1. [CI/CD 流水线配置](#1-cicd-流水线配置)
2. [自动化部署脚本](#2-自动化部署脚本)
3. [CI/CD 安全扫描集成](#3-cicd-安全扫描集成)
4. [监控与告警配置](#4-监控与告警配置)
5. [部署步骤](#5-部署步骤)
6. [常见问题排查](#6-常见问题排查)
7. [回滚方案](#7-回滚方案)

---

## 1. CI/CD 流水线配置

### 1.1 GitHub Actions 流水线

项目已配置两个主要的 GitHub Actions 工作流：

#### CI 流水线 (`.github/workflows/ci-cd.yml`)

**触发条件**:
- 推送代码到 `main` 或 `develop` 分支
- 创建 Pull Request

**执行阶段**:
1. **代码检查** (`lint`)
   - ESLint 代码规范检查
   - TypeScript 类型检查

2. **单元测试** (`test`)
   - 运行 Vitest 测试套件
   - 生成测试覆盖率报告

3. **构建** (`build`)
   - 构建前端资源
   - 上传构建产物

4. **部署** (`deploy`) - 仅 main 分支
   - 通过 SSH 部署到生产服务器
   - 使用 PM2 重启服务

5. **健康检查** (`health-check`)
   - 验证服务健康状态
   - 发送飞书通知

#### 生产部署流水线 (`.github/workflows/deploy.yml`)

**触发条件**:
- 推送代码到 `main` 分支
- 手动触发 (`workflow_dispatch`)

**执行阶段**:
1. **构建 Docker 镜像**
   - 构建并推送镜像到 GHCR
   - 使用 SHA 标签版本控制

2. **部署到服务器**
   - SSH 连接到目标服务器
   - 拉取最新镜像
   - 容器化部署

3. **健康检查**
   - 验证服务可用性
   - 发送部署通知

### 1.2 所需 GitHub Secrets

在 GitHub 仓库设置中配置以下 Secrets:

```yaml
DEPLOY_SSH_KEY: # SSH 私钥，用于服务器部署
DEPLOY_USER: # 部署用户名 (如：root)
DEPLOY_HOST: # 目标服务器 IP
DEPLOY_PATH: # 部署路径 (如：/www/wwwroot/ai-work)
FEISHU_WEBHOOK_URL: # 飞书机器人 Webhook URL
PRODUCTION_URL: # 生产环境 URL (用于健康检查)
```

---

## 2. 自动化部署脚本

### 2.1 Docker 部署脚本 (`scripts/deploy-docker.sh`)

**功能**: 使用 Docker 容器化部署应用

**使用方法**:
```bash
cd /www/wwwroot/ai-work
./scripts/deploy-docker.sh
```

**执行流程**:
1. 检查 Docker 和 Docker Compose 依赖
2. 构建 Docker 镜像
3. 停止并移除现有容器
4. 启动新容器
5. 执行健康检查

**日志位置**: `/www/wwwroot/ai-work/logs/deploy-docker.log`

### 2.2 传统部署脚本 (`scripts/deploy.sh`)

**功能**: 直接部署 Node.js 应用（非容器化）

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
7. 重启服务 (PM2)
8. 健康检查

### 2.3 服务器环境配置脚本 (`scripts/setup-server.sh`)

**功能**: 初始化服务器运行环境

**使用方法**:
```bash
sudo ./scripts/setup-server.sh
```

**安装组件**:
- Docker & Docker Compose
- Prometheus Node Exporter
- Grafana
- 防火墙配置

### 2.4 其他辅助脚本

| 脚本 | 功能 | 使用场景 |
|------|------|----------|
| `health-check.sh` | 健康检查 | 部署后验证服务状态 |
| `rollback.sh` | 版本回滚 | 部署失败时恢复 |
| `log-collector.sh` | 日志收集 | 问题排查 |
| `performance-monitor.sh` | 性能监控 | 系统性能分析 |
| `cron-monitor.sh` | 定时任务监控 | 监控定时任务执行 |

---

## 3. CI/CD 安全扫描集成

### 3.1 安全扫描配置

#### 代码安全扫描

在 CI 流水线中集成以下安全扫描工具：

**建议添加的扫描步骤**:

```yaml
# 在 ci-cd.yml 的 lint 阶段后添加
security-scan:
  name: 🔒 安全扫描
  runs-on: ubuntu-latest
  needs: lint
  steps:
    - name: 📥 检出代码
      uses: actions/checkout@v4

    - name: 🛡️ 运行 SAST 扫描
      uses: securecodewarrior/github-action@v1
      with:
        scan-type: 'nodejs'

    - name: 🔍 依赖漏洞检查
      run: npm audit --audit-level=moderate

    - name: 📋 上传安全报告
      uses: actions/upload-artifact@v4
      with:
        name: security-report
        path: security-report.json
```

#### Docker 镜像安全扫描

在部署流水线中添加镜像扫描：

```yaml
# 在 deploy.yml 的 build-docker 阶段后添加
security-scan:
  name: 🐳 镜像安全扫描
  runs-on: ubuntu-latest
  needs: build-docker
  steps:
    - name: 🛡️ 运行 Trivy 扫描
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}'
        format: 'sarif'
        output: 'trivy-results.sarif'

    - name: 📤 上传扫描结果
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'
```

### 3.2 安全最佳实践

1. **Secrets 管理**
   - 所有敏感信息必须使用 GitHub Secrets
   - 禁止在代码中硬编码密钥
   - 定期轮换密钥

2. **镜像安全**
   - 使用基础镜像的安全版本
   - 定期更新基础镜像
   - 最小化镜像权限

3. **网络隔离**
   - 数据库不暴露公网
   - 使用 VPC 内部网络
   - 配置安全组规则

---

## 4. 监控与告警配置

### 4.1 Prometheus 监控

**配置文件**: `monitoring/prometheus/prometheus.yml`

**监控目标**:
- Prometheus 自身 (`localhost:9090`)
- 节点指标 (`node-exporter:9100`)
- 应用指标 (`openclaw-web:3000`)

**采集间隔**: 15 秒

### 4.2 Grafana 仪表盘

**访问地址**: `http://localhost:3002`  
**默认账号**: `admin/admin123`

**预配置仪表盘**:
1. 系统资源监控 (CPU、内存、磁盘、网络)
2. 应用性能监控 (请求量、响应时间、错误率)
3. 数据库监控 (连接数、查询性能)

### 4.3 告警配置

**告警规则文件**: `monitoring/prometheus/alerts.yml`

**预配置告警**:

| 告警名称 | 条件 | 严重级别 | 通知方式 |
|----------|------|----------|----------|
| ServiceDown | 服务不可用 | Critical | 飞书 + 短信 |
| HighCPU | CPU > 80% | Warning | 飞书 |
| HighMemory | 内存 > 85% | Warning | 飞书 |
| HighErrorRate | 错误率 > 5% | Critical | 飞书 + 短信 |
| DiskFull | 磁盘使用 > 90% | Warning | 飞书 |

### 4.4 Kubernetes 监控 (可选)

**配置文件**: `kubernetes/monitoring.yaml`

**组件**:
- Prometheus (监控数据采集)
- Alertmanager (告警路由)
- Grafana (可视化)
- Node Exporter (节点指标)
- cAdvisor (容器指标)

---

## 5. 部署步骤

### 5.1 前置准备

1. **服务器准备**
   ```bash
   # 运行环境配置脚本
   sudo ./scripts/setup-server.sh
   ```

2. **环境变量配置**
   ```bash
   # 复制示例配置
   cp .env.example .env
   
   # 编辑配置文件
   vim .env
   ```

3. **数据库初始化**
   ```bash
   # 执行数据库迁移
   cd /www/wwwroot/ai-work/db
   mysql -u root -p < schema.sql
   ```

### 5.2 Docker 部署

```bash
# 方式 1: 使用部署脚本
./scripts/deploy-docker.sh

# 方式 2: 手动部署
cd /www/wwwroot/ai-work
docker-compose build
docker-compose up -d

# 验证部署
docker-compose ps
curl http://localhost:10001/health
```

### 5.3 Kubernetes 部署

```bash
# 创建命名空间
kubectl apply -f kubernetes/deployment.yaml

# 验证部署
kubectl get pods -n openclaw-admin
kubectl get svc -n openclaw-admin

# 查看日志
kubectl logs -f deployment/openclaw-admin -n openclaw-admin
```

### 5.4 GitHub Actions 自动部署

1. 推送代码到 main 分支
2. GitHub Actions 自动触发 CI/CD 流水线
3. 查看流水线状态: https://github.com/your-org/OpenClaw-Admin/actions
4. 部署完成后接收飞书通知

---

## 6. 常见问题排查

### 6.1 部署失败

**问题**: 部署脚本执行失败

**排查步骤**:
```bash
# 1. 检查日志
tail -f /www/wwwroot/ai-work/logs/deploy-docker.log

# 2. 检查依赖
docker --version
docker-compose --version

# 3. 检查磁盘空间
df -h

# 4. 检查网络连接
ping github.com
```

### 6.2 健康检查失败

**问题**: 服务启动但健康检查失败

**排查步骤**:
```bash
# 1. 检查服务状态
docker-compose ps

# 2. 查看应用日志
docker-compose logs app --tail=100

# 3. 手动测试健康接口
curl -v http://localhost:10001/health

# 4. 检查数据库连接
docker-compose exec app npm run db:test-connection
```

### 6.3 性能问题

**问题**: 应用响应慢

**排查步骤**:
```bash
# 1. 监控系统资源
./scripts/performance-monitor.sh

# 2. 查看慢查询日志
tail -f /www/wwwroot/ai-work/logs/slow-query.log

# 3. 检查内存使用
docker stats openclaw-admin
```

---

## 7. 回滚方案

### 7.1 使用回滚脚本

```bash
# 执行回滚
./scripts/rollback.sh
```

**执行流程**:
1. 查找最新备份
2. 停止当前服务
3. 恢复备份文件
4. 重启服务
5. 健康检查

### 7.2 Docker 回滚

```bash
# 列出历史镜像
docker images openclaw-admin

# 回滚到指定版本
docker stop openclaw-admin
docker rm openclaw-admin
docker run -d --name openclaw-admin openclaw-admin:previous-version
```

### 7.3 Kubernetes 回滚

```bash
# 查看部署历史
kubectl rollout history deployment/openclaw-admin -n openclaw-admin

# 回滚到上一个版本
kubectl rollout undo deployment/openclaw-admin -n openclaw-admin

# 回滚到指定版本
kubectl rollout undo deployment/openclaw-admin -n openclaw-admin --to-revision=3
```

---

## 附录

### A. 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 10001 | 应用服务 | 主应用 API |
| 3000 | Grafana | 监控仪表盘 |
| 9090 | Prometheus | 监控数据采集 |
| 9100 | Node Exporter | 节点指标 |
| 3306 | MySQL | 数据库 |

### B. 常用命令

```bash
# 服务管理
docker-compose start
docker-compose stop
docker-compose restart
docker-compose down

# 日志查看
docker-compose logs -f
docker-compose logs app --tail=100

# 进入容器
docker-compose exec app sh
docker-compose exec db mysql -u root -p

# 资源清理
docker system prune -a
```

### C. 配置文件位置

| 配置文件 | 路径 | 说明 |
|----------|------|------|
| 环境变量 | `/www/wwwroot/ai-work/.env` | 应用配置 |
| Docker Compose | `/www/wwwroot/ai-work/docker-compose.yml` | 容器编排 |
| K8s 部署 | `/www/wwwroot/ai-work/kubernetes/deployment.yaml` | Kubernetes 配置 |
| 监控配置 | `/www/wwwroot/ai-work/monitoring/prometheus/prometheus.yml` | Prometheus 配置 |
| CI/CD 配置 | `/www/wwwroot/ai-work/.github/workflows/` | GitHub Actions |

---

## 版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| 1.0 | 2026-04-11 | 初始版本 | 运维工程师 |

---

*本文档由 OpenClaw-Admin 运维团队维护*  
*如有问题，请联系运维团队或提交 Issue*
