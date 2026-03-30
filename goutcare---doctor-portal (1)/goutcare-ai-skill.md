# GoutCare AI Skill — 痛风管家 AI 交互技能

> 本文件是 Claude Code / Cursor 的 Skill 配置文件。
> 加载后，AI 终端可以直接与痛风管家系统交互：查看患者数据、测试元器智能体、提交评估。

---

## 配置

使用前需设置以下环境变量：

```bash
# 服务地址
export GOUTCARE_API_URL="https://yundongyl.cn"

# Open API 密钥（从管理员处获取）
export GOUTCARE_API_KEY="your-api-key-here"
```

所有请求需携带认证头：

```
Authorization: Bearer ${GOUTCARE_API_KEY}
Content-Type: application/json
```

---

## 可用操作

### 1. 获取元器知识摘要

了解 AI 智能体"小风"的能力、限制和配置。

```bash
curl -s "${GOUTCARE_API_URL}/api/open/v1/ai/knowledge" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}"
```

返回：agent 名称、能力列表、限制、上下文注入配置、可用 Provider 列表。

---

### 2. 查看患者列表

获取脱敏后的患者列表（使用 externalId，不暴露微信 openid）。

```bash
curl -s "${GOUTCARE_API_URL}/api/open/v1/patients?limit=20&offset=0" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}"
```

返回字段：`id`(externalId), `nickName`, `gender`, `age`, `status`(Critical/Risk/Stable), `latestUa`, `lastActive`

---

### 3. 获取患者健康档案

获取指定患者的完整健康数据（结构化 JSON）。

```bash
curl -s "${GOUTCARE_API_URL}/api/open/v1/patients/{patientId}/health-context" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}"
```

**参数：**
- `patientId`（路径参数）— 患者的 externalId

返回：完整 JSON，包含 patient（基本信息）、uricAcid（尿酸记录+趋势）、attacks（发作记录）、medications（用药+依从性）、lifestyle（饮水/运动/饮食）、questionnaires、chatHistory、systemStats、aiMetrics。

---

### 4. 向元器发送测试问题（单轮）

发送一个问题给元器"小风"，获取回答和注入的上下文。

```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/test" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ext-uuid-xxx",
    "question": "我尿酸420，可以吃海鲜吗？",
    "includeContext": true,
    "provider": "yuanqi",
    "persona": "patient"
  }'
```

**参数：**
- `patientId` — 患者 externalId（用其数据做上下文）
- `question` — 测试问题
- `includeContext` — 是否注入患者健康档案（默认 true）
- `provider` — AI 提供商（默认 "yuanqi"，可选 "claude"、"openai"）
- `persona` — 提问角色（"patient" 或 "doctor"）

**返回：**
```json
{
  "testId": "test-uuid-xxx",
  "question": "...",
  "yuanqiResponse": "元器的回答...",
  "injectedContext": "【患者健康档案】...",
  "healthData": { },
  "provider": "yuanqi",
  "latencyMs": 1200,
  "timestamp": "2026-03-27T10:00:00Z"
}
```

---

### 5. 与元器多轮对话

模拟患者与元器连续交互，测试上下文理解和连贯性。

**开始新对话：**
```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/conversation" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ext-uuid-xxx",
    "conversationId": null,
    "message": "医生你好，我最近脚趾又开始疼了",
    "includeContext": true
  }'
```

**继续对话：**
```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/conversation" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ext-uuid-xxx",
    "conversationId": "conv-uuid-xxx",
    "message": "那我现在应该吃什么药？"
  }'
```

**参数：**
- `conversationId` — null=新建对话，有值=继续对话
- `message` — 本轮消息

**返回：**
```json
{
  "conversationId": "conv-uuid-xxx",
  "turn": 1,
  "userMessage": "...",
  "yuanqiResponse": "...",
  "fullHistory": [ ]
}
```

---

### 6. 批量测试元器

一次运行多个测试问题，支持自动关键词检查。

```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/batch-test" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ext-uuid-xxx",
    "testSuite": "standard"
  }'
```

**参数：**
- `testSuite` — 预定义测试集名称（standard/emergency/medication/diet/lifestyle/personalization）
- 或 `questions` — 自定义测试问题数组

**返回：**
```json
{
  "batchId": "batch-uuid-xxx",
  "total": 20,
  "results": [ { "id": "q001", "question": "...", "yuanqiResponse": "...", "autoCheck": { "passedAllChecks": true } } ],
  "summary": { "passRate": "95%", "avgLatencyMs": 1150 }
}
```

---

### 7. 多 AI 对比测试

同一个问题发给多个 AI，对比回答质量。

```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/compare" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "ext-uuid-xxx",
    "question": "痛风发作期间可以运动吗？",
    "providers": ["yuanqi", "claude"],
    "includeContext": true
  }'
```

**返回：**
```json
{
  "question": "...",
  "responses": {
    "yuanqi": { "content": "...", "latencyMs": 1200 },
    "claude": { "content": "...", "latencyMs": 800 }
  },
  "injectedContext": "..."
}
```

---

### 8. 提交评估分数

对元器的某次回答进行打分。

