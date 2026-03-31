# GoutCare 医生端 — 功能检查表

## 一、登录 (Login.tsx)
- [x] 账号密码登录 → API
- [x] "记住我" 复选框 → 状态可用，提示 7 天免登录
- [x] "忘记密码?" → 改为文字提示联系管理员

## 二、工作台 (DoctorDashboard.tsx)
- [x] 患者总数统计 → API
- [x] 危急/风险/稳定分类统计 → API
- [x] 异常预警患者列表 → API
- [x] "开始接诊" 按钮 → 导航到患者列表
- [x] "群发随访消息" 按钮 → 导航到消息中心
- [ ] "本月新增 +0 人" — 硬编码（需后端月度统计接口）
- [ ] "上午/下午已预约" 数字 — 硬编码（需预约系统）

## 三、患者列表 (PatientList.tsx)
- [x] 患者列表加载 → API
- [x] 搜索（300ms 防抖）→ API
- [x] 新增患者 → 导航
- [x] 查看详情 / 编辑 / 删除 → API
- [x] 加载更多分页 → API
- [x] 二维码弹窗 → 动态加载医生信息
- [x] 删除确认模态框 → 自定义 UI
- [x] "筛选" 按钮 → 已标记为开发中 (disabled)

## 四、患者详情 (PatientDetail.tsx)
- [x] 患者基本信息 → API
- [x] 7 天摘要卡片 → API
- [x] 6 种记录 Tab 切换 → API
- [x] 尿酸趋势图表 → Recharts
- [x] 加载更多记录 → API
- [x] "发消息" 按钮 → 导航到聊天

## 五、患者档案编辑 (PatientForm.tsx)
- [x] 新建患者 → API
- [x] 编辑患者 → API
- [x] 表单验证 + toast 反馈

## 六、AI 辅助决策 (AIChat.tsx)
- [x] Gemini 流式对话 → 外部 API
- [x] 医疗上下文系统指令
- [ ] 聊天记录不持久化（刷新丢失，属正常行为）

## 七、医生-患者聊天 (DoctorChat.tsx)
- [x] 会话列表 → API
- [x] 消息收发 → API
- [x] 已读标记 → API
- [x] 10 秒轮询自动刷新
- [x] 查看患者档案快捷入口

## 八、设置 (Settings.tsx)
- [x] 个人资料加载/保存 → API
- [x] 密码修改 → API（后端已实现验证+bcrypt）
- [x] 诊疗偏好保存 → localStorage
- [x] "应用设置" 按钮 → 保存到 localStorage
- [x] 登录历史 → 显示当前会话（标注开发中）
- [x] "更换头像" 按钮 → 已标记为开发中 (disabled)
- [ ] 通知消息开关 — 纯 state（需通知服务对接）

## 九、科研项目 (ProjectList.tsx / ProjectForm.tsx)
- [x] 新建/删除项目 → localStorage
- [x] 搜索/状态筛选 → 本地过滤
- [x] ProjectForm 面包屑 → 步骤指示（灰色不可点击）
- [ ] 数据源：localStorage + MOCK_PROJECTS（未接后端 API）
- [ ] "只看我的" 过滤 — 未实现
- [ ] 分页 — 按钮 disabled

## 十、问卷设计 (QuestionnaireDesign.tsx)
- [x] 问卷 CRUD → API (CloudBase)
- [x] 问题编辑器（4 种题型）
- [x] 复制问卷 → API
- [x] 分发给患者 → API
- [ ] 导出功能 — 占位提示（需 PDF 生成库）

## 十一、问卷记录 (QuestionnaireRecords.tsx)
- [x] 记录列表 → API
- [x] 搜索 → API
- [x] 详情弹窗（答题详情）
- [x] "筛选记录" / "导出数据" → 已标记为开发中 (disabled)

## 十二、医院宣教 (EducationManagement.tsx + ArticleEditor.tsx)
- [x] 文章 CRUD → API
- [x] 分类筛选 + 搜索 → API
- [x] 富文本编辑器
- [x] 发布/草稿状态切换 → API
- [x] 删除确认模态框

## 十三、用户管理 (UserManagement.tsx)
- [x] 新增/编辑用户模态框 → state only
- [x] 删除确认模态框 → state only
- [x] 状态启用/停用切换 → state only
- [ ] 数据源：纯 React state（需后端用户管理 API）
- [ ] "导出" 按钮 — 无 onClick
- [ ] 全选复选框 — 无批量操作

## 十四、系统管理占位页 (SystemPages.tsx)
- [ ] 角色管理 — 纯 mock UI，所有按钮无功能
- [ ] 组织管理 — 纯 mock UI
- [ ] 职称管理 — 纯 mock UI
- [ ] 资源管理 — 纯 mock UI

## 十五、患者端小程序 API (patient-api.ts)
- [x] 患者登录 → auth.ts 允许 role='user' 登录
- [x] 获取个人资料 → GET /api/patient/me
- [x] 提交健康记录 → POST /api/patient/records/:type (6 种)
- [x] 查询自己的记录 → GET /api/patient/records/:type
- [x] 获取 7 天摘要 → GET /api/patient/summary
- [x] 查看待办任务 → GET /api/patient/tasks
- [x] 获取问卷模板 → GET /api/patient/questionnaires/:id
- [x] 提交问卷答卷 → POST /api/patient/questionnaires/:id/submit
- [x] 获取聊天消息 → GET /api/patient/messages
- [x] 发送消息给医生 → POST /api/patient/messages
- [x] 标记已读 → PUT /api/patient/messages/read
- [x] 获取宣教文章 → GET /api/patient/articles (只读)
- [x] 查看文章详情 → GET /api/patient/articles/:id (自动计浏览量)

## 十六、安全修复
- [x] education.ts: POST/PUT/DELETE 添加 requireDoctor 保护
- [x] auth.ts: JWT payload 包含 _openid 字段
- [x] patient-api.ts: 所有查询/写入以 _openid 作用域限制

## 十七、后端基础修复
- [x] auth.ts: login/profile catch 块 return 语句 → 已修复
- [x] auth.ts: 密码修改接口 → 已实现（验证旧密码 + bcrypt 加密）
- [x] PatientList QR 弹窗 → 医生信息改为动态加载
- [x] questionnaires.ts: /records/list 路由顺序 → 已修复
