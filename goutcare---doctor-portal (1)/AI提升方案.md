# 痛风管家 AI 提升方案

> 让元器更聪明、让强 AI 来帮忙、让多个 AI 协同工作

---

## 一、现状与问题

当前痛风管家的 AI 对话（腾讯元器"小风"）存在一个核心缺陷：

**AI 只收到对话历史，完全不知道患者的健康数据。**

```
现状：
用户："我最近尿酸怎么样？"
      ↓
后端：只发送 [{ role: "user", content: "我最近尿酸怎么样？" }]
      ↓
元器："您可以去医院检测一下尿酸值哦~"  ← 通用回答，没有利用数据
```

```
目标：
用户："我最近尿酸怎么样？"
      ↓
后端：先聚合患者健康数据，注入 system message
      [{ role: "system", content: "【患者档案】最近尿酸420μmol/L，趋势上升..." },
       { role: "user", content: "我最近尿酸怎么样？" }]
      ↓
元器："您最近一次尿酸是420μmol/L（3月20日），比上次380高了，呈上升趋势，建议..."  ← 个性化回答
```

---

## 二、方案总览

```
┌─────────────┐     ┌──────────────────────────┐     ┌─────────────┐
│  小程序患者  │────→│   Health Context 服务     │←────│  医生后台    │
│  AI 聊天     │     │   聚合患者健康数据        │     │  AI 对话     │
│  (patient)   │     │   按角色过滤数据范围      │     │  (doctor)    │
└─────────────┘     └──────────────────────────┘     └─────────────┘
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
          ┌───────────┐ ┌───────────┐ ┌──────────────────┐
          │ AI Provider│ │  管理者    │ │  Open API v1     │
          │ Adapter 层 │ │  (admin)   │ │  外部 AI 接入    │
          │┌─────────┐│ │  系统统计  │ │  测试 & 评估     │
          ││ 元器    ││ └───────────┘ │  (external)      │
          ││ Claude  ││               └──────────────────┘
          ││ GPT ... ││                        ▲
          │└─────────┘│               ┌────────┴────────┐
          └───────────┘               │  Cursor / Claude │
                                      │  Code 等终端     │
                                      │  通过 Skill 调用 │
                                      └─────────────────┘
```

### 五大核心能力

| # | 能力 | 说明 |
|---|------|------|
| 1 | **健康上下文注入** | 把患者数据注入 AI 对话，让元器个性化回答 |
| 2 | **角色分级访问** | 患者/医生/管理者/外部AI 看到不同范围的数据 |
| 3 | **Open API** | 标准化 REST API，允许外部 AI 接入 |
| 4 | **AI 交互 & 测试** | 外部强 AI 与元器直接对话、测试、评估 |
| 5 | **多 Provider 框架** | 不绑定元器一家，可接入 Claude/GPT 等多个 AI |

---

## 三、健康上下文服务（核心）

### 3.1 可扩展的采集器架构

采用**插件式采集器（Collector）模式**，每个数据源是一个独立采集器：

```typescript
// server/services/health-context.ts

interface HealthDataCollector {
  name: string;           // 'profile' | 'uricAcid' | 'attacks' | ...
  priority: number;       // 输出排序（越小越靠前）
  accessLevel: Role[];    // 哪些角色可以看到
  collect(patientOpenid: string): Promise<CollectorResult>;
}

interface CollectorResult {
  text: string;           // 自然语言摘要（给 AI 注入用）
  json: object;           // 结构化数据（给 Open API 返回用）
}
```

注册采集器（可动态增加）：

```typescript
const collectors: HealthDataCollector[] = [
  new ProfileCollector(),        // 基本信息
  new UricAcidCollector(),       // 尿酸值
  new AttackCollector(),         // 发作记录
  new MedicationCollector(),     // 用药
  new WaterCollector(),          // 饮水
  new ExerciseCollector(),       // 运动
  new DietCollector(),           // 饮食
  new QuestionnaireCollector(),  // 问卷
  // ─── 后续可轻松增加 ───
  // new LabTestCollector(),     // 化验单
  // new ComorbidityCollector(), // 合并症
  // new FollowUpCollector(),    // 随访记录
  // new ServerStatsCollector(), // 服务器统计（仅管理者/外部AI）
  // new AIMetricsCollector(),   // AI 调用统计
];
```

