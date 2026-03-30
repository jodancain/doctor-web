# 项目理解与改动说明

> **[2026-03-26 更新]** 架构已完成从微信云开发到自建服务器的完整迁移，请参阅最新架构说明。

## 项目概览
- **项目类型**：全栈 + 微信小程序的痛风慢病管理系统，面向痛风/高尿酸人群。
- **当前架构**（v2.0）：
  - `miniprogram/`：小程序患者端，所有业务请求通过 HTTP + JWT 到自建服务器，**不再使用微信云函数**
  - `goutcare---doctor-portal (1)/`：医生端 Web（React SPA + Express 全栈），管理患者、科普、问卷、AI 辅助决策
  - `_archived_cloudfunctions/`：已归档的旧微信云函数代码（不再部署）
- **运行方式**：小程序通过 `utils/request.js` 的 `call()` 向 `https://your-domain.com/api/miniprogram` 发起 HTTP 请求，JWT 鉴权，MongoDB 存储
- **API 地址配置**：`miniprogram/utils/request.js` 中 `SERVER_URLS` 对象，按开发/体验/正式版本自动切换

## 代码逻辑理解
- **云函数层**：
  - 使用 `wx-server-sdk` 初始化运行态，集中维护 `uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders` 与 `dietRecords` 集合的读写。
  - `healthDataService` 通过 `src/handler.js` 调度 `services/record-service` 与 `statistics-service`，统一返回 `{ code, msg, data }`。
  - `getHomeSummary` 与 `getDashboardData` 在云端聚合近 7 日数据，减少前端搬运与计算压力，并附带二维码/云存储示例能力。
- **前端层**：
  - 首页、记录页与看板页均通过 `services/records.js`、`services/statistics.js` 调用后端，处理 loading、错误反馈并格式化时间显示。
  - 静态内容页（健康知识、名医会诊）保留示例数据，便于后续接入真实内容源。

## 本次已经完成的改动
1. **云数据库接入**：移除所有本地存储逻辑，统一改为云函数 + 数据库读写，并补全 `_openid`/`timestamp` 字段保证账号隔离。
2. **前端逻辑升级**：各记录页面及首页、数据看板新增云函数调用、异常兜底与成功回调后的刷新流程。
3. **统计迁移上云**：健康看板与数据看板的七日统计由云端计算返回，前端仅负责展示。
4. **文档同步更新**：`GOUTCARE_DEV_SUMMARY.md` 与本文重新梳理架构、目录与数据流向，便于团队快速了解现状。

## 后端 API 路由总览（v2.0）

| 路由前缀 | 文件 | 说明 |
|---|---|---|
| `/api/auth` | `server/routes/auth.ts` | 医生登录/登出/个人信息 |
| `/api/patients` | `server/routes/patients.ts` | 患者 CRUD + 健康记录 + 仪表盘统计 |
| `/api/education` | `server/routes/education.ts` | 科普文章 CRUD |
| `/api/miniprogram` | `server/routes/miniprogram.ts` | 小程序端统一入口（action 路由） |
| `/api/upload/image` | `server/routes/upload.ts` | 聊天图片上传 |
| `/api/ai/chat` | `server/routes/ai.ts` | Gemini CDSS 后端 SSE 代理 |
| `/api/questionnaires` | `server/routes/questionnaires.ts` | 问卷模板 CRUD + 下发 + 回收 |
| `/api/projects` | `server/routes/projects.ts` | 科研项目 CRUD |
| `/uploads` | 静态文件 | 上传图片访问 |

## 上线前必做清单

1. **填写服务器域名**：`miniprogram/utils/request.js` 中 `SERVER_URLS.trial` 和 `SERVER_URLS.release`
2. **配置 `.env` 环境变量**：`GEMINI_API_KEY`、`APP_BASE_URL`、`JWT_SECRET`、`WX_APPID`、`WX_SECRET`、`MONGO_URI`
3. **微信后台配置合法域名**：将服务器域名加入小程序「request 合法域名」和「uploadFile 合法域名」
4. **数据库索引**：为 `_openid`、`timestamp`、`createdAt`、`status` 字段建立索引

## 后续可关注方向
- 问卷系统前端页面对接（`QuestionnaireDesign.tsx` 和 `QuestionnaireRecords.tsx` 改为调用 `/api/questionnaires`）
- 科研项目前端页面对接（`ProjectList.tsx` 和 `ProjectForm.tsx` 改为调用 `/api/projects`）
- 历史聊天中 `cloud://` 格式图片迁移（可选：批量转换为 HTTP 链接存回数据库）
- 图片存储升级到对象存储（腾讯 COS / 阿里 OSS），当前为本地磁盘存储
- 为高频查询字段建立数据库索引，保障大数据量下的性能
