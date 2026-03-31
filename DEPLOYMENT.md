# GoutCare 部署教程

## 方式一：Docker Compose 一键部署（推荐）

### 前置要求
- 安装 [Docker](https://docs.docker.com/get-docker/) 和 [Docker Compose](https://docs.docker.com/compose/install/)

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/jodancain/doctor-web.git
cd doctor-web

# 2. 创建环境变量文件
cp .env.example .env
```

编辑 `.env` 文件，设置以下变量：

```env
# 数据库密码（必须修改）
MYSQL_ROOT_PASSWORD=your-strong-password-here

# JWT 密钥（必须修改，用于生成登录 token）
JWT_SECRET=your-random-secret-key-at-least-32-chars

# Cookie 安全设置
# - HTTPS 部署设为 true
# - HTTP 或本地测试设为 false
COOKIE_SECURE=false

# Google Gemini API Key（AI 辅助决策功能，可选）
GEMINI_API_KEY=your-gemini-api-key

# 数据库连接（Docker Compose 自动配置，无需修改）
DATABASE_URL=mysql://root:your-strong-password-here@mysql:3306/goutcare
```

```bash
# 3. 一键启动（MySQL + 应用）
docker compose up -d

# 4. 等待 MySQL 就绪后，创建数据库表
docker compose exec app npx prisma db push

# 5. 查看日志
docker compose logs -f app
```

访问 http://localhost:3000 即可使用。

### 创建初始管理员账号

```bash
# 进入容器
docker compose exec app sh

# 运行创建脚本
npx tsx create-test-doctor.ts

# 退出容器
exit
```

默认账号：`testdoctor` / `password123`（请登录后立即修改密码）

### 常用命令

```bash
# 停止服务
docker compose down

# 重新构建并启动
docker compose up -d --build

# 查看数据库
docker compose exec mysql mysql -u root -p goutcare

# 备份数据库
docker compose exec mysql mysqldump -u root -p goutcare > backup.sql

# 恢复数据库
docker compose exec -T mysql mysql -u root -p goutcare < backup.sql
```

---

## 方式二：手动部署（不用 Docker）

### 前置要求
- Node.js 20+
- MySQL 8.0+

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/jodancain/doctor-web.git
cd doctor-web

# 2. 安装依赖
npm install

# 3. 创建 MySQL 数据库
mysql -u root -p -e "CREATE DATABASE goutcare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. 配置环境变量
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL=mysql://root:your-password@localhost:3306/goutcare
JWT_SECRET=your-random-secret-key
COOKIE_SECURE=false
GEMINI_API_KEY=your-gemini-api-key
```

```bash
# 5. 生成 Prisma Client 并创建数据库表
npx prisma generate
npx prisma db push

# 6. 创建测试医生账号
npx tsx create-test-doctor.ts

# 7. 构建前端
npm run build

# 8. 启动生产服务
NODE_ENV=production npm start
```

访问 http://localhost:3000

### 开发模式

```bash
npm run dev
```

自动启用 Vite 热更新。

---

## 方式三：腾讯云部署

### 腾讯云 CVM + CDB MySQL

```bash
# 1. 在腾讯云购买 CVM (推荐 2核4G) + CDB MySQL 8.0

# 2. SSH 登录 CVM
ssh root@your-server-ip

# 3. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. 克隆部署
git clone https://github.com/jodancain/doctor-web.git
cd doctor-web
npm install

# 5. 配置 .env
cp .env.example .env
# 编辑 DATABASE_URL 为腾讯云 CDB 内网地址
# DATABASE_URL=mysql://root:password@10.x.x.x:3306/goutcare

# 6. 初始化数据库
npx prisma generate
npx prisma db push
npx tsx create-test-doctor.ts

# 7. 构建并启动
npm run build
NODE_ENV=production npm start
```

### 使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
NODE_ENV=production pm2 start "npm start" --name goutcare

# 开机自启
pm2 save
pm2 startup

# 查看日志
pm2 logs goutcare

# 重启
pm2 restart goutcare
```

### Nginx 反向代理（可选，用于 HTTPS）

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，将 `.env` 中 `COOKIE_SECURE=true`。

---

## 数据库管理

### 查看表结构

```bash
npx prisma studio
```

打开浏览器访问 http://localhost:5555，可视化管理数据库。

### 数据库迁移

```bash
# 修改 prisma/schema.prisma 后，创建迁移
npx prisma migrate dev --name your-migration-name

# 生产环境应用迁移
npx prisma migrate deploy
```

### 重置数据库（危险！会删除所有数据）

```bash
npx prisma db push --force-reset
```

---

## 环境变量说明

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `DATABASE_URL` | 是 | MySQL 连接地址 | `mysql://root:pass@localhost:3306/goutcare` |
| `JWT_SECRET` | 是 | JWT 签名密钥，至少 32 字符 | `a1b2c3d4e5f6...` |
| `COOKIE_SECURE` | 是 | HTTPS 环境设为 true | `true` / `false` |
| `GEMINI_API_KEY` | 否 | Google Gemini API Key | `AIza...` |
| `PORT` | 否 | 服务端口，默认 3000 | `3000` |
| `LOG_LEVEL` | 否 | 日志级别，默认 info | `info` / `debug` / `error` |

---

## 常见问题

### Q: 登录后所有接口返回 401？
**A:** Cookie 安全属性不匹配。如果你的环境是 HTTP（非 HTTPS），确保 `COOKIE_SECURE=false`。

### Q: 数据库连接失败？
**A:** 检查 `DATABASE_URL` 格式是否正确，确认 MySQL 服务已启动，用户名密码正确。

### Q: 前端页面空白？
**A:** 确认已运行 `npm run build`，且 `NODE_ENV=production` 已设置。开发环境直接用 `npm run dev`。

### Q: AI 辅助决策不可用？
**A:** 需要配置 `GEMINI_API_KEY`。前往 [Google AI Studio](https://aistudio.google.com/) 获取 API Key。

### Q: 如何添加新的医生账号？
**A:** 目前通过数据库直接插入。后续可通过系统管理-用户管理页面添加（需接入后端 API）。