**要新增数据源？** 只需三步：
1. 创建一个实现 `HealthDataCollector` 接口的类
2. 在 `collectors` 数组中注册
3. 完成 — 无需改动其他任何代码

### 3.2 内置采集器清单

| 采集器 | 数据集合 | 查询范围 | 可见角色 | 输出内容 |
|--------|----------|----------|----------|----------|
| Profile | `users` | 当前患者 | 全部 | 性别、年龄、BMI、确诊年限 |
| UricAcid | `uaRecords` | 最近5条 | 全部 | 最新值 + 趋势（上升/下降/波动） |
| Attack | `attackRecords` | 近90天 | 全部 | 次数、关节、诱因、严重度 |
| Medication | `medicationReminders` | 活跃药物 | 全部 | 药名、剂量、频次、依从性 |
| Water | `waterRecords` | 近7天 | 全部 | 日均量 vs 目标 |
| Exercise | `exerciseRecords` | 近7天 | 全部 | 日均时长 |
| Diet | `dietRecords` | 近7天 | 全部 | 高/中/低嘌呤分布 |
| Questionnaire | `questionnaireRecords` | 最近1份 | 医生+管理者+外部 | 答案摘要 |
| ChatSummary | `messages` | 近7天 | 外部 | 对话摘要（不含原文） |
| ServerStats | 系统指标 | 实时 | 管理者+外部 | CPU/内存/调用量/错误 |
| AIMetrics | `aiEvaluations` | 全部 | 管理者+外部 | 评估统计 |

---

## 四、角色分级数据访问

### 4.1 四级角色体系

| 角色 | 标识方式 | 数据范围 | 典型使用者 |
|------|----------|----------|------------|
| **patient** | 小程序 JWT openid | 仅自己的数据 | 患者在 AI 聊天时 |
| **doctor** | 后台 cookie JWT | 自己所有患者的数据 | 医生讨论某患者时 |
| **admin** | 后台 admin role | 全部患者 + 系统统计 | 管理员查看运营状况 |
| **external** | API Key | 全部数据（最全） | Cursor/Claude Code 等 |

```typescript
enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  EXTERNAL = 'external'
}
```

### 4.2 各角色看到的数据示例

#### 患者视角（仅自己）

```
【我的健康档案】
基本信息：男，45岁，BMI 26.3（超重），确诊3年
最近尿酸：420 μmol/L（03-20）→ 380（03-15）→ 450（03-01），趋势：波动
近90天发作：2次
当前用药：非布司他 40mg 每日一次
近7天饮水：日均1800ml（目标2000ml）
近7天运动：日均25分钟
```

#### 医生视角（某患者的详细档案）

```
【患者健康档案 - 张三】
基本信息：男，45岁，BMI 26.3（超重），确诊3年
最近尿酸：420 μmol/L（03-20）→ 380（03-15）→ 450（03-01），趋势：波动
近90天发作：2次（左足大拇趾 中度 03-10，右踝 轻度 02-15）
常见诱因：饮酒、海鲜
当前用药：非布司他 40mg 每日一次
依从性：近7天用药记录4/7（偏低）
近7天饮水：日均1800ml（目标2000ml）
近7天运动：日均25分钟
近7天饮食：低嘌呤12次 中嘌呤5次 高嘌呤2次
问卷：最近一次 GAQ-20 评分 62/100（03-15）
```

#### 管理者视角（系统级）

```
【系统运营概况】
注册用户：128人（患者120，医生8）
活跃用户（7天）：45人
AI 调用量（7天）：326次，日均47次
AI 平均响应时间：1.2s
服务器状态：正常，CPU 23%，内存 58%
数据库大小：156MB
最近错误：2次 AI 超时（03-26）
```

