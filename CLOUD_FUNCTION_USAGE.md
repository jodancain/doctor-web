# 云函数与云数据库使用指南

本指南说明《痛风管家》小程序当前使用的统一云函数 `healthDataService` 以及对应的云数据库集合，帮助你快速了解数据流转、部署步骤与常见问题排查方法。

## 云函数概览

所有业务页面都通过 `miniprogram/utils/request.js` 间接调用 `wx.cloud.callFunction`：
- 请求结构：`{ name: 'healthDataService', data: { type, payload } }`
- 响应结构：`{ code: 0, msg: 'ok', data }`，`code !== 0` 代表失败

| type 值 | 功能说明 | 主要返回数据 | 用户绑定 |
| --- | --- | --- | --- |
| `registerUser` / `loginUser` | 注册 / 登录账号，**自动绑定openid** | `users` 集合中的用户信息 | ✅ 自动绑定 |
| `getRecords` / `addRecord` | 查询 / 新增记录（通用接口） | 记录数组 / `{ _id, timestamp }` | ✅ 按openid隔离 |
| `listUaRecords` / `addUaRecord` | 查询 / 新增尿酸记录（已废弃，使用getRecords/addRecord） | 记录数组 / `{ timestamp }` | ✅ 按openid隔离 |
| `listAttackRecords` / `addAttackRecord` | 查询 / 新增发作记录 | 同上 | ✅ 按openid隔离 |
| `listWaterRecords` / `addWaterRecord` | 查询 / 新增饮水记录 | 同上 | ✅ 按openid隔离 |
| `listExerciseRecords` / `addExerciseRecord` | 查询 / 新增运动记录 | 同上 | ✅ 按openid隔离 |
| `listMedicationReminders` / `addMedicationReminder` | 查询 / 新增用药提醒 | 同上 | ✅ 按openid隔离 |
| `listDietRecords` / `addDietRecord` | 查询 / 新增饮食记录 | 同上 | ✅ 按openid隔离 |
| `getHomeSummary` | 首页健康看板 | 最近尿酸、近 7 日发作/饮水/运动/用药统计 | ✅ 按openid统计 |
| `getDashboardData` | 数据看板 | 7 日 summary、饮食颜色分布、每日时间线 | ✅ 按openid统计 |
| `searchPatientsForDoctor` | 医生搜索患者 | 患者用户数组 | ✅ 支持医生查看 |
| `bindDoctorPatient` | 医生绑定患者 | `{ success: true }` | ✅ 建立绑定关系 |
| `listDoctorPatients` | 获取医生绑定的患者列表 | 患者用户数组 | ✅ 按绑定关系查询 |
| `getDoctorPatientOverview` | 医生查看患者数据概览 | 患者健康数据汇总 | ✅ 支持跨用户查看 |
| `listDoctors` | 医生列表 | 医生用户数组（`users` 集合） | - |
| `listInbox` | 医生/患者消息列表 | `items: [{ user, lastMessage }]` | ✅ 按openid隔离 |
| `fetchConversation` / `sendMessage` | 查询会话 / 发送消息 | 消息数组 / 单条消息 | ✅ 按openid隔离 |
| `getOpenId`、`getMiniProgramCode`、`getFileList`、`deleteCloudFile` | 账号信息 / 二维码 / 云存储示例 | 见函数说明 | - |

> 📌 **重要特性**:
> - 所有查询接口自动按 `_openid` 隔离数据，确保用户只能访问自己的数据
> - `timestamp` 统一转换为毫秒数
> - 用户注册和登录时自动绑定 `openid`，确保数据正确关联
> - 支持医生查看绑定患者的数据（通过 `getDoctorPatientOverview`）
> - 所有数据上传、读取、分析功能都已实现并经过优化
> - **所有健康记录数据均从云数据库读取，已删除所有假数据和模拟数据**
> - **历史记录页面已清空所有模拟数据，改为从数据库实时读取**

## 数据库集合结构

**详细配置请参考 `DATABASE_COLLECTIONS.md` 文档。**

请在云开发控制台创建以下集合并设置相应权限：

