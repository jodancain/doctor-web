# 04 — API 接口文档

## 一、通用约定

### 基础地址
```
生产环境: https://yundongyl.cn/api
开发环境: http://localhost:3000/api
```

### 认证方式

| 场景 | 认证方式 | Header |
|------|---------|--------|
| 小程序端 | JWT Bearer Token | `Authorization: Bearer <token>` |
| 医生端 | JWT HttpOnly Cookie | Cookie 自动携带 |
| Open API | API Key | `Authorization: Bearer <api_key>` |

### 通用响应格式

**小程序端**（通过 /api/miniprogram）：
```json
{ "code": 0, "msg": "success", "data": { ... } }
{ "code": 500, "msg": "错误信息" }
```

**医生端**（REST 风格）：
```json
{ "success": true, "data": { ... } }
{ "error": "错误信息" }
```

---

## 二、小程序统一接口 `/api/miniprogram`

> **重要**：小程序所有请求都走这一个端点，通过 `action` 字段区分操作。

**请求格式**：
```
POST /api/miniprogram
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "action": "操作名",
  ...其他参数
}
```

### 2.1 用户服务 (user-service.cjs)

| action | 说明 | 参数 | 返回 |
|--------|------|------|------|
| `login` | 微信登录 | `code` (wx.login 获取) | `{ token, userInfo }` |
| `register` | 注册患者 | `userInfo: { nickName, avatarUrl }` | `{ token, userInfo }` |
| `getUserInfo` | 获取当前用户信息 | - | `{ userInfo }` |
| `updateUserInfo` | 更新用户信息 | `userInfo: { ... }` | `{ updated: 1 }` |
| `saveHealthInfo` | 保存健康档案 | `healthInfo: { age, gender, ... }` | `{ updated: 1 }` |
| `getHealthInfo` | 获取健康档案 | - | `{ healthInfo }` |

### 2.2 记录服务 (record-service.cjs)

| action | 说明 | 参数 | 返回 |
|--------|------|------|------|
| `addUARecord` | 添加尿酸记录 | `value, timestamp, note, fasting` | `{ _id }` |
| `getUARecords` | 获取尿酸记录列表 | `page?, pageSize?` | `{ records: [...] }` |
| `deleteUARecord` | 删除尿酸记录 | `id` | `{ deleted: 1 }` |
| `addAttackRecord` | 添加发作记录 | `joints, painLevel, duration, ...` | `{ _id }` |
| `getAttackRecords` | 获取发作记录 | `page?, pageSize?` | `{ records: [...] }` |
| `deleteAttackRecord` | 删除发作记录 | `id` | `{ deleted: 1 }` |
| `addWaterRecord` | 添加饮水记录 | `amount, timestamp, time` | `{ _id }` |
| `getWaterRecords` | 获取饮水记录 | `page?, pageSize?` | `{ records: [...] }` |
| `addExerciseRecord` | 添加运动记录 | `type, duration, intensity, ...` | `{ _id }` |
| `getExerciseRecords` | 获取运动记录 | `page?, pageSize?` | `{ records: [...] }` |
| `addMedicationReminder` | 添加用药提醒 | `name, dosage, frequency, time` | `{ _id }` |
| `getMedicationReminders` | 获取用药提醒 | `status?` | `{ reminders: [...] }` |
| `updateMedicationReminder` | 更新用药提醒 | `id, ...fields` | `{ updated: 1 }` |
| `getHealthStats` | 获取7天健康统计 | - | `{ uaCount, waterTotal, ... }` |

### 2.3 AI 服务 (ai-service.cjs)

| action | 说明 | 参数 | 返回 |
|--------|------|------|------|
| `askAI` | AI 问答（非流式） | `history: [{ role, content }]` | `{ reply: "..." }` |

### 2.4 内容服务 (content-service.cjs)

| action | 说明 | 参数 | 返回 |
|--------|------|------|------|
| `getArticleList` | 文章列表 | `category?, page?, pageSize?` | `{ articles: [...] }` |
| `getArticleDetail` | 文章详情 | `id` | `{ article }` |
| `getFoodList` | 食物库列表 | `keyword?, category?` | `{ foods: [...] }` |

### 2.5 咨询服务 (consult-service.cjs)

