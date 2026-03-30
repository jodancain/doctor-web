# 微信小程序（含云开发）代码规范

> 适用于「痛风管家」项目的全部代码（小程序、云函数、云数据库/存储、部署流程）。新增成员需在提交代码前阅读本规范。

## 1. 总则
- 全部 JS 均使用统一的 **ESLint + Prettier** 规则（见项目根目录配置），禁止关闭校验。
- 业务核心逻辑尽量沉淀在云函数，前端仅保留视图与基础校验。
- 禁止在前端暴露任何敏感信息（密钥、数据库连接、管理员账号等）。

## 2. 目录与命名
- 前端目录遵循 `miniprogram/{pages,components,utils,services,styles,config}`；页面文件使用 `index.wxml/index.wxss/index.js/index.json` 成组命名。
- 组件与目录统一小写短横线（如 `cloud-tip-modal`）。
- 云函数位于 `cloudfunctions/<functionName>`，函数名使用 camelCase，例如 `healthDataService`。

## 3. 编码约定
- 变量与函数使用 `camelCase`，类使用 `PascalCase`，常量使用 `UPPER_SNAKE_CASE`。
- WXML 使用 `wx:if / wx:elif / wx:else` 控制渲染，`wx:for` 必须指定 `wx:key`。
- WXSS 全局样式拆分 `styles/reset.wxss、var.wxss、mixin.wxss`，组件内样式加前缀防止冲突。
- 页面生命周期：`onLoad` 负责初始化，`onShow` 拉取最新数据，复杂逻辑拆分独立方法。
- `data` 中仅存放与 UI 相关的状态，同步更新使用一次性 `setData`，更新嵌套数据使用路径写法。
- 网络与云函数调用统一封装在 `utils/request.js`，页面/组件通过 `services/*.js` 调用，禁止散落 `wx.cloud.callFunction`。

## 4. 云函数规范
- 入口格式：`const { mainHandler } = require('./src/handler'); exports.main = async (event, context) => mainHandler(event, context);`
- `event` 结构统一为 `{ type, payload }`，返回 ` { code: 0, msg: 'ok', data }`。
- 代码组织：`src/handler.js`（入参校验/调度）、`services/`（业务逻辑）、`models/`（数据库操作）、`utils/`（工具、日志、响应）。
- 关键日志通过 `logger` 输出，避免打印大对象/敏感信息；重要操作需具备幂等性。
- 数据库字段使用 `camelCase`，集合命名使用 `snake_case`，并包含 `createTime/updateTime/isDeleted` 等公共字段。

## 5. 云环境与发布
- 约定环境别名：`dev / test / prod`，前端仅保存 `envId` 与 `cloudFunctionName`。
- 不同环境的第三方地址、开关位通过配置文件或环境变量区分，禁止写死。
- 上传前自检：清理 `console/debugger`、确认云环境 ID、检查合法域名与版本号备注。
- 云函数发布流程：先部署测试环境，验证通过后再部署生产，并记录版本/变更方便回滚。

## 6. 上传功能安全要求
- 前端校验文件类型与大小，上传敏感文件须经云函数二次校验。
- 上传过程需有明确状态（进行中/成功/失败）与重试入口，禁止重复点击导致多次上传。
- 敏感文件需使用受控访问或临时签名，严禁长期公开读写。

更多细节请参阅 `CLOUD_FUNCTION_USAGE.md`、`CLOUD_STORAGE_GUIDE.md` 与 `DEPLOY_GUIDE.md`。
