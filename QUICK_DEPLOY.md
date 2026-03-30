# 快速部署指南

## 🎯 部署云函数

### 步骤 1 · 找到云函数目录

在微信开发者工具的文件树中定位：
```
痛风管家
  └── cloudfunctions
      └── healthDataService  ← 在这个文件夹上右键
```

### 步骤 2 · 右键 `healthDataService`

> **注意**：不要在 `cloudfunctions` 根目录或其它文件夹上右键，必须选中 `healthDataService`。

### 步骤 3 · 选择部署方式

- **上传并部署：云端安装依赖**（推荐，自动在云端安装 `wx-server-sdk`）
- 或 **上传并部署：全量文件**（本地已安装依赖时可选）

### 步骤 4 · 等待完成

- 工具会显示上传进度
- 成功后会有提示
- 可在云开发控制台 →「云函数」中查看 `healthDataService` 状态

## ⚠️ 常见误区
- ❌ 在 `cloudfunctions` 上右键 → 只会弹出管理菜单，无法上传代码
- ❌ 选择「同步云函数列表」或「新建 Node.js 云函数」→ 不会部署现有代码
- ✅ 正确做法：在 `healthDataService` 文件夹上右键 → 选择上传并部署

## 📋 右键菜单对比

| 位置 | 可用菜单 | 是否用于部署 |
| --- | --- | --- |
| `cloudfunctions/` | 同步云函数列表、新建云函数 | ✖ |
| `cloudfunctions/healthDataService` | 上传并部署、开启本地调试等 | ✔ |

## 🔍 部署验证
1. 打开云开发控制台 →「云函数」→ 确认 `healthDataService` 状态为“正常”。
2. 在小程序端进入“首页 / 数据看板 / 各记录页面”，确认数据能正常读写。

## 🚀 云函数包含的类型
`healthDataService` 支持以下 `type`：
- `getOpenId`、`getMiniProgramCode`、`getFileList`、`deleteCloudFile`
- 记录相关：`listUaRecords`、`addUaRecord`、`listAttackRecords`、`addAttackRecord`、`listWaterRecords`、`addWaterRecord`、`listExerciseRecords`、`addExerciseRecord`、`listMedicationReminders`、`addMedicationReminder`、`listDietRecords`、`addDietRecord`
- 统计相关：`getHomeSummary`、`getDashboardData`

所有请求统一返回 `{ code, msg, data }`，前端封装在 `miniprogram/utils/request.js`。

## 📝 注意事项
1. **环境 ID**：确保 `miniprogram/config/env.js` 中的 `envId` 与开发者工具选择的云环境一致。
2. **数据库集合**：提前在云开发控制台创建 `uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders`、`dietRecords`。
3. **权限设置**：集合请配置“仅创建者可读写”，避免数据泄露。
4. **重新部署**：修改云函数代码后需重新执行步骤 2~4。

## ❓ 故障排查

### 错误：未找到指定的Function

**错误信息**：
```
Error: TencentCloud API error: {
    "Code": "ResourceNotFound.Function",
    "Message": "未找到指定的Function，请创建后再试。"
}
```

**解决步骤**：

1. ✅ **检查 `config.json` 文件**
   - 确认 `cloudfunctions/healthDataService/config.json` 存在
   - 如果不存在，创建该文件：
     ```json
     {
       "permissions": {
         "openapi": ["wxacode.get"]
       },
       "triggers": []
     }
     ```

2. ✅ **检查目录结构**
   - `cloudfunctions/healthDataService/`
     - `index.js` ✅
     - `package.json` ✅
     - `config.json` ✅ **（必须存在）**
     - `src/` 目录 ✅

3. ✅ **检查项目配置**
   - `project.config.json` 中 `cloudfunctionRoot` 应为 `"cloudfunctions/"`
   - 确认已登录微信开发者工具
   - 确认已开通云开发并选择正确环境

4. ✅ **重新部署**
   - 在云开发控制台删除旧函数（如存在）
   - 右键 `cloudfunctions/healthDataService` →「上传并部署：云端安装依赖」

### 其他故障排查

- **网络问题**：检查网络与登录状态
- **环境问题**：确认小程序已开通云开发且选择了正确环境
- **日志查看**：查看云函数日志获取报错详情
- **重新部署**：若部署失败，可重新打包并再次上传