#### 外部 AI 视角（最全 JSON）

```json
{
  "patient": {
    "id": "ext-uuid-xxx",
    "gender": "男", "age": 45, "bmi": 26.3, "diagnosisYears": 3
  },
  "uricAcid": {
    "latest": { "value": 420, "date": "2026-03-20", "unit": "μmol/L" },
    "history": [
      { "value": 420, "date": "2026-03-20" },
      { "value": 380, "date": "2026-03-15" },
      { "value": 450, "date": "2026-03-01" }
    ],
    "trend": "fluctuating"
  },
  "attacks": {
    "last90Days": [
      { "date": "2026-03-10", "joint": "左足第一跖趾关节", "severity": "moderate", "triggers": ["饮酒"] },
      { "date": "2026-02-15", "joint": "右踝关节", "severity": "mild", "triggers": ["海鲜"] }
    ]
  },
  "medications": {
    "active": [{ "name": "非布司他", "dosage": "40mg", "frequency": "每日一次" }],
    "compliance7d": { "taken": 4, "total": 7, "rate": 0.57 }
  },
  "lifestyle": {
    "water7d": { "dailyAvgMl": 1800, "targetMl": 2000 },
    "exercise7d": { "dailyAvgMin": 25 },
    "diet7d": { "lowPurine": 12, "medPurine": 5, "highPurine": 2 }
  },
  "questionnaires": { "recent": [{ "name": "GAQ-20", "score": 62, "date": "2026-03-15" }] },
  "chatHistory": { "summary": "近7天3次对话，主要咨询饮食和用药问题" },
  "systemStats": { "totalUsers": 128, "activeUsers7d": 45, "aiCalls7d": 326 },
  "aiMetrics": { "avgScore": 3.5, "totalEvaluations": 42 }
}
```

### 4.3 核心函数签名

```typescript
async function getHealthContext(
  patientOpenid: string,
  role: Role,
  options?: {
    format: 'text' | 'json';       // text=给AI注入, json=给Open API返回
    collectors?: string[];          // 可选，指定只运行某些采集器
  }
): Promise<string | object>
```

---

## 五、改造现有 AI 调用

### 5.1 患者端（ai-service.cjs）

```javascript
// 改造后的 askAI — 自动注入患者健康档案
async function askAI(context) {
  const { history, openid } = context;

  // 聚合患者健康数据（patient 角色，仅自己的数据）
  const healthContext = await getHealthContext(openid, 'patient', { format: 'text' });

  const messages = [
    { role: "system", content: healthContext },   // ← 注入健康档案
    ...history
  ];

  // 发送给元器（通过 Provider 层）
  const provider = providerRegistry.getDefault();
  const response = await provider.chat(messages, { userId: openid });
  return success({ reply: response.content });
}
```

### 5.2 医生端（ai.ts）

```javascript
// 医生讨论某患者时，注入该患者的详细档案
router.post('/chat', requireAuth, async (req, res) => {
  const { message, history, patientOpenid } = req.body;  // ← 新增 patientOpenid

  let systemMessage = '';
  if (patientOpenid) {
    systemMessage = await getHealthContext(patientOpenid, 'doctor', { format: 'text' });
  }

  const messages = [
    ...(systemMessage ? [{ role: 'system', content: systemMessage }] : []),
    ...history.map(m => ({ role: m.role, content: m.content || m.text || '' })),
    { role: 'user', content: message }
  ];

  // SSE 流式输出...
});
```

---

## 六、Open API — 外部 AI 接入

### 6.1 认证方式

```
Authorization: Bearer <OPEN_API_KEY>
```

API Key 存储在 MongoDB `apiKeys` 集合中，bcrypt 哈希。每个 key 有权限列表和限流。

### 6.2 端点一览