| 集合名称 | 字段说明 | 权限设置 |
| --- | --- | --- |
| `users` | `username`、`password`、`nickName`、`role`、`openid`、`_openid`、`boundPatients`、`boundDoctors`、`createdAt`、`lastLoginAt` | 所有用户可读，仅创建者可写 |
| `messages` | `fromOpenid`、`toOpenid`、`content`、`msgType`、`createdAt` | 仅创建者及管理端可读写 |
| `uaRecords` | `value: number`（µmol/L）、`timestamp: number`、`_openid` | 仅创建者可读写 |
| `attackRecords` | `joint: string`、`severity: '轻'|'中'|'重'`、`trigger?: string`、`timestamp`、`_openid` | 仅创建者可读写 |
| `waterRecords` | `volume: number`（mL）、`timestamp`、`_openid` | 仅创建者可读写 |
| `exerciseRecords` | `type: string`、`duration: number`（分钟）、`timestamp`、`_openid` | 仅创建者可读写 |
| `medicationReminders` | `name: string`、`dosage: string`、`time: string`（HH:mm）、`timestamp`、`_openid` | 仅创建者可读写 |
| `dietRecords` | `name: string`、`color: 'green'|'yellow'|'red'`、`timestamp`、`_openid` | 仅创建者可读写 |

**重要说明**:
- 所有记录类集合使用 `_openid` 字段进行数据隔离（微信云数据库自动管理）
- `users` 集合同时支持 `_openid` 和自定义 `openid` 字段（用于兼容）
- 用户注册和登录时会自动绑定 `openid`，确保数据正确关联

## 部署与调用步骤

1. **初始化云环境**：`miniprogram/config/env.js` 中配置 `envId` 与 `cloudFunctionName`，`app.js` 会在启动时执行 `wx.cloud.init`。
2. **上传云函数**：在微信开发者工具右键 `cloudfunctions/healthDataService` →「上传并部署：云端安装依赖」。
3. **创建集合**：在云开发控制台依次创建上表中的集合并配置权限。
4. **前端调用示例**：
   ```js
   const { fetchUaRecords } = require('../../services/records');
   const records = await fetchUaRecords();
   ```
   如果需要直接调用：
   ```js
   // 获取记录
   wx.cloud.callFunction({
     name: 'healthDataService',
     data: { 
       action: 'getRecords',
       type: 'ua',
       limit: 20
     },
   }).then(({ result }) => {
     if (result.code === 0) {
       this.setData({ records: result.data });
     } else {
       wx.showToast({ title: result.msg || '加载失败', icon: 'none' });
     }
   });

   // 保存记录
   wx.cloud.callFunction({
     name: 'healthDataService',
     data: {
       action: 'addRecord',
       type: 'ua',
       data: {
         value: 420,
         timestamp: Date.now()
       }
     },
   }).then(({ result }) => {
     if (result.code === 0) {
       wx.showToast({ title: '保存成功', icon: 'success' });
     } else {
       wx.showToast({ title: result.msg || '保存失败', icon: 'none' });
     }
   });
   ```

## 常见问题排查

- **code ≠ 0**：查看云函数日志（云开发控制台 → 云函数 → 日志）确认是参数缺失、集合不存在还是权限不足。
- **首页/看板无数据**：`getHomeSummary` 与 `getDashboardData` 仅统计最近 7 天数据，确保有满足时间范围的记录。
- **不同账号看不到彼此数据**：所有查询按 `_openid` 隔离，属于正常表现；调试多账号时需分别录入数据。
- **二维码/存储示例报错**：`getMiniProgramCode` 依赖 `wxacode.get` 权限，请在 `config.json` 保持授权并确保账号有该权限。
- **尿酸记录保存后数据库无数据**：
  - 检查云函数是否正确部署
  - 检查用户是否已登录（`openid` 是否存在）
  - 查看云函数日志确认是否有错误
  - 确认 `uaRecords` 集合已创建且权限正确
  - 确认数据格式正确（`value` 字段为数字，`timestamp` 为时间戳）

## 下一步扩展建议

- 为高频查询的集合添加 `timestamp` 索引，提高列表性能。
- 将 `getFileList` 替换为真实的文件记录查询或增加安全下载逻辑。
- 结合定时触发器，定期统计用户 7 日/30 日报告并推送订阅消息。
