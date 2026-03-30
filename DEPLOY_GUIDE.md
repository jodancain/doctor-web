# 云函数部署指南

## 重要说明
⚠️ **无需在控制台新建云函数，直接部署仓库中的 `healthDataService` 即可。**

## 部署步骤

### 方法一：微信开发者工具（推荐）
1. **打开项目**：启动微信开发者工具，打开当前小程序并确认已登录、已开通云开发。
2. **定位云函数**：在文件树中找到 `cloudfunctions/healthDataService` 目录。
3. **右键部署**：在目录上右键 → 选择「上传并部署：云端安装依赖」。
4. **等待完成**：查看输出日志，部署成功后会提示，可在云开发控制台的「云函数」页面确认状态。

### 方法二：云开发控制台（备用）
若因网络原因无法在开发者工具中部署，可在云开发控制台 →「云函数」→「本地上传」中选择 `cloudfunctions/healthDataService`，但需手动安装依赖与配置，效率较低。

## 云函数配置
- **名称**：`healthDataService`
- **入口文件**：`index.js`（转发到 `src/handler.js`）
- **依赖**：`wx-server-sdk ~2.4.0`
- **权限**：`config.json` 已声明 `wxacode.get`

## 功能清单
`healthDataService` 统一承载以下类型：
- 账号与存储：`getOpenId`、`getMiniProgramCode`、`getFileList`、`deleteCloudFile`
- 记录 CRUD：`list/add` + `Ua/Attack/Water/Exercise/Medication/Diet`
- 统计聚合：`getHomeSummary`、`getDashboardData`

所有响应均返回 `{ code, msg, data }`。

## 部署后验证
1. 在云开发控制台确认函数状态正常。
2. 在小程序端进入首页、数据看板、记录页面，确保数据读写正常。
3. 查看云函数日志（控制台 → 云函数 → 日志）确认无异常。

## 常见问题

### 1. 部署失败：未找到指定的Function

**错误信息**：
```
Error: TencentCloud API error: {
    "Response": {
        "Error": {
            "Code": "ResourceNotFound.Function",
            "Message": "未找到指定的Function，请创建后再试。"
        }
    }
}
```

**解决方案**：

1. **检查 `config.json` 文件是否存在**：
   - 确认 `cloudfunctions/healthDataService/config.json` 文件存在
   - 如果不存在，创建该文件，内容如下：
     ```json
     {
       "permissions": {
         "openapi": [
           "wxacode.get"
         ]
       },
       "triggers": []
     }
     ```

2. **检查云函数目录结构**：
   - 确认 `cloudfunctions/healthDataService/` 目录下包含：
     - `index.js`（入口文件）
     - `package.json`（依赖配置）
     - `config.json`（权限配置）**← 必须存在**
     - `src/` 目录（源代码）

3. **检查项目配置**：
   - 确认 `project.config.json` 中 `cloudfunctionRoot` 设置为 `"cloudfunctions/"`
   - 确认已正确登录微信开发者工具
   - 确认已开通云开发并选择了正确的环境

4. **重新部署**：
   - 删除云开发控制台中的旧函数（如果存在）
   - 在微信开发者工具中右键 `cloudfunctions/healthDataService`
   - 选择「上传并部署：云端安装依赖」

### 2. 其他常见问题

- **部署失败（网络问题）**：检查网络/登录状态、确认已开通云开发、核对环境 ID，必要时重新上传。
- **调用报错**：确认函数已部署最新代码，检查 `miniprogram/app.js` 中的 `env` 配置。
- **权限不足**：确保数据库集合权限为「仅创建者可读写」，并保持 `config.json` 中的 openapi 权限。
- **集合缺失**：提前在数据库中创建 `uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders`、`dietRecords`。

## 更新云函数
如需更新：
1. 修改代码并保存。
2. 在微信开发者工具中右键 `cloudfunctions/healthDataService`。
3. 再次执行「上传并部署：云端安装依赖」。

## 目录结构
```
cloudfunctions/healthDataService/
├── index.js
├── package.json
├── config.json
└── src/
    ├── handler.js
    ├── services/
    ├── models/
    └── utils/
```

## 后续计划
- 可根据业务拆分更多服务（如消息推送、报告生成）。
- 结合云函数定时触发器，定期统计 30 日趋势或发送订阅消息。
