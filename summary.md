# 痛风管家项目总结

## 仓库定位
- 本仓库实现了“痛风管家”微信小程序及配套云函数，面向痛风/高尿酸用户，围绕尿酸、发作、饮食/饮水/运动、用药、健康资讯等场景提供记录与展示能力。
- 小程序端依托微信云开发（`wx.cloud`）通过 `miniprogram/utils/request.js` 调用 `cloudfunctions/healthDataService`，与云数据库的 `uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders`、`dietRecords` 等集合进行读写。

## 目录结构速览
- `miniprogram/`：前端主体，包括 10 个业务页面（文件统一 `index.*` 命名）、`services/` 业务接口、`utils/format.js` 日期工具、`utils/request.js` 云函数封装以及 `styles/` 全局样式；`app.json` 打开云开发能力并声明页面路由。
- `cloudfunctions/healthDataService/`：入口 `index.js` 调用 `src/handler.js`，内部按 `handler/services/models/utils` 拆分，负责记录类 CRUD、首页/数据看板统计以及二维码/云存储示例；`package.json` 依赖 `wx-server-sdk`。
- 根目录提供部署、数据库配置与产品说明文档（如 `PROJECT_OVERVIEW.md`、`GOUTCARE_DEV_SUMMARY.md`），便于团队理解和部署。

## 云函数设计要点
- 通过 `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })` 与 `cloud.database()` 建立运行环境，使用 `_openid` 隔离用户数据，并在 `normalizeTimestamp` 中兼容多种时间格式。
- `listRecords`、`addRecord` 作为通用工具，分别完成带时间戳倒序查询与新增记录逻辑，所有业务函数（`addUaRecord`、`addAttackRecord`、`addWaterRecord` 等）只需传入集合名与校验过的 payload。
- `getHomeSummary` 并发查询最近一次尿酸值与近 7 日发作/饮水/运动/用药数据，返回 `{ latestUaValue, attackCount7d, waterTotal7d, exerciseMinutes7d, medicationCount }`，供首页展示。
- `getDashboardData` 针对近 7 日生成 `summary`、饮食颜色分布 `dietBreakdown` 以及逐日 `timeline`，减少前端统计压力；同时预留 `getMiniProgramCode`、`getFileList`、`deleteCloudFile` 等示例能力扩展。

## 小程序端页面逻辑
- **首页 `pages/home/index`**：使用 `QUICK_LINKS` 提供 10 个场景入口，在 `loadSummary` 中通过 `services/statistics` 调用 `getHomeSummary` 并格式化最新尿酸日期、7 日统计以及用药提醒数量。
- **记录类页面**：`pages/ua-record`、`pages/attack-record`、`pages/water-record`、`pages/exercise-record`、`pages/medication-reminder`、`pages/food-library` 等均在 `onShow` 时通过 `services/records` 刷新云数据库记录，新增记录后通过 toast/重新加载保证状态一致，其中 `attack-record` 示例展示了下拉选项、表单输入与调用 `addAttackRecord` 后的刷新流程。
- **数据看板 `pages/dashboard/index`**：在 `buildDashboard` 中调用 `getDashboardData`，将返回的 summary、饮食颜色统计和 timeline 转化为页面可视化数据（含 `formatDate` 格式化最近尿酸时间）。
- **静态内容页**：`pages/doctor-list`、`pages/health-info` 保留示例数据，方便后续接入真实资讯或医生资源。

## 工具与样式
- `miniprogram/utils/format.js` 提供 `formatDate`、`formatTime`、`getLastNDaysRange`，`utils/request.js`、`utils/validate.js` 则统一封装云函数调用与基础校验，避免重复代码。
- `miniprogram/config/ui-assets.js` 统一维护 CDN 线上 UI 资源（如关闭按钮 icon），前端组件通过数据绑定直接消费，避免携带本地静态文件。
- 全局 `app.wxss` 搭配页面内局部样式，营造绿色/白色/浅灰的健康主题卡片 UI。

## 后续可拓展方向（摘录）
- 数据库层面可继续增加索引、分页与订阅消息提醒。
- 前端可接入 ECharts 呈现尿酸趋势、饮食颜色比例与饮水/运动折线，并将静态内容页对接真实数据源。
