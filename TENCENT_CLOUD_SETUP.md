# 腾讯云 CloudBase (云开发) 配置指南

本指南将指导您如何获取本项目所需的腾讯云 CloudBase 凭证，并将其安全地配置到您的部署环境（如 GCP Secret Manager）中。

## 1. 获取 CloudBase 环境 ID (EnvID)

1. 登录 [腾讯云云开发 CloudBase 控制台](https://console.cloud.tencent.com/tcb)。
2. 在左侧导航栏选择 **“环境” -> “环境总览”**。
3. 找到您为该项目创建的环境（如果没有，请先点击“新建环境”）。
4. 在环境详情页，您会看到一个类似于 `goutcare-prod-1a2b3c4d` 的字符串，这就是您的 **环境 ID (EnvID)**。
5. 将此值记录为 `CLOUDBASE_ENV_ID`。

## 2. 获取 API 密钥 (SecretId 和 SecretKey)

为了让后端的 Node.js SDK 能够以管理员权限访问云数据库，您需要一对腾讯云 API 密钥。

**⚠️ 强烈建议：不要使用主账号的 API 密钥！请使用 CAM (访问管理) 创建一个仅具有 CloudBase 访问权限的子账号。**

### 步骤 A：创建子账号并授权 (推荐)
1. 登录 [腾讯云 CAM (访问管理) 控制台](https://console.cloud.tencent.com/cam)。
2. 在左侧导航栏选择 **“用户” -> “用户列表”**，点击 **“新建用户”**。
3. 选择 **“自定义创建”** -> **“可访问资源并接收消息”**。
4. 填写用户名（如 `goutcare-backend-api`），**访问方式必须勾选“编程访问”**（这会生成 SecretId 和 SecretKey）。
5. 在“设置用户权限”步骤，搜索并勾选以下策略：
   * `QcloudTCBFullAccess` (云开发全读写访问权限)
   * 或者，如果您想更严格，可以自定义策略，仅授予对特定环境的数据库读写权限。
6. 完成创建后，系统会显示该用户的 **SecretId** 和 **SecretKey**。
   * **注意：SecretKey 仅在创建时显示一次，请务必立即复制保存！**

### 步骤 B：获取主账号密钥 (不推荐，仅限测试)
1. 登录 [腾讯云 API 密钥管理](https://console.cloud.tencent.com/cam/capi)。
2. 点击 **“新建密钥”**。
3. 复制生成的 **SecretId** 和 **SecretKey**。

## 3. 数据库集合准备

在 CloudBase 控制台的 **“数据库”** 模块中，确保您已创建以下集合（Collections）。虽然 Node SDK 有时会自动创建，但手动创建并设置正确的索引能提升性能：

1. `users` (用户表，包含医生和患者)
   * 建议索引：`username` (唯一), `role`
2. `uaRecords` (尿酸记录)
   * 建议索引：`_openid`, `timestamp` (-1)
3. `attackRecords` (痛风发作记录)
   * 建议索引：`_openid`, `timestamp` (-1)
4. `waterRecords` (饮水记录)
   * 建议索引：`_openid`, `timestamp` (-1)
5. `exerciseRecords` (运动记录)
   * 建议索引：`_openid`, `timestamp` (-1)
6. `medicationReminders` (用药提醒/记录)
   * 建议索引：`_openid`, `timestamp` (-1)
7. `dietRecords` (饮食记录)
   * 建议索引：`_openid`, `timestamp` (-1)

*注：`_openid` 是微信小程序/公众号用户的唯一标识，如果您不使用微信生态，可以将其视为普通的 `userId` 字段。*

## 4. 配置到 GCP Secret Manager (生产环境)

本项目要求将敏感凭证存储在 GCP Secret Manager 中。

1. 登录 [Google Cloud Console](https://console.cloud.google.com/)。
2. 导航到 **Security -> Secret Manager**。
3. 点击 **CREATE SECRET**。
4. 为以下每个变量创建一个 Secret：
   * 名称：`CLOUDBASE_ENV_ID`，值：您的环境 ID
   * 名称：`CLOUDBASE_SECRET_ID`，值：您的腾讯云 SecretId
   * 名称：`CLOUDBASE_SECRET_KEY`，值：您的腾讯云 SecretKey
   * 名称：`JWT_SECRET`，值：一个随机生成的长字符串（例如使用 `openssl rand -base64 32` 生成）
5. 确保运行您后端服务（如 Cloud Run）的 Service Account 具有 `Secret Manager Secret Accessor` 角色，以便在运行时读取这些机密。

## 5. 本地开发配置

在本地开发时，请在项目根目录创建一个 `.env.local` 文件（该文件已被 `.gitignore` 忽略，不会提交到代码库）：

```env
CLOUDBASE_ENV_ID=您的环境ID
CLOUDBASE_SECRET_ID=您的SecretId
CLOUDBASE_SECRET_KEY=您的SecretKey
JWT_SECRET=local-dev-jwt-secret-key-12345
LOG_LEVEL=debug
```

启动本地开发服务器：
```bash
npm run dev
```
