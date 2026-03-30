# 数据库集合完整配置清单

本文档列出了健康数据管理系统所需的所有数据库集合及其配置要求。

## 必需集合列表

### 1. 用户集合 (`users`)
**用途**: 存储患者和医生账号信息

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 微信用户OpenID（微信云数据库自动添加）
- `openid`: 自定义OpenID字段（用于兼容）
- `username`: 用户名（唯一）
- `password`: 密码（生产环境应加密）
- `nickName`: 昵称
- `avatar`: 头像URL
- `role`: 角色（'user' 或 'doctor'）
- `boundPatients`: 绑定的患者OpenID数组（医生专用）
- `boundDoctors`: 绑定的医生OpenID数组（患者专用）
- `createdAt`: 创建时间
- `lastLoginAt`: 最后登录时间

**权限设置**: 所有用户可读，仅创建者可写

**索引配置**:
- `idx_openid`: `_openid` 升序，唯一
- `idx_username`: `username` 升序，唯一
- `idx_role`: `role` 升序

---

### 2. 消息集合 (`messages`)
**用途**: 存储医生与患者之间的聊天消息

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 创建者OpenID（微信云数据库自动添加）
- `fromOpenid`: 发送者OpenID
- `toOpenid`: 接收者OpenID
- `content`: 消息内容
- `msgType`: 消息类型（'text' 或 'image'）
- `createdAt`: 创建时间戳
- `read`: 是否已读（布尔值）

**权限设置**: 仅创建者及管理端可读写（需配合云函数或自定义规则）

**索引配置**:
- `idx_from_to_created`: `fromOpenid`, `toOpenid`, `createdAt` (升序, 升序, 降序)
- `idx_to_created`: `toOpenid`, `createdAt` (升序, 降序)
- `idx_from_created`: `fromOpenid`, `createdAt` (升序, 降序)

---

### 3. 尿酸记录集合 (`uaRecords`)
**用途**: 存储患者尿酸值记录

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `value`: 尿酸值（μmol/L，数字）
- `timestamp`: 记录时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

### 4. 发作记录集合 (`attackRecords`)
**用途**: 存储痛风发作记录

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `joint`: 受累关节（字符串）
- `severity`: 严重程度（'轻'、'中'、'重'）
- `trigger`: 诱因（可选字符串）
- `timestamp`: 记录时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

### 5. 饮水记录集合 (`waterRecords`)
**用途**: 存储患者饮水记录

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `volume`: 饮水量（毫升，数字）
- `timestamp`: 记录时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

### 6. 运动记录集合 (`exerciseRecords`)
**用途**: 存储患者运动记录

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `type`: 运动类型（字符串）
- `duration`: 运动时长（分钟，数字）
- `timestamp`: 记录时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

### 7. 用药提醒集合 (`medicationReminders`)
**用途**: 存储患者用药提醒设置

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `name`: 药品名称（字符串）
- `dosage`: 剂量（字符串）
- `time`: 提醒时间（HH:mm格式字符串）
- `timestamp`: 创建时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

### 8. 饮食记录集合 (`dietRecords`)
**用途**: 存储患者饮食记录

**字段结构**:
- `_id`: 文档ID（自动生成）
- `_openid`: 用户OpenID（微信云数据库自动添加）
- `name`: 食物名称（字符串）
- `color`: 嘌呤等级颜色（'green'、'yellow'、'red'）
- `timestamp`: 记录时间戳（毫秒数）

**权限设置**: 仅创建者可读写

**索引配置**:
- `idx_openid_timestamp`: `_openid`, `timestamp` (升序, 降序)

---

## 集合创建检查清单

在云开发控制台中，请确认以下集合已全部创建：

- [ ] `users` - 用户集合
- [ ] `messages` - 消息集合
- [ ] `uaRecords` - 尿酸记录集合
- [ ] `attackRecords` - 发作记录集合
- [ ] `waterRecords` - 饮水记录集合
- [ ] `exerciseRecords` - 运动记录集合
- [ ] `medicationReminders` - 用药提醒集合
- [ ] `dietRecords` - 饮食记录集合

## 快速创建脚本

在云开发控制台的数据库管理页面，可以依次创建以上集合。建议按以下顺序创建：

1. 先创建 `users` 集合（其他集合可能依赖用户数据）
2. 创建 `messages` 集合
3. 创建所有记录类集合（`uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders`、`dietRecords`）

## 权限配置说明

### 记录类集合（uaRecords、attackRecords等）
- **权限**: 仅创建者可读写
- **原因**: 保护用户隐私，确保每个用户只能访问自己的数据

### users 集合
- **权限**: 所有用户可读，仅创建者可写
- **原因**: 患者需要读取医生列表，医生需要搜索患者信息

### messages 集合
- **权限**: 仅创建者及管理端可读写（或使用自定义安全规则）
- **原因**: 支持双向通信，需要允许发送者和接收者都能读取消息

## 索引创建说明

为了提高查询性能，建议为所有集合创建相应的索引。索引创建步骤：

1. 进入云开发控制台 → 数据库
2. 选择对应集合
3. 点击"索引管理" → "添加索引"
4. 按照上述索引配置创建索引

**注意**: 索引创建可能需要一些时间，请耐心等待。

## 数据迁移说明

如果已有旧数据，需要注意：
- 旧数据可能使用 `openid` 字段，新代码同时支持 `_openid` 和 `openid`
- 建议逐步迁移，确保数据一致性
- 新创建的数据将使用 `_openid` 字段（微信云数据库自动管理）