| action | 说明 | 参数 | 返回 |
|--------|------|------|------|
| `sendMessage` | 发送消息 | `doctorId, content, type, clientMsgId` | `{ _id }` |
| `getMessages` | 获取聊天记录 | `doctorId, page?, pageSize?` | `{ messages: [...] }` |
| `getDoctorList` | 获取医生列表 | - | `{ doctors: [...] }` |

---

## 三、医生端认证接口 `/api/auth`

| 方法 | 路径 | 说明 | 请求体 | 限流 |
|------|------|------|--------|------|
| POST | `/api/auth/login` | 医生登录 | `{ username, password }` | 15分钟/10次 |
| POST | `/api/auth/register` | 医生注册 | `{ username, password, name, hospital, registerCode }` | - |
| GET | `/api/auth/profile` | 获取当前医生信息 | - | - |
| POST | `/api/auth/logout` | 退出登录 | - | - |

> `registerCode` 必须等于环境变量 `DOCTOR_REGISTER_CODE`（默认 18736）

---

## 四、患者管理接口 `/api/patients`

> 所有接口需要医生端 JWT 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/patients` | 患者列表（支持 `?search=&page=&pageSize=`） |
| GET | `/api/patients/:id` | 患者详情 |
| GET | `/api/patients/:id/records` | 患者健康记录（尿酸/发作/饮水/运动） |
| GET | `/api/patients/:id/dashboard` | 患者数据仪表盘 |
| PUT | `/api/patients/:id` | 更新患者信息 |

---

## 五、内容管理接口 `/api/education`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/education` | 文章列表（`?category=&search=&page=&pageSize=`） |
| GET | `/api/education/:id` | 文章详情 |
| POST | `/api/education` | 创建文章 |
| PUT | `/api/education/:id` | 更新文章 |
| DELETE | `/api/education/:id` | 删除文章 |

---

## 六、AI 接口 `/api/ai`

| 方法 | 路径 | 说明 | 特殊 |
|------|------|------|------|
| POST | `/api/ai/chat` | 医生端 AI 对话 | **SSE 流式响应** |

**请求**：
```json
{
  "message": "这个患者尿酸持续偏高怎么办？",
  "history": [
    { "role": "user", "content": "上一条消息" },
    { "role": "assistant", "content": "AI回复" }
  ]
}
```

**SSE 响应**：
```
data: {"choices":[{"delta":{"content":"根据"}}]}

data: {"choices":[{"delta":{"content":"患者的"}}]}

data: [DONE]
```

---

## 七、Open API `/api/open-api`

> 需要 API Key 认证 + `OPEN_API_ENABLED=true`

### 7.1 患者数据（脱敏）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/open-api/v1/patients` | 患者列表（脱敏） |
| GET | `/api/open-api/v1/patients/:id/context` | 患者健康上下文 |

### 7.2 AI 测试与评估

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/open-api/v1/ai/test` | 向元器发送测试问题 |
| POST | `/api/open-api/v1/ai/evaluate` | 批量评估 AI 回答质量 |
| POST | `/api/open-api/v1/ai/knowledge` | 上传知识到元器 |

### 7.3 API Key 权限

API Key 存储在 MongoDB `apiKeys` 集合中，`permissions` 数组控制访问范围：
- `patients:read` — 读取患者数据
- `ai:test` — AI 测试
- `ai:evaluate` — AI 评估
- `ai:knowledge` — 知识管理

---

## 八、文件上传 `/api/upload`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/image` | 上传图片 |

**请求**：`multipart/form-data`，字段名 `image`
**允许格式**：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
**大小限制**：5MB
**返回**：`{ url: "/uploads/xxx.jpg" }`

---

## 九、其他接口

### 问卷管理 `/api/questionnaires`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/questionnaires` | 问卷列表 |
| POST | `/api/questionnaires` | 创建问卷 |
| PUT | `/api/questionnaires/:id` | 更新问卷 |
| DELETE | `/api/questionnaires/:id` | 删除问卷 |
| GET | `/api/questionnaires/:id/responses` | 问卷回答列表 |

### 科研项目 `/api/projects`
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 项目列表 |
| POST | `/api/projects` | 创建项目 |
| PUT | `/api/projects/:id` | 更新项目 |
| DELETE | `/api/projects/:id` | 删除项目 |

### 健康检查
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查（Docker healthcheck 使用） |