| 端点 | 方法 | 用途 |
|------|------|------|
| **数据接口** | | |
| `/api/open/v1/patients` | GET | 患者列表（脱敏，使用 externalId） |
| `/api/open/v1/patients/:id/health-context` | GET | 患者健康档案（结构化 JSON） |
| **AI 交互接口** | | |
| `/api/open/v1/ai/test` | POST | 单轮测试：发问题给元器，返回回答+上下文 |
| `/api/open/v1/ai/conversation` | POST | 多轮对话：外部 AI 与元器连续交互 |
| `/api/open/v1/ai/compare` | POST | 多 AI 对比：同一问题发给多个 AI |
| `/api/open/v1/ai/batch-test` | POST | 批量测试：一次跑多个测试用例 |
| **评估接口** | | |
| `/api/open/v1/ai/evaluate` | POST | 提交单条评估分数 |
| `/api/open/v1/ai/review-session` | POST | 提交完整对话评审（含改进建议） |
| `/api/open/v1/ai/evaluations` | GET | 查看历史评估结果 |
| **知识 & 测试集** | | |
| `/api/open/v1/ai/knowledge` | GET | 获取元器能力描述和知识摘要 |
| `/api/open/v1/ai/test-suites` | GET/POST | 查看/创建测试集 |

### 6.3 患者健康档案接口

```
GET /api/open/v1/patients/:patientId/health-context
Authorization: Bearer <API_KEY>
```

返回完整结构化 JSON（见 4.2 外部 AI 视角示例）。

### 6.4 患者列表接口

```
GET /api/open/v1/patients?limit=20&offset=0
```

返回脱敏患者列表（使用 UUID 作为 externalId，不暴露微信 openid）：

```json
{
  "total": 120,
  "patients": [
    {
      "id": "ext-uuid-001",
      "nickName": "张*",
      "gender": "男",
      "age": 45,
      "status": "Risk",
      "latestUa": 420,
      "lastActive": "2026-03-26"
    }
  ]
}
```

---

## 七、外部 AI ↔ 元器 交互方案

### 7.1 交互流程总览

```
┌──────────────────┐                    ┌──────────────┐                    ┌──────────────┐
│   外部强 AI      │   ① 发起对话       │  GoutCare    │   ② 转发给元器     │  腾讯元器    │
│  (Claude/GPT)    │ ──────────────────→ │  Open API    │ ──────────────────→ │  "小风"      │
│                  │   ⑤ 收到回复+数据   │  Server      │   ③ 元器回复       │              │
│                  │ ←────────────────── │              │ ←────────────────── │              │
└──────────────────┘                    └──────────────┘                    └──────────────┘
                                               │
                                      ④ 记录对话 + 评分
                                               ▼
                                        ┌──────────────┐
                                        │  MongoDB     │
                                        │  评估数据库   │
                                        └──────────────┘
```

### 7.2 模式一：单轮测试（强 AI 出题，元器回答）

外部 AI 扮演"考官"，向元器发送模拟患者问题。

```
POST /api/open/v1/ai/test
{
  "patientId": "ext-uuid-xxx",
  "question": "我尿酸420还在吃海鲜，怎么办？",
  "includeContext": true,
  "provider": "yuanqi",
  "persona": "patient"
}
```

返回：

```json
{
  "testId": "test-uuid-xxx",
  "question": "我尿酸420还在吃海鲜，怎么办？",
  "yuanqiResponse": "您好！根据您目前的情况，尿酸420μmol/L已超过正常值360...",
  "injectedContext": "【患者健康档案】男，45岁，BMI 26.3...",
  "healthData": { "uricAcid": { "latest": { "value": 420 } }, "..." : "..." },
  "provider": "yuanqi",
  "model": "yuanqi/kGvJbghrVRcy",
  "latencyMs": 1200,
  "timestamp": "2026-03-27T10:00:00Z"
}
```

### 7.3 模式二：多轮对话（强 AI 模拟患者连续追问）

