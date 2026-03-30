# 数据库配置说明

## 1. 集合概览

| 集合名称 | 用途 | 推荐权限 |
| --- | --- | --- |
| `users` | 存储用户信息（医生/患者） | 所有用户可读，仅创建者可写 |
| `messages` | 存储聊天消息 | 仅创建者及管理端可读写（需配合云函数或自定义规则） |
| `uaRecords` | 尿酸记录 | 仅创建者可读写 |
| `attackRecords` | 痛风发作记录 | 仅创建者可读写 |
| `waterRecords` | 饮水记录 | 仅创建者可读写 |
| `exerciseRecords` | 运动记录 | 仅创建者可读写 |
| `medicationReminders` | 用药提醒 | 仅创建者可读写 |
| `dietRecords` | 饮食记录 | 仅创建者可读写 |

## 2. 索引配置 (Performance)

为了保障聊天和列表查询的性能，**必须**在云开发控制台为以下集合创建索引。

### `messages` 集合

用于加速 `fetchConversation` (获取特定会话) 和 `listInbox` (获取最近消息列表)。

| 索引名称 | 索引字段 | 排序 | 唯一性 |
| --- | --- | --- | --- |
| `idx_from_to_created` | `fromOpenid`, `toOpenid`, `createdAt` | 升序, 升序, 降序 | 否 |
| `idx_to_created` | `toOpenid`, `createdAt` | 升序, 降序 | 否 |
| `idx_from_created` | `fromOpenid`, `createdAt` | 升序, 降序 | 否 |

> **说明**：`listInbox` 使用了聚合查询 (`aggregate`)，在数据量较大时，若无索引会非常慢甚至超时。

### `users` 集合

用于加速登录查找和医生列表查询。

| 索引名称 | 索引字段 | 排序 | 唯一性 |
| --- | --- | --- | --- |
| `idx_openid` | `_openid` | 升序 | 是 (Unique) |
| `idx_username` | `username` | 升序 | 是 (Unique) |
| `idx_role` | `role` | 升序 | 否 |

### 记录类集合 (`uaRecords`, `waterRecords` 等)

用于加速首页数据汇总 (`getHomeSummary`)。

| 索引名称 | 索引字段 | 排序 | 唯一性 |
| --- | --- | --- | --- |
| `idx_openid_created` | `_openid`, `createdAt` | 升序, 降序 | 否 |

## 3. 数据权限设置

1.  进入云开发控制台 -> 数据库 -> 选择集合 -> 数据权限。
2.  **`users` 集合**：建议选择 **“所有用户可读，仅创建者可写”**。
    *   原因：患者需要读取医生列表，医生需要读取患者基本信息。
3.  **其他集合**：建议选择 **“仅创建者可读写”**。
    *   原因：保护用户隐私。跨用户的读写（如医生查看患者记录）建议通过云函数 `healthDataService` 进行，利用云函数的“服务端”权限绕过前端限制。

## 4. 环境配置

确保 `miniprogram/app.js` 中的环境配置正确：

```javascript
this.globalData = {
  // 填写你的云环境ID，或留空使用默认环境
  env: "", 
};
```
