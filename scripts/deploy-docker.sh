#!/bin/bash
# OpenClaw-Admin Docker 部署脚本
# 功能：使用 Docker 容器化部署应用

set -e

PROJECT_DIR="/www/wwwroot/ai-work"
LOG_DIR="$PROJECT_DIR/logs"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
DATE=$(date '+%Y%m%d_%H%M%S')

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/deploy-docker.log"
}

# 检查依赖
check_dependencies() {
    log "检查 Docker 依赖..."
    
    command -v docker >/dev/null 2>&1 || { log "${RED}❌ Docker 未安装${NC}"; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { log "${RED}❌ Docker Compose 未安装${NC}"; exit 1; }
    
    log "${GREEN}✅ 依赖检查通过${NC}"
    log "Docker 版本：$(docker --version)"
    log "Docker Compose 版本：$(docker-compose --version)"
}

# 构建 Docker 镜像
build_image() {
    log "构建 Docker 镜像..."
    
    cd "$PROJECT_DIR"
    docker build -t openclaw-admin:latest . 2>&1 | tee -a "$LOG_DIR/deploy-docker.log"
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✅ Docker 镜像构建完成${NC}"
    else
        log "${RED}❌ Docker 镜像构建失败${NC}"
        exit 1
    fi
}

# 启动容器
start_containers() {
    log "启动 Docker 容器..."
    
    cd "$PROJECT_DIR"
    
    # 停止现有容器
    log "停止现有容器..."
    docker-compose down 2>/dev/null || true
    
    # 启动新容器
    log "启动新容器..."
    docker-compose up -d
    
    # 等待服务启动
    log "等待服务启动..."
    sleep 10
    
    # 检查容器状态
    log "检查容器状态..."
    docker-compose ps
    
    if [ $? -eq 0 ]; then
        log "${GREEN}✅ 容器启动成功${NC}"
    else
        log "${RED}❌ 容器启动失败${NC}"
        exit 1
    fi
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 等待服务完全启动
    sleep 15
    
    # 检查应用健康状态
    if curl -s http://localhost:10001/health > /dev/null 2>&1; then
        log "${GREEN}✅ 应用健康检查通过${NC}"
    else
        log "${YELLOW}⚠️ 应用健康检查未通过，但容器已启动${NC}"
        log "请检查应用日志：docker-compose logs app"
    fi
    
    # 检查监控服务
    if [ -f "$PROJECT_DIR/monitoring/docker-compose.yml" ]; then
        log "检查监控服务..."
        cd "$PROJECT_DIR/monitoring"
        docker-compose ps
        
        if [ $? -eq 0 ]; then
            log "${GREEN}✅ 监控服务检查通过${NC}"
        else
            log "${YELLOW}⚠️ 监控服务未启动${NC}"
        fi
    fi
}

# 查看日志
show_logs() {
    log "显示最近日志..."
    cd "$PROJECT_DIR"
    docker-compose logs --tail=50
}

# 主函数
main() {
    log "=========================================="
    log "🚀 开始 Docker 部署 OpenClaw-Admin"
    log "=========================================="
    
    check_dependencies
    build_image
    start_containers
    health_check
    
    log "=========================================="
    log "${GREEN}✅ Docker 部署完成！${NC}"
    log "=========================================="
    log ""
    log "服务访问地址:"
    log "  - 应用：http://localhost:10001"
    log "  - Grafana: http://localhost:3002 (admin/admin123)"
    log "  - Prometheus: http://localhost:9090"
    log ""
    log "常用命令:"
    log "  - 查看日志：docker-compose logs -f"
    log "  - 停止服务：docker-compose down"
    log "  - 重启服务：docker-compose restart"
    log "  - 查看状态：docker-compose ps"
    log ""
}

# 执行
main