```
POST /api/open/v1/ai/conversation

# 第 1 轮：开始新对话
{
  "patientId": "ext-uuid-xxx",
  "conversationId": null,
  "message": "医生你好，我最近脚趾又开始疼了",
  "includeContext": true
}

# 返回：
{
  "conversationId": "conv-uuid-xxx",
  "turn": 1,
  "userMessage": "医生你好，我最近脚趾又开始疼了",
  "yuanqiResponse": "您好！看到您的记录，您上次发作是在3月10日...",
  "fullHistory": [
    { "role": "system", "content": "【患者健康档案】..." },
    { "role": "user", "content": "医生你好..." },
    { "role": "assistant", "content": "您好！看到..." }
  ]
}

# 第 2 轮：继续对话
{
  "patientId": "ext-uuid-xxx",
  "conversationId": "conv-uuid-xxx",
  "message": "那我现在应该吃什么药？之前的非布司他还要继续吗？"
}

# 第 3 轮...第 N 轮：继续追问
```

服务器自动管理对话历史。外部 AI 可以连续追问 5-10 轮，测试元器的：
- 上下文连贯性
- 是否记住之前的对话内容
- 是否正确引用患者用药记录
- 对追问的应对能力

对话存储在 `aiConversations` 集合，7天 TTL 自动过期。

### 7.4 模式三：强 AI 指导元器（提示词优化闭环）

完成多轮对话后，外部 AI 提交完整评审报告：

```
POST /api/open/v1/ai/review-session
{
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
      {
        "turn": 2,
        "type": "missed_data",
        "description": "患者有非布司他用药记录，但元器未主动提及",
        "severity": "medium"
      },
      {
        "turn": 3,
        "type": "generic_response",
        "description": "给出了通用饮食建议，未结合患者近7天高嘌呤饮食记录",
        "severity": "high"
      }
    ],
    "promptSuggestions": [
      "在系统提示词中增加：'当患者有用药记录时，必须主动提醒用药情况和注意事项'",
      "增加指令：'回答饮食问题时，必须引用患者近期的饮食记录数据'"
    ],
    "suggestedResponses": {
      "turn_2": "根据您的记录，您目前在服用非布司他40mg每日一次。脚趾疼痛可能是...",
      "turn_3": "我注意到您过去一周有2次高嘌呤饮食记录，建议..."
    }
  }
}
```

**评审数据的用途：**

| 字段 | 如何使用 |
|------|----------|
| `promptSuggestions` | 管理员在元器控制台调整系统提示词 |
| `suggestedResponses` | 作为元器的 few-shot 示例添加到知识库 |
| `issues` | 汇总生成《元器优化报告》，指导下一轮迭代 |
| `dimensions` | 跟踪各维度分数趋势，量化改进效果 |

### 7.5 模式四：批量自动测试

```
POST /api/open/v1/ai/batch-test
{
  "patientId": "ext-uuid-xxx",
  "testSuite": "standard",
  "questions": [
    {
      "id": "q001",
      "question": "我尿酸高可以喝啤酒吗？",
      "expectedTopics": ["酒精", "嘌呤", "尿酸升高"],
      "mustMention": ["患者当前尿酸值"],
      "mustNotMention": ["具体药物推荐（非医嘱）"]
    },
    {
      "id": "q002",
      "question": "痛风发作了怎么快速止痛？",
      "expectedTopics": ["急性期处理", "冰敷", "就医"],
      "mustMention": ["患者当前用药"],
      "mustNotMention": []
    }
  ]
}
```

返回：

```json
{
  "batchId": "batch-uuid-xxx",
  "total": 2,
  "results": [
    {
      "id": "q001",
      "question": "我尿酸高可以喝啤酒吗？",
      "yuanqiResponse": "...",
      "latencyMs": 1100,
      "autoCheck": {
        "mentionedExpectedTopics": ["酒精", "嘌呤", "尿酸升高"],
        "missedTopics": [],
        "mentionedRequired": ["患者当前尿酸值"],
        "missedRequired": [],
        "mentionedForbidden": [],
        "passedAllChecks": true
      }
    }
  ],
  "summary": {
    "passRate": "100%",
    "avgLatencyMs": 1150
  }
}
```

