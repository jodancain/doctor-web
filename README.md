# 痛风管家 · 微信小程序（含云开发）

本项目基于微信小程序 + 云开发（CloudBase）实现「痛风管家」的健康管理体验，包含前端小程序、云函数、数据库/存储规范以及部署指引。工程遵循统一的 ESLint + Prettier 代码风格，并按照微信官方目录规范拆分页面、组件、工具与服务层。

## 目录结构

```
project-root/
├── miniprogram/            # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── config/             # 前端非敏感配置（环境、函数名等）
│   ├── pages/              # 页面（每个页面 index.* 成组出现）
│   ├── components/         # 通用组件（示例：cloud-tip-modal）
│   ├── services/           # 业务接口封装（records、statistics、user）
│   ├── utils/              # 工具方法（format、request、validate）
│   └── styles/             # reset/var/mixin 等全局样式
├── cloudfunctions/
│   └── healthDataService/  # 统一云函数，含 handler/service/model/utils 结构
├── README_代码规范.md      # 团队开发规范
├── 变更.md                 # 版本更新记录
├── 功能介绍.md             # 小程序功能概览
└── 其他部署/云资源说明文档
```

## 云函数简介

- **healthDataService**：统一入口，`src/handler.js` 负责调度，`services/` 目录拆分记录类 CRUD、统计看板、云存储操作；`models/record-model.js` 封装数据库读写；所有响应均返回 `{ code, msg, data }`。
- `config.json` 中声明 `wxacode.get` 权限、运行时资源配置；发布时按 `dev/test/prod` 环境分别部署。

## 开发与调试

1. 安装依赖并执行 ESLint：
   ```bash
   npm install
   npm run lint
   ```
2. 使用微信开发者工具导入项目根目录，确认 `miniprogram/` 与 `cloudfunctions/` 对应路径。
3. 上传云函数：在工具中右键 `cloudfunctions/healthDataService`，选择「上传并部署：云端安装依赖」。

更多细节与操作规范请参见 `README_代码规范.md`、`DEPLOY_GUIDE.md` 与 `CLOUD_FUNCTION_USAGE.md`。

## 代码包审核（代码质量）

微信开发者工具「代码质量」中 **组件按需注入** 等项与 `app.json` 配置相关，说明与排障见根目录 **`小程序代码包审核说明.md`**。

## 医生端（小程序）

医生工作台、患者列表与云函数约定见 **`医生端小程序患者数据说明.md`**。
