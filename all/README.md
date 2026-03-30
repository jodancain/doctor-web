# all — 后端集成与部署入口

本目录聚合**医生 Web 管理端**在云服务器上的 Docker 部署方式，源码位于上级目录的 `goutcare---doctor-portal (1)/`。

| 文档 | 说明 |
|------|------|
| [INTEGRATION_DESIGN.md](./INTEGRATION_DESIGN.md) | 集成设计书（架构、边界、安全） |
| [CONFIG_DEPLOY.md](./CONFIG_DEPLOY.md) | 服务器配置与部署步骤 |
| `docker-compose.yml` + `Dockerfile` | 一键构建运行 |

快速开始：复制 `.env.example` 为 `.env` 并填写密钥后，在 `all/` 下执行 `docker compose up -d --build`。
