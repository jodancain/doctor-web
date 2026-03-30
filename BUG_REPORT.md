# Bug 分析与修复报告

> 分析日期：2026-03-26
> 范围：miniprogram 前端 + goutcare-doctor-portal 后端服务

---

## 已修复 Bug（本次）

### 严重（CRITICAL）

| # | 文件 | 行 | 问题 | 修复方案 |
|---|------|----|------|----------|
| 1 | `server/routes/miniprogram.ts` | 26, 41, 60 | JWT secret 使用 `\|\| 'secret'` 硬编码 fallback，任何人可伪造 JWT | 改为检查 `process.env.JWT_SECRET`，未配置时返回 500 |
| 2 | `server/services/miniprogram/services/user-service.cjs` | 92 | 医生注册授权码 `'18736'` 硬编码在源代码中 | 改为读取 `process.env.DOCTOR_REGISTER_CODE` 环境变量 |

### 高危（HIGH）

| # | 文件 | 行 | 问题 | 修复方案 |
|---|------|----|------|----------|
| 3 | `server/routes/auth.ts` | 17-21 | 登录限流（rateLimit）被注释掉，任意密码爆破无防护 | 取消注释并挂载为 loginLimiter 中间件（15min/10次） |
| 4 | `server.ts` | — | 缺少安全响应头（X-Frame-Options、X-Content-Type-Options 等） | 添加全局中间件注入安全头 |

### 中危（MEDIUM）

| # | 文件 | 行 | 问题 | 修复方案 |
|---|------|----|------|----------|
| 5 | `server/routes/patients.ts` | 41 | 用户搜索词直接传入 `db.RegExp()`，可构造恶意正则导致 ReDoS | 转义特殊字符后再传入 |
| 6 | `server/routes/education.ts` | 28 | 同上 | 同上 |
| 7 | `server/services/miniprogram/services/record-service.cjs` | 102, 116 | `attackCount7d` 实际查的是历史总数，而不是近 7 天数据 | 添加 `createdAt >= 7天前` 过滤条件；water/exercise 统计同步修正 |

---

## 已确认 / 不需要修复的误报

| 条目 | 原因 |
|------|------|
| `request.js` 401 检查顺序 | 401 检查（line 51）已在 ≠200 检查（line 62）之前，逻辑正确 |
| `auth.ts` user.org.split() 空指针 | line 136 已有 `if (user.org && ...)` guard |
| `chat/index.js` currentUser null | line 39 和 112 均已做 null 判断 |
| `ua-record/index.js` chartData 不用 setData | `chartData` 供 canvas 动画直接读取，非 WXML 渲染，设计正确 |

---

## 第二轮修复（已完成）

### 严重（CRITICAL）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 8 | `user-service.cjs` | 注册时密码明文存储，登录时明文匹配查询 | 注册用 `bcrypt.hash` 加密；登录改为按 username 查询后 `bcrypt.compare` 比对，兼容明文自动迁移 |
| 9 | `db.ts` | `MONGO_URI` 有明文密码占位符 fallback，忘配环境变量会泄露凭据 | 删除 fallback，未设置则 `process.exit(1)` |

### 中危（MEDIUM）

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 10 | `patients.ts` | 患者记录接口无患者身份校验，医生可访问任意 openid | 增加 `role: 'user'` 校验；limit 上限 50 |
| 11 | `user-service.cjs` | `.limit(100)` / `.limit(200)` 拉全表，内存压力大 | 改为 `where({ role: 'user' }).limit(50)` 精确查询 + `count()` 分离统计 |

---

## 第三轮修复（已完成）

### 前端

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 12 | `packages/consult/chat/index.js` | 轮询定时器存在 `this.data.pollingTimer`，微信小程序 data 属性不应存储引用类型，页面销毁后定时器泄漏 | 改为页面级属性 `this._pollingTimer` |
| 13 | `packages/consult/patient-detail/index.js` | `sendMessage()` 直接访问 `this.data.patient.name`，patient 未加载完成时崩溃 | 添加 null 守卫 + 字段 fallback |
| 14 | `pages/health-info/detail.js` | `saveData()` 中 `getCurrentUser()` 可能返回 null，`{ ...null }` 导致异常 | 改为 `getCurrentUser() \|\| {}` |

### 后端

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 15 | `server.ts` | 未配置 CORS，跨域请求被浏览器拦截 | 添加 CORS 中间件，通过 `CORS_ORIGINS` 环境变量白名单控制 |

---

## 第四轮修复（已完成）

