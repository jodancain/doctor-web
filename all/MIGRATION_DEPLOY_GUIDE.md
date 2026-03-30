# 系统架构迁移与部署完整指南
*(WeChat CloudBase -> 独立服务器 MongoDB + Node.js)*

本指南详细记录了将“痛风管家”从小程序云开发架构，重构为独立后端服务（Web 端与小程序共用一个 Node.js API）并部署至自有 Linux 服务器的全流程。

---

## 目录
1. [架构变更说明](#1-架构变更说明)
2. [本地开发与 Web 端运行](#2-本地开发与-web-端运行)
3. [数据库全量迁移 (生产环境)](#3-数据库全量迁移-生产环境)
4. [服务器 Docker 部署 (生产环境)](#4-服务器-docker-部署-生产环境)
5. [小程序提审与发布准备](#5-小程序提审与发布准备)

---

## 1. 架构变更说明

### 重构前 (云开发 BaaS)
- **数据库**：微信云开发免维护数据库。
- **接口层**：小程序强依赖 `wx.cloud.callFunction`；医生 Web 端使用 `@cloudbase/node-sdk` 硬连云库。
- **鉴权**：微信原生免鉴权（天然信赖 `OPENID`）。

### 重构后 (独立服务器)
- **数据库**：自建 **MongoDB** (兼容云开发 NoSQL 文档格式与字段)。
- **接口层**：Node.js Express 大后端 (`goutcare---doctor-portal (1)/server`)。包含 `/api/miniprogram` 接收小程序 HTTP 请求，包含 `/api/auth` 接收 Web 端请求。
- **鉴权**：JWT Token 机制。小程序调用 `wx.login` 获取 code 换取真 OpenID；Web 端账号密码登录校验。
- **静态资源**：保留微信云存储（CDN 图床）上传文件，后端仅存 `fileID`，极其节省服务器带宽。

---

## 2. 本地开发与 Web 端运行

无论你是要改 Web 端的前端页面，还是想修改后端的 API 逻辑，都可以通过以下方式在本地启动项目。

### 2.1 环境准备
1. 确保电脑已安装 `Node.js` (推荐 v18 或 v20) 和 `Docker`。
2. 进入合并后的服务目录：
   ```bash
   cd "goutcare---doctor-portal (1)"
   ```
3. 安装依赖包：
   ```bash
   npm install
   ```

### 2.2 启动本地数据库
如果你本地没有装 MongoDB，一行 Docker 命令即可拉起一个测试库：
```bash
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

### 2.3 配置环境变量
在 `goutcare---doctor-portal (1)` 目录下，新建或编辑 `.env.local` 文件，填入：
```env
# 连接刚才启动的本地数据库
MONGO_URI=mongodb://127.0.0.1:27017/goutcare

# 随便写一个 JWT 密钥
JWT_SECRET=dev-secret-key-12345

# 关闭 Cookie 的 Secure 校验，否则 http://localhost 登录时浏览器会拒绝写入 Token
COOKIE_SECURE=false

# API 端口
PORT=3000

# 小程序凭证 (如果你想在本地测试真实微信号授权，请填入真实信息；否则留空会生成假 mock_openid)
WX_APPID=wx88328469a06c102e
WX_SECRET=你的真实小程序Secret
```

### 2.4 启动 Web 端与后端服务
我们的项目采用了 Vite 提供的 `middlewareMode`，这意味着**前端 React 热更新和后端 Express API 跑在同一个端口上**。
运行以下命令：
```bash
npm run dev
```

### 2.5 测试验证
1. **测试 Web 端页面**：打开浏览器访问 `http://localhost:3000`。
2. **测试登录**：如果本地 MongoDB 是空的，你可以运行 `npx tsx create-test-doctor.ts` 创建一个账号为 `testdoctor`，密码为 `password123` 的测试医生。然后在浏览器中登录。
3. **测试小程序连接**：
   - 打开微信开发者工具，导入 `miniprogram` 目录。
   - 勾选右上角“详情” -> “本地设置” -> **不校验合法域名**。
   - 小程序的请求会自动打向 `http://localhost:3000/api/miniprogram`。

---

## 3. 数据库全量迁移 (生产环境)

准备把项目部署到服务器时，第一步是把微信云开发里的老数据搬出来。

### 3.1 导出云开发数据
1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)。
2. 进入 **数据库** 页面。
3. 依次选中以下 8 个集合，点击右上角的 **导出 (JSON格式)**：
   - `users`, `messages`, `uaRecords`, `attackRecords`, `waterRecords`, `exerciseRecords`, `medicationReminders`, `dietRecords`
4. 把下载的 8 个 JSON 文件上传到你的 Linux 服务器的 `/root/db_exports/` 目录下。

### 3.2 导入服务器 MongoDB
在服务器上，确保你已经用 `docker-compose up -d mongodb` 启动了数据库。执行以下导入命令（假设你的数据库账号密码是 `admin` 和 `secure_password`，数据库名为 `goutcare`）：

```bash
# 示例：导入 users 集合
docker-compose exec mongodb mongoimport \
  --db goutcare \
  --collection users \
  --authenticationDatabase admin \
  --username admin \
  --password secure_password \
  --file /root/db_exports/users.json \
  --jsonArray
```
*(注：如果导出的 JSON 是换行符分隔的格式，去掉 `--jsonArray` 参数。对 8 个文件分别执行上述命令即可完成 100% 数据平移)*。

---

## 4. 服务器 Docker 部署 (生产环境)

我们提供了一键部署的 `docker-compose.yml` 方案。

### 4.1 目录结构准备
在你的 Linux 服务器（如腾讯云、阿里云）上，创建一个项目目录 `/data/goutcare`，把本地代码传上去，结构如下：
```text
/data/goutcare/
  ├── docker-compose.yml
  ├── nginx.conf
  ├── goutcare---doctor-portal (1)/  (包含 server/ 和 前端代码)
  └── data/
      └── mongo/    (数据库持久化目录)
```

### 4.2 配置生产环境变量
编辑 `/data/goutcare/goutcare---doctor-portal (1)/.env.production`：
```env
NODE_ENV=production
PORT=3000
# 指向 Compose 里的 mongodb 容器
MONGO_URI=mongodb://admin:secure_password@mongodb:27017/goutcare?authSource=admin
JWT_SECRET=换成一个复杂的随机字符串
WX_APPID=真实的小程序AppID
WX_SECRET=真实的小程序Secret
# 生产环境有 HTTPS，开启 Cookie 安全
COOKIE_SECURE=true
```

### 4.3 一键构建与拉起
在 `/data/goutcare/` 目录下执行：
```bash
docker-compose build
docker-compose up -d
```
Docker 会自动完成：
1. 下载 MongoDB 镜像并启动。
2. 运行 `npm run build` 打包 Web 端的 React 静态文件。
3. 启动 Node.js API 服务器。
4. 启动 Nginx，将 `80/443` 端口暴露在公网，并反向代理后端的 `3000` 端口。

*此时，你的服务器已经完全接管了小程序的后端和医生的 Web 门户！*

---

## 5. 小程序提审与发布准备

后端切换到你自己的服务器后，小程序的上线流程需要做以下调整：

1. **修改请求域名**：
   在打包小程序前，打开 `miniprogram/utils/request.js`，将 `API_BASE_URL` 改为你服务器的线上真实域名（必须是 HTTPS）。
   ```javascript
   const API_BASE_URL = 'https://api.yourdomain.com/api/miniprogram';
   ```
2. **配置微信后台合法域名**：
   登录 [微信公众平台](https://mp.weixin.qq.com/) -> 开发 -> 开发管理 -> 开发设置 -> **服务器域名**。
   将 `https://api.yourdomain.com` 填入 **request 合法域名** 列表中。
3. **保留云存储域名 (如果你还在用 `wx.cloud.uploadFile` 传图片)**：
   检查你的小程序代码，只要图片上传还在走微信云存储，那一切照旧，不用修改上传域名，微信会自动放行。
4. **上传与提审**：
   在微信开发者工具中点击“上传”，设为体验版测试无误后，正常提交审核即可。

---

## 6. 生产环境 AI 对话排障（医生端）

当线上出现“`/api/ai/chat` 返回 200，但 AI 回复气泡为空”的情况，按以下步骤处理：

1. **确认环境变量**（服务器 `.env`）：
   - `YUANQI_APP_ID` 已配置
   - `YUANQI_APP_KEY` 已配置
2. **确认后端已包含 SSE 修复版本**：
   - `server/services/providers/yuanqi.ts` 已使用“带缓冲的 SSE 解析”
   - `server/routes/ai.ts` 已包含“流式无文本时降级非流式兜底”
3. **重建并重启服务**：
   ```bash
   cd /opt/goutcare
   docker compose up -d --build backend nginx
   ```
4. **线上验证**：
   - 浏览器 Network 检查 `POST /api/ai/chat`，响应头应为 `text/event-stream`
   - 页面应出现完整 AI 文本，而非空白气泡
5. **日志排查命令**：
   ```bash
   cd /opt/goutcare
   docker compose logs --tail=200 backend
   ```
   若出现 `Yuanqi stream http 400` / `Yuanqi API error`：
   - 优先确认 `YUANQI_APP_ID` 与元器控制台一致；
   - 重新生成并替换 `YUANQI_APP_KEY`；
   - 确认智能体已发布为 API 可调用状态。