### 7.6 预定义测试集

| 测试集 | 场景数 | 覆盖范围 |
|--------|--------|----------|
| `standard` | 20 | 基础痛风知识问答 |
| `emergency` | 10 | 急性发作处理 |
| `medication` | 15 | 用药咨询 |
| `diet` | 15 | 饮食指导 |
| `lifestyle` | 10 | 生活方式建议 |
| `personalization` | 10 | 需要引用患者数据才能答好的问题 |

外部 AI 也可以创建自定义测试集：

```
POST /api/open/v1/ai/test-suites
{
  "name": "claude-generated-edge-cases",
  "description": "Claude 自动生成的边缘场景测试",
  "questions": [ ... ]
}
```

---

## 八、元器知识查询接口

让外部 AI 了解元器"知道什么"——能力边界、知识范围、配置状态。

```
GET /api/open/v1/ai/knowledge
```

```json
{
  "agent": {
    "name": "小风",
    "id": "kGvJbghrVRcy",
    "provider": "yuanqi",
    "description": "痛风/高尿酸血症健康管理助手"
  },
  "capabilities": [
    "痛风基础知识问答",
    "饮食嘌呤含量查询",
    "用药常识解答",
    "生活方式建议",
    "发作急性期指导"
  ],
  "limitations": [
    "不能开处方",
    "不能替代医生诊断",
    "不了解患者实时检查报告（需通过上下文注入）"
  ],
  "systemPromptSummary": "角色：痛风健康管理AI助手；风格：专业但亲切；约束：不诊断不开药，建议就医场景明确提醒",
  "contextInjection": {
    "enabled": true,
    "dataFields": ["profile", "uricAcid", "attacks", "medications", "lifestyle", "diet", "water", "exercise"]
  },
  "availableProviders": ["yuanqi"],
  "lastUpdated": "2026-03-27"
}
```

外部 AI 用途：
- 了解元器能力范围，针对性设计测试
- 判断回答失误是"知识缺失"还是"提示词不当"
- 对比不同 Provider 的能力声明

---

## 九、多 AI Provider 框架

### 9.1 Provider 统一接口

```typescript
// server/services/ai-provider.ts

interface AIProvider {
  name: string;              // 'yuanqi' | 'claude' | 'openai'

  // 单轮对话（非流式）
  chat(messages: Message[], options: ChatOptions): Promise<ChatResponse>;

  // 流式对话（SSE）
  chatStream(messages: Message[], options: ChatOptions): AsyncIterable<string>;

  // 是否可用（检查 API Key 是否配置）
  isAvailable(): boolean;
}

interface ChatOptions {
  userId?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: { promptTokens: number; completionTokens: number };
}
```

### 9.2 Provider 注册中心

```typescript
// server/services/ai-provider-registry.ts

class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private defaultProvider = 'yuanqi';

  register(provider: AIProvider): void;
  get(name: string): AIProvider;
  getDefault(): AIProvider;
  setDefault(name: string): void;
  listAvailable(): string[];
}

// 初始化
const registry = new AIProviderRegistry();
registry.register(new YuanqiProvider());    // 元器（主力）
// registry.register(new ClaudeProvider()); // Claude（预留）
// registry.register(new OpenAIProvider()); // GPT（预留）
```

### 9.3 已实现 / 预留 Provider

| Provider | 文件 | 状态 | 配置 |
|----------|------|------|------|
| `yuanqi` | `server/services/providers/yuanqi.ts` | ✅ 主力 | `YUANQI_APP_ID` + `YUANQI_APP_KEY` |
| `claude` | `server/services/providers/claude.ts` | 🔲 预留 | `CLAUDE_API_KEY` |
| `openai` | `server/services/providers/openai.ts` | 🔲 预留 | `OPENAI_API_KEY` |

### 9.4 多 Provider 对比测试

同一个问题发给多个 AI，对比回答质量：