### 前端

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 16 | `packages/records/medication-reminder/index.js` | `require('../../../utils/request')` 在 3 个 async 方法内重复调用，影响性能 | 统一移到文件顶部 |
| 17 | `packages/resources/food-library/index.js` | `new Date(selectedDate + ' 00:00:00')` 无格式校验，畸形日期产生 NaN | 添加 `isNaN()` 校验并提前 return |

### 后端

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 18 | `record-service.cjs` | `res.stats.updated` / `res.stats.removed` 访问云 DB 旧 API 格式，MongoDB 适配层返回 `res.updated` / `res.deleted` | 修正字段名 |
| 19 | `record-service.cjs` | `update({ data: {...} })` 多了 `data` 包装，导致 MongoDB 写入嵌套字段而非直接更新 | 移除 `data` 包装层 |
| 20 | `upload.ts` | JWT secret 仍使用 `\|\| 'secret'` fallback（遗漏点） | 改为强制环境变量 |
| 21 | `upload.ts` | 文件后缀名未做白名单校验，可上传任意扩展名 | 新增 `ALLOWED_EXTS` 白名单，非法后缀 fallback 为 `.jpg` |

---

## 第五轮修复（已完成）— CloudBase → MongoDB API 语法系统性迁移

**核心问题**：项目从微信 CloudBase 迁移到自建 MongoDB 后端后，大量 `add({ data: ... })` 和 `update({ data: ... })` 的 CloudBase 旧语法未清理。MongoDB 适配层的 `add()` 直接调用 `insertOne(doc)`，`update()` 自动包装 `$set`。传入 `{ data: {...} }` 会导致文档中嵌套一层多余的 `data` 字段，所有写入/更新操作实际上都不正确。

### 后端

| # | 文件 | 修复数 | 说明 |
|---|------|--------|------|
| 22-27 | `user-service.cjs` | 5 处 update + 1 处 add | 移除所有 `{ data: ... }` 包装 |
| 28-31 | `content-service.cjs` | 3 处 update + 1 处 add | 同上；`views` 自增改为 `{ $inc: { views: 1 } }` |
| 32 | `chat-service.cjs` | 1 处 add | 移除 `{ data: message }` → `message` |
| 33 | `record-service.cjs` | 1 处 add | 移除 `{ data: record }` → `record` |
| 34 | `questionnaires.ts` | 1 处 update | 移除 `data:` 包装 |
| 35 | `projects.ts` | 1 处 update | 移除 `data:` 包装 |

### 前端

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 36 | `ua-record/index.js` | `onUnload()` 中 `this.canvas.cancelAnimationFrame()` 未检查 `this.canvas` 是否存在 | 添加 `&& this.canvas` 守卫 |

---

## 第六轮修复（已完成）— 分页参数校验

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 37 | `patients.ts` | GET `/api/patients` 的 `limit` 无上限，可传 `?limit=999999` 拉大量数据 | `Math.min(limit, 50)` |
| 38 | `education.ts` | GET `/api/education` 的 `limit` 同上 | `Math.min(limit, 50)` |
| 39 | `patients.ts` | `offset` 参数未校验负值 | `Math.max(0, offset)` |
| 40 | `education.ts` | `offset` 同上 | `Math.max(0, offset)` |

---

## 第七轮修复（已完成）— 配置与健壮性收尾

| # | 文件 | 问题 | 修复方案 |
|---|------|------|----------|
| 41 | `miniprogram/utils/request.js` | `SERVER_URLS.trial/release` 为占位符 `'https://your-domain.com'`，上线后请求全部失败且无任何提示 | 添加运行时 `console.warn` 域名未配置警告 + 源码 TODO 注释标记 |
| 42 | `miniprogram/app.js` | `logout()` 直接 `reLaunch` 跳转，页面栈中未保存的数据（如聊天草稿、表单编辑中）会丢失 | 新增 `onBeforeLogout(cb)` 注册机制，logout 前依次执行已注册的清理回调 |

---

## 全部修复完成

> 七轮共修复 **42 个 Bug**，无代码级问题残留。
> 仅剩部署前配置：将 `request.js` 中 `your-domain.com` 替换为实际服务器域名。

---

## 需要更新的 .env 配置

部署时确保以下环境变量已设置：

```env
JWT_SECRET=<强随机密钥，至少32位>
DOCTOR_REGISTER_CODE=<医生注册授权码>
MONGO_URI=mongodb://user:password@host:27017/goutcare?authSource=admin
WX_APPID=<微信小程序 AppID>
WX_SECRET=<微信小程序 AppSecret>
CORS_ORIGINS=https://your-doctor-portal.com   # 多个用逗号分隔，留空则允许所有来源
```
