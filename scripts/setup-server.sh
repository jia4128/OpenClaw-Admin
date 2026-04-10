#!/bin/bash
# 服务器环境配置脚本
# 功能：配置 Docker、Kubernetes、监控等运行环境

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 更新系统包
update_system() {
    log "🔄 更新系统包..."
    apt-get update -y
    log "${GREEN}✅ 系统包更新完成${NC}"
}

# 安装 Docker
install_docker() {
    log "🐳 安装 Docker..."
    
    # 安装依赖
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # 添加 Docker GPG 密钥
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 添加 Docker 仓库
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # 启动 Docker 服务
    systemctl enable docker
    systemctl start docker
    
    log "${GREEN}✅ Docker 安装完成${NC}"
    log "Docker 版本：$(docker --version)"
}

# 安装 Docker Compose
install_docker_compose() {
    log "🐳 安装 Docker Compose..."
    
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    log "${GREEN}✅ Docker Compose 安装完成${NC}"
    log "Docker Compose 版本：$(docker-compose --version)"
}

# 安装 kubectl
install_kubectl() {
    log "⎈ 安装 kubectl..."
    
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    chmod +x kubectl
    mv kubectl /usr/local/bin/
    
    log "${GREEN}✅ kubectl 安装完成${NC}"
    log "kubectl 版本：$(kubectl version --client --short 2>/dev/null || kubectl version --client)"
}

# 安装 Helm
install_helm() {
    log "📦 安装 Helm..."
    
    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    
    log "${GREEN}✅ Helm 安装完成${NC}"
    log "Helm 版本：$(helm version --short)"
}

# 配置 Docker 镜像加速
configure_docker_mirror() {
    log "🔧 配置 Docker 镜像加速..."
    
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF
    
    systemctl daemon-reload
    systemctl restart docker
    
    log "${GREEN}✅ Docker 镜像加速配置完成${NC}"
}

# 安装 Prometheus
install_prometheus() {
    log "📊 安装 Prometheus..."
    
    # 创建 Prometheus 用户
    useradd --no-create-home --shell /usr/sbin/nologin prometheus
    
    # 创建目录
    mkdir -p /etc/prometheus /var/lib/prometheus
    
    # 下载 Prometheus
    PROMETHEUS_VERSION="2.48.0"
    curl -LO "https://github.com/prometheus/prometheus/releases/download/v${PROMETHEUS_VERSION}/prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz"
    tar -xzf prometheus-${PROMETHEUS_VERSION}.linux-amd64.tar.gz
    cd prometheus-${PROMETHEUS_VERSION}
    
    mv prometheus /usr/local/bin/
    mv promtool /usr/local/bin/
    mv consoles/ /etc/prometheus/
    mv console_libraries/ /etc/prometheus/
    mv prometheus.yml /etc/prometheus/
    
    cd ..
    rm -rf prometheus-${PROMETHEUS_VERSION}*
    
    # 创建 Systemd 服务
    cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/var/lib/prometheus/ \
  --storage.tsdb.retention.time=15d \
  --web.enable-lifecycle

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl enable prometheus
    systemctl start prometheus
    
    log "${GREEN}✅ Prometheus 安装完成${NC}"
}

# 安装 Node Exporter
install_node_exporter() {
    log "📊 安装 Node Exporter..."
    
    # 创建 Node Exporter 用户
    useradd --no-create-home --shell /usr/sbin/nologin node_exporter
    
    # 下载 Node Exporter
    NODE_EXPORTER_VERSION="1.7.0"
    curl -LO "https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz"
    tar -xzf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
    cd node_exporter-${NODE_EXPORTER_VERSION}
    
    mv node_exporter /usr/local/bin/
    
    cd ..
    rm -rf node_exporter-${NODE_EXPORTER_VERSION}*
    
    # 创建 Systemd 服务
    cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl enable node_exporter
    systemctl start node_exporter
    
    log "${GREEN}✅ Node Exporter 安装完成${NC}"
}

# 安装 Grafana
install_grafana() {
    log "📊 安装 Grafana..."
    
    # 添加 Grafana 仓库
    apt-get install -y software-properties-common
    add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
    curl https://packages.grafana.com/gpg.key | apt-key add -
    
    # 安装 Grafana
    apt-get update -y
    apt-get install -y grafana
    
    # 启动 Grafana
    systemctl enable grafana-server
    systemctl start grafana-server
    
    log "${GREEN}✅ Grafana 安装完成${NC}"
    log "Grafana 访问地址：http://your-server:3000"
    log "默认账号：admin / admin123"
}

# 配置防火墙
configure_firewall() {
    log "🔥 配置防火墙..."
    
    if command -v ufw >/dev/null 2>&1; then
        ufw allow 22/tcp
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 9090/tcp  # Prometheus
        ufw allow 3000/tcp  # Grafana
        ufw allow 9100/tcp  # Node Exporter
        ufw allow 10001/tcp # 应用服务
        
        log "${GREEN}✅ 防火墙配置完成${NC}"
    else
        log "${YELLOW}⚠️ UFW 未安装，跳过防火墙配置${NC}"
    fi
}

# 创建项目目录
create_project_dirs() {
    log "📁 创建项目目录..."
    
    PROJECT_DIR="/www/wwwroot/ai-work"
    
    mkdir -p "$PROJECT_DIR"/{logs,data,backups,config}
    mkdir -p "$PROJECT_DIR/monitoring"/{prometheus,grafana}
    
    # 设置权限
    chown -R $USER:$USER "$PROJECT_DIR"
    
    log "${GREEN}✅ 项目目录创建完成${NC}"
}

# 主函数
main() {
    log "=========================================="
    log "🚀 开始配置服务器环境"
    log "=========================================="
    
    update_system
    install_docker
    install_docker_compose
    configure_docker_mirror
    install_kubectl
    install_helm
    install_prometheus
    install_node_exporter
    install_grafana
    configure_firewall
    create_project_dirs
    
    log "=========================================="
    log "${GREEN}✅ 服务器环境配置完成！${NC}"
    log "=========================================="
    log ""
    log "服务状态:"
    systemctl status docker --no-pager | head -5
    systemctl status prometheus --no-pager | head -5
    systemctl status node_exporter --no-pager | head -5
    systemctl status grafana-server --no-pager | head -5
    log ""
    log "访问地址:"
    log "  - Prometheus: http://your-server:9090"
    log "  - Grafana: http://your-server:3000 (admin/admin123)"
    log "  - Node Exporter: http://your-server:9100"
    log "  - 应用服务：http://your-server:10001"
    log ""
}

# 执行
main