```
POST /api/open/v1/ai/compare
{
  "patientId": "ext-uuid-xxx",
  "question": "痛风发作期间可以运动吗？",
  "providers": ["yuanqi", "claude"],
  "includeContext": true
}
```

```json
{
  "question": "痛风发作期间可以运动吗？",
  "responses": {
    "yuanqi": {
      "content": "痛风急性发作期建议休息，避免剧烈运动...",
      "latencyMs": 1200
    },
    "claude": {
      "content": "根据您的记录，您目前正处于发作期（3月10日开始），建议完全休息...",
      "latencyMs": 800
    }
  },
  "injectedContext": "【患者健康档案】..."
}
```

核心价值：
- 用强 AI 的回答作为"标准答案"评估弱 AI
- 找出元器回答的差距和改进方向
- 根据场景选择最佳 Provider

### 9.5 环境变量配置

```env
# 默认 AI 提供商
AI_DEFAULT_PROVIDER=yuanqi

# 元器配置
YUANQI_APP_ID=kGvJbghrVRcy
YUANQI_APP_KEY=<从元器控制台获取>

# Claude（预留，启用时填入）
CLAUDE_API_KEY=

# OpenAI（预留，启用时填入）
OPENAI_API_KEY=

# Open API 开关
OPEN_API_ENABLED=true
```

---

## 十、安全设计

| 措施 | 说明 |
|------|------|
| **API Key 管理** | bcrypt 哈希存储，每个 key 有权限列表 `["patients:read", "ai:test", "ai:evaluate"]` |
| **患者隐私** | 外部 API 使用 `externalId`（UUID），永不暴露微信 openid |
| **限流** | 60 次/分钟/key，防止滥用 |
| **审计日志** | 所有 Open API 请求记录到 `apiAuditLog`（endpoint, patientId, timestamp, ip） |
| **只读原则** | 外部 API 不能修改患者数据，只能读取 + 写评估结果 |
| **功能开关** | `.env` 中 `OPEN_API_ENABLED=true` 控制是否启用整个 Open API |
| **HTTPS** | Nginx 强制 HTTPS，所有 `/api/open/` 请求加密传输 |

---

## 十一、新增 MongoDB 集合

| 集合 | 用途 | 关键字段 |
|------|------|----------|
| `apiKeys` | API 密钥管理 | `keyHash`, `name`, `permissions[]`, `active`, `rateLimit` |
| `apiPatientMapping` | externalId ↔ _openid | `externalId`(UUID), `_openid`, `apiKeyId` |
| `aiEvaluations` | 评估结果 | `testId`, `scores{}`, `feedback`, `evaluator`, `timestamp` |
| `aiConversations` | 多轮对话历史 | `conversationId`, `messages[]`, `patientId`, TTL 7天 |
| `aiTestSuites` | 测试集 | `name`, `questions[]`, `createdBy` |
| `aiBatchResults` | 批量测试结果 | `batchId`, `results[]`, `summary` |
| `apiAuditLog` | 审计日志 | `apiKeyId`, `endpoint`, `patientId`, `ip`, `timestamp` |

---

## 十二、文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `server/services/health-context.ts` | 健康上下文聚合服务（采集器模式） |
| `server/services/ai-provider.ts` | AI Provider 统一接口定义 |
| `server/services/ai-provider-registry.ts` | Provider 注册中心 |
| `server/services/providers/yuanqi.ts` | 元器 Provider 实现 |
| `server/services/providers/claude.ts` | Claude Provider（预留骨架） |
| `server/services/providers/openai.ts` | OpenAI Provider（预留骨架） |
| `server/routes/open-api.ts` | Open API 所有路由 |
| `server/middleware/api-key-auth.ts` | API Key 认证中间件 |
| `goutcare-ai-skill.md` | Claude Code / Cursor Skill 文件 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `server/services/miniprogram/services/ai-service.cjs` | 注入健康上下文 + 使用 Provider |
| `server/routes/ai.ts` | 医生端注入上下文 + patientOpenid 参数 |
| `server.ts` | 注册 `/api/open` 路由 |
| `.env.example` | 添加 Provider 配置 + `OPEN_API_ENABLED` |

