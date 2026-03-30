# 云服务器部署与配置教程（Docker Compose）

面向已将代码同步到服务器（或 Git 克隆）的运维/开发人员，在 **Ubuntu 22.04**、已安装 **Docker** 与 **Docker Compose** 的轻量应用服务器（示例公网 IP：`101.43.123.29`，请以实际为准）上部署医生端后端。

---

## 1. 前置条件

- 服务器可 SSH 登录，安全组/防火墙策略已规划（至少 SSH；对外提供 Web 时需开放 **80/443** 或你映射的端口）。
- 已安装 Docker Engine 与 Compose 插件（腾讯云「Docker」镜像通常已预装，可用下面命令自检）：

```bash
docker --version
docker compose version
```

- 已在 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb) 创建环境，并取得 **环境 ID** 与 **服务端密钥**（SecretId / SecretKey），与小程序使用同一环境时患者端/医生端数据一致。
- 已准备强度足够的 **JWT_SECRET**。

---

## 2. 获取代码到服务器

任选其一：

**A. Git 克隆（推荐）**

```bash
git clone <你的仓库地址> goutcare
cd goutcare
```

**B. 本地上传**  
将包含 `all/` 与 `goutcare---doctor-portal (1)/` 的项目目录打包上传到服务器后解压。

**目录关系要求**：`all/docker-compose.yml` 通过相对路径引用上一级的 `goutcare---doctor-portal (1)`，**请勿只拷贝 `all` 而不带医生端源码目录**。

---

## 3. 配置环境变量

```bash
cd all
cp .env.example .env
nano .env   # 或使用 vim
```

必填项说明：

| 变量 | 含义 |
|------|------|
| `CLOUDBASE_ENV_ID` | 云开发环境 ID |
| `CLOUDBASE_SECRET_ID` / `CLOUDBASE_SECRET_KEY` | 服务端访问数据库的密钥 |
| `JWT_SECRET` | 签发 Cookie 内 JWT 的密钥 |
| `COOKIE_SECURE` | HTTPS 用 `true`；纯 HTTP 调试可 `false` |
| `HOST_PORT` | 宿主机映射端口，默认 `3000` |

可选：

- **`GEMINI_API_KEY`**：若需要医生端 **AI 聊天** 构建进前端，在**构建镜像前**写入 `.env` 同一变量名；构建完成后该 key 已打进静态资源，运行时改 `.env` 无法替换前端中的 key（需重新 build）。

保存后建议限制权限：

```bash
chmod 600 .env
```

---

## 4. 构建并启动

在 **`all/`** 目录执行：

```bash
docker compose up -d --build
```

首次会安装 npm 依赖并执行 `npm run build`，耗时取决于网络。

查看状态与日志：

```bash
docker compose ps
docker compose logs -f doctor-portal
```

本机探测（在服务器上）：

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/
```

若修改了 `HOST_PORT`，将上面端口改为 `.env` 中的值。

---

## 5. 防火墙与安全组

- **腾讯云控制台**：在轻量服务器「防火墙」中放行 **入站** TCP：`3000`（若直连）或 **80/443**（若使用反向代理）。
- **ufw**（若启用）示例：

```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

公网访问示例：`http://<公网IP>:3000/`（具体端口以 `HOST_PORT` 为准）。

---

## 6. HTTPS 与反向代理（推荐生产）

不建议长期以明文 HTTP 对外提供服务。可在同一台机器安装 **Nginx** 或 **Caddy**，监听 443，将流量反代到 `127.0.0.1:3000`。

- 证书可使用腾讯云 SSL、Let’s Encrypt 等。
- 反代时需正确设置 **`X-Forwarded-Proto: https`**，以便应用判断安全 Cookie（参见医生端 `auth.ts` 中对 `x-forwarded-proto` 的处理）。

仓库内提供 **`nginx.conf.example`** 作为参考片段，请按域名与证书路径修改后纳入站点配置。

---

## 7. 更新发布流程

```bash
cd /path/to/project/all
git pull   # 若使用 git
docker compose up -d --build
```

仅环境变量变更时：

```bash
docker compose up -d
```

---

## 8. 常见问题

| 现象 | 可能原因 |
|------|----------|
| 容器启动后立刻退出 | `.env` 缺失或 CloudBase/JWT 配置错误，查看 `docker compose logs` |
| 浏览器无法登录 / Cookie 无效 | `COOKIE_SECURE=true` 但站点为 HTTP；或反代未传 HTTPS 头 |
| 构建失败 | 服务器无法访问 npm 源；可配置国内镜像或代理 |
| 数据库无数据 | 环境 ID 与小程序不一致，或集合未按 `DATABASE_EDUCATION_SETUP.md` 初始化 |

---

## 9. 与小程序、云函数的关系

- **医生 Web（本部署）**：通过 Node SDK 读写 CloudBase。
- **小程序**：继续使用云函数 + 数据库；**无需**把云函数部署到本 VPS。
- 请保证 **环境 ID、集合名、字段约定** 与文档一致，否则会出现一端有数据、另一端为空的情况。

---

## 10. 回滚

```bash
docker compose down
# 检出上一版本代码或恢复旧镜像标签后
docker compose up -d --build
```
