# 医生端故障排查：登录后所有信息访问不了

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

