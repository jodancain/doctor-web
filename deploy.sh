#!/bin/bash
# ============================================================
# 痛风管家 GoutCare — 一键部署脚本
# 适用于全新 Linux 服务器（Ubuntu/Debian/CentOS）
# 域名：yundongyl.cn
# ============================================================

set -e

DOMAIN="yundongyl.cn"
EMAIL="admin@${DOMAIN}"  # Let's Encrypt 需要邮箱，可修改
PROJECT_DIR="/opt/goutcare"

echo "=========================================="
echo "  痛风管家 GoutCare 一键部署"
echo "  域名: ${DOMAIN}"
echo "=========================================="

# ==================== 第一步：安装 Docker ====================
install_docker() {
    if command -v docker &> /dev/null; then
        echo "✅ Docker 已安装: $(docker --version)"
    else
        echo "📦 安装 Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
        echo "✅ Docker 安装完成"
    fi

    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo "✅ Docker Compose 已安装"
    else
        echo "📦 安装 Docker Compose 插件..."
        apt-get update && apt-get install -y docker-compose-plugin 2>/dev/null || \
        yum install -y docker-compose-plugin 2>/dev/null || \
        echo "⚠️ 请手动安装 docker-compose"
    fi
}

# ==================== 第二步：创建项目目录 ====================
setup_project() {
    echo ""
    echo "📁 设置项目目录: ${PROJECT_DIR}"
    mkdir -p ${PROJECT_DIR}

    # 如果当前目录有文件，复制过去
    if [ -f "docker-compose.yml" ]; then
        cp -r . ${PROJECT_DIR}/
        echo "✅ 项目文件已复制"
    fi

    cd ${PROJECT_DIR}
}

# ==================== 第三步：生成安全密钥 ====================
generate_secrets() {
    echo ""
    echo "🔐 生成安全配置..."

    # 如果 .env 不存在则创建
    if [ ! -f ".env" ]; then
        MONGO_PWD=$(openssl rand -base64 24 | tr -d '=/+' | head -c 32)
        JWT_KEY=$(openssl rand -hex 32)

        cat > .env << EOF
# 自动生成的安全配置 — $(date '+%Y-%m-%d %H:%M:%S')
MONGO_PASSWORD=${MONGO_PWD}
JWT_SECRET=${JWT_KEY}
WX_APPID=wx88328469a06c102e
WX_SECRET=
DOCTOR_REGISTER_CODE=18736
YUANQI_APP_ID=kGvJbghrVRcy
YUANQI_APP_KEY=
EOF
        echo "✅ .env 已生成（MongoDB 密码和 JWT 密钥已自动随机生成）"
        echo ""
        echo "⚠️  请编辑 .env 填入 WX_SECRET:"
        echo "    nano ${PROJECT_DIR}/.env"
        echo ""
    else
        echo "✅ .env 已存在，跳过"
    fi
}

# ==================== 第四步：申请 SSL 证书 ====================
setup_ssl() {
    echo ""
    echo "🔒 配置 SSL 证书..."

    mkdir -p certbot/conf certbot/www

    # 检查是否已有证书
    if [ -d "certbot/conf/live/${DOMAIN}" ]; then
        echo "✅ SSL 证书已存在"
        return
    fi

    # 先用 HTTP-only 的 nginx 来验证域名
    echo "📋 临时启动 Nginx 用于域名验证..."

    # 创建临时 nginx 配置（仅 HTTP，用于 certbot 验证）
    cat > nginx-temp.conf << 'NGINX_TEMP'
worker_processes auto;
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 200 'GoutCare SSL Setup'; }
    }
}
NGINX_TEMP

    docker run -d --name goutcare-nginx-temp \
        -p 80:80 \
        -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
        -v $(pwd)/certbot/www:/var/www/certbot \
        nginx:alpine

    echo "⏳ 申请 Let's Encrypt 证书..."
    docker run --rm \
        -v $(pwd)/certbot/conf:/etc/letsencrypt \
        -v $(pwd)/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot -w /var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN} -d www.${DOMAIN}

    # 清理临时容器
    docker stop goutcare-nginx-temp && docker rm goutcare-nginx-temp
    rm -f nginx-temp.conf

    if [ -d "certbot/conf/live/${DOMAIN}" ]; then
        echo "✅ SSL 证书申请成功！"
    else
        echo "❌ SSL 证书申请失败，请检查:"
        echo "   1. 域名 ${DOMAIN} 是否已解析到本服务器 IP"
        echo "   2. 服务器 80 端口是否开放"
        echo ""
        echo "   可手动重试: docker run --rm -v \$(pwd)/certbot/conf:/etc/letsencrypt -v \$(pwd)/certbot/www:/var/www/certbot certbot/certbot certonly --webroot -w /var/www/certbot -d ${DOMAIN}"
        exit 1
    fi
}

# ==================== 第五步：启动所有服务 ====================
start_services() {
    echo ""
    echo "🚀 启动所有服务..."
    cd ${PROJECT_DIR}

    # 构建并启动
    docker compose up -d --build

    echo ""
    echo "⏳ 等待服务启动..."
    sleep 10

    # 检查状态
    echo ""
    docker compose ps
    echo ""

    # 测试
    echo "🔍 测试服务..."
    if curl -s -o /dev/null -w "%{http_code}" https://${DOMAIN} | grep -q "200\|301\|302"; then
        echo "✅ HTTPS 服务正常！"
    else
        echo "⚠️  HTTPS 暂未就绪，检查日志: docker compose logs"
    fi
}

# ==================== 执行 ====================
echo ""
echo "即将在此服务器上部署痛风管家后端服务。"
echo "请确认域名 ${DOMAIN} 已解析到本服务器 IP。"
echo ""
read -p "继续? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 0
fi

install_docker
setup_project
generate_secrets
setup_ssl
start_services

echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "  后端地址:  https://${DOMAIN}"
echo "  API 地址:  https://${DOMAIN}/api/miniprogram"
echo "  医生端:    https://${DOMAIN}"
echo ""
echo "  📝 待办事项:"
echo "  1. 编辑 .env 填入 WX_SECRET"
echo "     nano ${PROJECT_DIR}/.env"
echo "     docker compose restart backend"
echo ""
echo "  2. 在微信公众平台配置服务器域名:"
echo "     request 合法域名: https://${DOMAIN}"
echo "     uploadFile 合法域名: https://${DOMAIN}"
echo ""
echo "  🔧 常用命令:"
echo "  查看日志:    docker compose logs -f backend"
echo "  重启服务:    docker compose restart"
echo "  停止服务:    docker compose down"
echo "  更新部署:    docker compose up -d --build"
echo "=========================================="
