# 医生端故障排查：登录后所有信息访问不了

## 小程序医生端无法访问患者信息（2026-03-30 回归修复）

### 现象
- 医生端小程序可以登录，但「患者」Tab 为空、患者详情加载失败，常见提示：
  - `暂无患者数据`
  - `Permission denied`
  - `Patient not found`

### 根因
- `server/services/miniprogram/services/user-service.cjs` 在一次性能优化后，`getDoctorPatients` 与 `getDoctorDashboardStats` 退回为 `where({ role: 'user' })` 精确查询。
- 该条件会漏掉历史数据（如 `role` 缺失、`patient` 枚举、大小写不一致），导致医生端可访问患者数量被错误压缩到 0 或很少。

### 修复点
1. `getDoctorPatients`
   - 改为 `role != doctor` 的宽口径查询，并在服务端二次过滤（排除医生、必须有 `_openid`）。
   - 兼容历史患者数据，避免“有数据但列表空白”。
2. `getDoctorDashboardStats`
   - 统计口径与患者列表统一，避免工作台总数与列表不一致。
3. `getDoctorPatientOverview`
   - 增加防护：若传入医生账号 ID，不再当作患者返回，避免越权和脏数据污染。

### 快速验证
1. 小程序医生账号登录后进入「患者」Tab，确认有列表数据。
2. 点击任一患者，确认详情可打开。
3. 对比工作台「患者总数」与实际列表数量，确认口径一致。
4. 若仍为空，检查 `users` 集合：
   - 当前登录微信对应账号是否 `role: 'doctor'`
   - 患者账号是否具备 `_openid`

## 现象
医生端能进入页面，但以下数据/功能全部表现为空或失败：
- 患者列表、患者详情的接口请求失败
- 教育/宣教内容无法正常读取
- 页面可能出现 `Permission denied` 或仅显示 `暂无患者数据`

## 根因（最常见）
后端鉴权使用 `cookies.token`（httpOnly Cookie）。

在旧实现中，登录后设置 cookie 时固定使用：
- `secure: true`
- `sameSite: 'none'`

当部署环境没有严格 HTTPS（或反向代理没有正确透传 `X-Forwarded-Proto`）时，浏览器会拒绝写入 secure cookie，导致后续请求无法携带 token，于是所有需要鉴权的接口都失败。

## 代码修复点（已合并并推送）
1. `server/routes/auth.ts`
   - 登录/退出时根据部署协议动态选择 cookie 参数：
     - 优先读取环境变量 `COOKIE_SECURE`
     - 未设置时根据 `req.secure` / `X-Forwarded-Proto` 判断是否为 HTTPS
   - `secure=false` 时使用 `sameSite='lax'`，避免非 HTTPS 场景下 cookie 被拒写

2. `api.ts`
   - 所有依赖 cookie 鉴权的 `fetch` 请求显式加入 `credentials: 'include'`

3. `App.tsx`
   - 登录成功后不直接放行，而是调用 `api.getMe()` 二次校验 cookie 鉴权是否生效

## 部署/操作建议
1. 如果是 HTTPS 部署：保持 `COOKIE_SECURE=true`（或不设置由系统自动判断）
2. 如果是 HTTP 部署（或反代协议无法正确识别）：
   - 建议设置 `COOKIE_SECURE=false`
   - 同时确保反向代理/网关正确透传 `X-Forwarded-Proto: https`（如果你们希望使用 secure cookie）
3. 重新登录前建议清理浏览器旧 cookie（避免旧的鉴权状态仍被使用）

## 验证步骤
1. 浏览器开发者工具 -> Application -> Cookies
   - 检查是否存在 `token` cookie
2. 浏览器 Network -> 访问 `/api/patients`：
   - 正常应为 200
   - 若看到 401/403，优先检查 cookie 是否写入成功及 `COOKIE_SECURE` 配置

---

## AI 对话“气泡为空/一直转圈”排查

### 现象
- 医生端进入 **AI 辅助决策** 后，发送消息可以成功返回 `200`，但助手气泡为空或仅短暂加载后无正文。

### 根因
- 腾讯元器 SSE 响应是分片传输，历史实现按“单个 chunk 直接按行解析”，会在 JSON 被拆包时丢弃内容。
- 另一个兼容性问题是部分返回结构不一定固定在 `choices[0].delta.content`，导致“有响应但提取不到文本”。

### 修复点
1. `server/services/providers/yuanqi.ts`
   - 新增 SSE 缓冲区，按完整行消费 `data:` 事件，避免分片丢包。
   - 兼容多种字段提取：`delta.content`、`message.content` 等。
   - 对非 `200` 响应透传错误信息，避免静默失败。
2. `server/routes/ai.ts`
   - 当流式阶段未产出任何文本时，自动降级调用一次非流式 `provider.chat()` 兜底。
3. `pages/AIChat.tsx`
   - 前端增加空响应兜底提示，避免出现空白气泡。

### 验证步骤
1. 登录医生端，进入 **AI 辅助决策**，输入测试问题（例如“痛风，eGFR 40，可以用苯溴马隆吗？”）。
2. 浏览器 Network 中确认 `POST /api/ai/chat` 返回 `200` 且响应为 `text/event-stream`。
3. 确认助手消息出现正文而非空白气泡。
4. 若仍异常，执行：
   ```bash
   docker compose logs --tail=200 backend
   ```
   重点检查是否出现 `Yuanqi stream http` 或 `AI chat error`。

### 若日志出现 `Yuanqi ... 400`
- 说明请求已到达元器，但智能体配置不可用（常见是 `YUANQI_APP_KEY` 失效、`assistant_id` 错误或智能体未发布）。
- 处理顺序：
  1. 在元器控制台确认智能体已“发布到 API”。
  2. 重新复制最新 Token，更新服务器 `.env` 的 `YUANQI_APP_KEY`。
  3. 核对 `YUANQI_APP_ID` 与控制台智能体 ID 完全一致。
  4. 执行：
     ```bash
     cd /opt/goutcare
     docker compose up -d --build backend nginx
     ```