---

## 十三、实施路线

### 第一阶段：让元器立刻变聪明

1. 创建 `health-context.ts`（采集器架构 + 角色过滤）
2. 改造 `ai-service.cjs` 注入患者上下文
3. 测试：发送"我最近尿酸怎么样"，确认元器引用具体数值

### 第二阶段：医生端上下文

4. 改造 `ai.ts` 支持 `patientOpenid` 参数
5. 测试医生端 AI 讨论患者时的个性化回答

### 第三阶段：Open API 基础

6. 创建 API Key 认证中间件 + 患者 ID 映射
7. 创建 `/patients` + `/health-context` 数据端点
8. 创建 `/ai/test` 单轮测试端点
9. 创建 `/ai/evaluate` 评估端点

### 第四阶段：AI 双向交互

10. 创建 `/ai/conversation` 多轮对话端点 + 对话存储
11. 创建 `/ai/review-session` 评审端点
12. 创建 `/ai/batch-test` 批量测试端点

### 第五阶段：多 AI Provider 框架

13. 创建 Provider 接口 + Registry
14. 将元器封装为 YuanqiProvider
15. 预留 Claude / OpenAI Provider 骨架
16. 实现 `/ai/compare` 对比端点

### 第六阶段：Skill 文档 + 测试集

17. 内置标准测试集（6套共80个场景）
18. 创建 `/ai/knowledge` 知识查询端点
19. 编写 `goutcare-ai-skill.md`

---

## 十四、完整工作流示例

### 流程：用 Claude Code 测试并改进元器

```
步骤 1：了解元器
$ curl /api/open/v1/ai/knowledge
→ 了解元器的能力、限制、配置

步骤 2：选择患者
$ curl /api/open/v1/patients?limit=5
→ 获取患者列表，选择一个测试对象

步骤 3：查看患者数据
$ curl /api/open/v1/patients/ext-uuid-001/health-context
→ 获取该患者完整健康档案

步骤 4：单轮测试
$ curl -X POST /api/open/v1/ai/test \
  -d '{"patientId":"ext-uuid-001", "question":"我可以吃海鲜吗？", "includeContext":true}'
→ 获取元器回答 + 注入的上下文

步骤 5：多轮深度测试
$ curl -X POST /api/open/v1/ai/conversation \
  -d '{"patientId":"ext-uuid-001", "message":"最近脚趾疼", "includeContext":true}'
$ curl -X POST /api/open/v1/ai/conversation \
  -d '{"conversationId":"conv-xxx", "message":"还要继续吃非布司他吗？"}'
$ curl -X POST /api/open/v1/ai/conversation \
  -d '{"conversationId":"conv-xxx", "message":"饮食上有什么要注意的？"}'
→ 三轮追问，测试上下文连贯性

步骤 6：评审对话
$ curl -X POST /api/open/v1/ai/review-session \
  -d '{"conversationId":"conv-xxx", "review":{...scores, issues, suggestions...}}'
→ 提交评分 + 改进建议

步骤 7：批量回归测试
$ curl -X POST /api/open/v1/ai/batch-test \
  -d '{"patientId":"ext-uuid-001", "testSuite":"standard"}'
→ 跑完 20 个标准测试，确认 passRate

步骤 8：对比测试（可选，需启用多 Provider）
$ curl -X POST /api/open/v1/ai/compare \
  -d '{"patientId":"ext-uuid-001", "question":"...", "providers":["yuanqi","claude"]}'
→ 对比元器和 Claude 的回答，找差距
```

### 改进闭环

```
评审结果 → promptSuggestions → 管理员调整元器提示词
                              → 重新跑批量测试
                              → 对比分数变化
                              → 持续优化
```

---

*文档版本：v1.0 | 更新日期：2026-03-27*