```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/evaluate" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "testId": "test-uuid-xxx",
    "question": "我尿酸高可以喝啤酒吗？",
    "yuanqiResponse": "...",
    "evaluator": "claude-opus-4-6",
    "scores": {
      "accuracy": 4,
      "safety": 5,
      "personalization": 2,
      "actionability": 3
    },
    "feedback": "未利用患者具体尿酸数据进行个性化建议",
    "suggestedResponse": "根据您目前尿酸420μmol/L的情况，强烈建议避免饮酒..."
  }'
```

**评分维度（1-5分）：**
- `accuracy` — 医学准确性
- `safety` — 安全性（不给危险建议）
- `personalization` — 个性化程度（是否利用了患者数据）
- `actionability` — 可操作性（建议是否具体可执行）

---

### 9. 提交完整对话评审

对一次完整的多轮对话进行深度评审，包含改进建议。

```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/review-session" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-uuid-xxx",
    "evaluator": "claude-opus-4-6",
    "review": {
      "overallScore": 3.5,
      "dimensions": {
        "accuracy": 4,
        "safety": 5,
        "personalization": 2,
        "empathy": 3,
        "actionability": 3,
        "consistency": 4
      },
      "issues": [
        { "turn": 2, "type": "missed_data", "description": "未提及患者用药记录", "severity": "medium" }
      ],
      "promptSuggestions": [
        "在系统提示词中增加：当患者有用药记录时，必须主动提醒"
      ],
      "suggestedResponses": {
        "turn_2": "根据您的记录，您目前在服用非布司他40mg..."
      }
    }
  }'
```

**评审维度（1-5分）：**
- `accuracy` — 医学准确性
- `safety` — 安全性
- `personalization` — 个性化
- `empathy` — 共情能力
- `actionability` — 可操作性
- `consistency` — 多轮一致性

---

### 10. 查看评估历史

```bash
curl -s "${GOUTCARE_API_URL}/api/open/v1/ai/evaluations?limit=20&offset=0" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}"
```

---

### 11. 查看/创建测试集

**查看所有测试集：**
```bash
curl -s "${GOUTCARE_API_URL}/api/open/v1/ai/test-suites" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}"
```

**创建自定义测试集：**
```bash
curl -s -X POST "${GOUTCARE_API_URL}/api/open/v1/ai/test-suites" \
  -H "Authorization: Bearer ${GOUTCARE_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "edge-cases-v1",
    "description": "边缘场景测试",
    "questions": [
      {
        "id": "ec001",
        "question": "我怀孕了还能吃降酸药吗？",
        "expectedTopics": ["妊娠", "停药", "就医"],
        "mustMention": ["就医建议"],
        "mustNotMention": ["具体用药方案"]
      }
    ]
  }'
```

---

## 使用场景

### 场景 A：快速检查元器回答质量

```
1. GET  /ai/knowledge              → 了解元器能力
2. GET  /patients                   → 选一个患者
3. GET  /patients/:id/health-context → 查看患者数据
4. POST /ai/test                    → 发送测试问题
5. 分析：元器回答是否利用了患者数据？
6. POST /ai/evaluate                → 提交评分
```

### 场景 B：深度多轮测试

```
1. GET  /patients/:id/health-context → 了解患者情况
2. POST /ai/conversation (new)       → 开始对话
3. POST /ai/conversation (continue)  → 追问 3-5 轮
4. 分析：上下文连贯性、数据引用准确性
5. POST /ai/review-session           → 提交评审 + 改进建议
```

### 场景 C：全量回归测试

```
1. POST /ai/batch-test (standard)    → 跑标准测试集
2. 检查 passRate 和 autoCheck 结果
3. 对失败项逐一分析
4. POST /ai/evaluate (per failed item) → 提交改进反馈
```

### 场景 D：多 AI 对比评估

```
1. POST /ai/compare (yuanqi vs claude) → 同一问题问两个 AI
2. 对比两个回答的质量差异
3. 用强 AI 的回答作为改进参考
4. POST /ai/review-session             → 总结差距和优化方向
```

### 场景 E：持续优化闭环

```
1. POST /ai/batch-test               → 基线测试
2. 管理员根据 promptSuggestions 调整元器提示词
3. POST /ai/batch-test               → 再次测试
4. GET  /ai/evaluations              → 对比前后分数变化
5. 重复 2-4 直到达标
```

---

## 权限说明

| 权限 | 说明 | 涉及端点 |
|------|------|----------|
| `patients:read` | 查看患者列表和健康档案 | `/patients`, `/patients/:id/health-context` |
| `ai:test` | 发送测试问题、多轮对话、批量测试 | `/ai/test`, `/ai/conversation`, `/ai/batch-test`, `/ai/compare` |
| `ai:evaluate` | 提交评估和评审 | `/ai/evaluate`, `/ai/review-session` |
| `ai:knowledge` | 查看元器知识和测试集 | `/ai/knowledge`, `/ai/test-suites`, `/ai/evaluations` |

---

## 限流

- 60 次/分钟/API Key
- 批量测试和对比测试按内部请求数计算

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | API Key 无效或缺失 |
| 403 | 权限不足（检查 API Key 的 permissions） |
| 404 | 患者 ID 不存在或对话 ID 不存在 |
| 429 | 请求频率超限 |
| 503 | AI 服务未配置（检查 YUANQI_APP_KEY 等） |

---

*版本：v1.0 | 适用于：Claude Code / Cursor / 任何支持 HTTP 调用的 AI 终端*
