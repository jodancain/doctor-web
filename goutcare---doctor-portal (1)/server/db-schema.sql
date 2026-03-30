-- ============================================================
-- GoutCare 痛风管理系统 — MySQL 数据库建表脚本
-- 从 MongoDB 迁移，保持字段名与应用层完全一致
-- 要求 MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS goutcare DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE goutcare;

-- ─── 1. 用户 ───

CREATE TABLE IF NOT EXISTS users (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  _openid     VARCHAR(128) DEFAULT NULL,
  username    VARCHAR(128) DEFAULT NULL,
  password    VARCHAR(256) DEFAULT NULL,
  role        VARCHAR(16)  DEFAULT 'user',
  nickName    VARCHAR(128) DEFAULT NULL,
  name        VARCHAR(128) DEFAULT NULL,
  gender      VARCHAR(16)  DEFAULT NULL,
  age         INT          DEFAULT NULL,
  birthDate   VARCHAR(32)  DEFAULT NULL,
  height      DOUBLE       DEFAULT NULL,
  weight      DOUBLE       DEFAULT NULL,
  diagnosisYear INT        DEFAULT NULL,
  hospital    VARCHAR(256) DEFAULT NULL,
  department  VARCHAR(128) DEFAULT NULL,
  title       VARCHAR(128) DEFAULT NULL,
  licenseNo   VARCHAR(128) DEFAULT NULL,
  org         VARCHAR(256) DEFAULT NULL,
  avatar      TEXT         DEFAULT NULL,
  lastLoginAt VARCHAR(64)  DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  updatedAt   VARCHAR(64)  DEFAULT NULL,
  UNIQUE KEY idx_openid (_openid),
  INDEX idx_username (username),
  INDEX idx_role (role)
);

-- ─── 2. 尿酸记录 ───

CREATE TABLE IF NOT EXISTS uaRecords (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  _openid   VARCHAR(128) DEFAULT NULL,
  value     DOUBLE       DEFAULT NULL,
  timestamp DOUBLE       DEFAULT NULL,
  createdAt VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 3. 发作记录 ───

CREATE TABLE IF NOT EXISTS attackRecords (
  _id            CHAR(36)     NOT NULL PRIMARY KEY,
  _openid        VARCHAR(128) DEFAULT NULL,
  timestamp      DOUBLE       DEFAULT NULL,
  joints         JSON         DEFAULT NULL,
  originalJoints JSON         DEFAULT NULL,
  painLevel      INT          DEFAULT NULL,
  triggers       JSON         DEFAULT NULL,
  duration       VARCHAR(64)  DEFAULT NULL,
  createdAt      VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 4. 饮水记录 ───

CREATE TABLE IF NOT EXISTS waterRecords (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  _openid   VARCHAR(128) DEFAULT NULL,
  timestamp DOUBLE       DEFAULT NULL,
  amount    DOUBLE       DEFAULT NULL,
  volume    DOUBLE       DEFAULT NULL,
  createdAt VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 5. 运动记录 ───

CREATE TABLE IF NOT EXISTS exerciseRecords (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  _openid   VARCHAR(128) DEFAULT NULL,
  timestamp DOUBLE       DEFAULT NULL,
  duration  DOUBLE       DEFAULT NULL,
  createdAt VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 6. 用药提醒 ───

CREATE TABLE IF NOT EXISTS medicationReminders (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  _openid   VARCHAR(128) DEFAULT NULL,
  timestamp DOUBLE       DEFAULT NULL,
  name      VARCHAR(256) DEFAULT NULL,
  dosage    VARCHAR(128) DEFAULT NULL,
  frequency VARCHAR(128) DEFAULT NULL,
  status    VARCHAR(32)  DEFAULT NULL,
  createdAt VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 7. 饮食记录 ───

CREATE TABLE IF NOT EXISTS dietRecords (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  _openid     VARCHAR(128) DEFAULT NULL,
  timestamp   DOUBLE       DEFAULT NULL,
  purineLevel VARCHAR(32)  DEFAULT NULL,
  level       VARCHAR(32)  DEFAULT NULL,
  category    VARCHAR(32)  DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid_ts (_openid, timestamp)
);

-- ─── 8. 问卷模板 ───

CREATE TABLE IF NOT EXISTS questionnaires (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  title       VARCHAR(256) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  questions   JSON         DEFAULT NULL,
  createdBy   VARCHAR(128) DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  updatedAt   VARCHAR(64)  DEFAULT NULL
);

-- ─── 9. 问卷回收记录 ───

CREATE TABLE IF NOT EXISTS questionnaireRecords (
  _id               CHAR(36)     NOT NULL PRIMARY KEY,
  _openid           VARCHAR(128) DEFAULT NULL,
  questionnaireName VARCHAR(256) DEFAULT NULL,
  answers           JSON         DEFAULT NULL,
  submittedAt       VARCHAR(64)  DEFAULT NULL,
  createdAt         VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid (_openid)
);

-- ─── 10. 患者任务 ───

CREATE TABLE IF NOT EXISTS patientTasks (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  _openid     VARCHAR(128) DEFAULT NULL,
  referenceId VARCHAR(36)  DEFAULT NULL,
  title       VARCHAR(256) DEFAULT NULL,
  type        VARCHAR(32)  DEFAULT NULL,
  status      VARCHAR(32)  DEFAULT 'pending',
  assignedBy  VARCHAR(128) DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  INDEX idx_openid (_openid)
);

-- ─── 11. 科研项目 ───

CREATE TABLE IF NOT EXISTS research_projects (
  _id           CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(256) DEFAULT NULL,
  description   TEXT         DEFAULT NULL,
  targetCount   INT          DEFAULT 0,
  enrolledCount INT          DEFAULT 0,
  status        VARCHAR(32)  DEFAULT NULL,
  startDate     VARCHAR(64)  DEFAULT NULL,
  endDate       VARCHAR(64)  DEFAULT NULL,
  createdBy     VARCHAR(128) DEFAULT NULL,
  createdAt     VARCHAR(64)  DEFAULT NULL,
  updatedAt     VARCHAR(64)  DEFAULT NULL
);

-- ─── 12. 健康教育文章 ───

CREATE TABLE IF NOT EXISTS education_articles (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  title     VARCHAR(512) DEFAULT NULL,
  category  VARCHAR(64)  DEFAULT NULL,
  content   LONGTEXT     DEFAULT NULL,
  authorId  VARCHAR(36)  DEFAULT NULL,
  views     INT          DEFAULT 0,
  createdAt VARCHAR(64)  DEFAULT NULL,
  updatedAt VARCHAR(64)  DEFAULT NULL,
  INDEX idx_category (category)
);

-- ─── 13. 消息（医患聊天） ───

CREATE TABLE IF NOT EXISTS messages (
  _id            CHAR(36)     NOT NULL PRIMARY KEY,
  _openid        VARCHAR(128) DEFAULT NULL,
  fromOpenid     VARCHAR(128) DEFAULT NULL,
  toOpenid       VARCHAR(128) DEFAULT NULL,
  partnerId      VARCHAR(128) DEFAULT NULL,
  conversationId VARCHAR(128) DEFAULT NULL,
  content        TEXT         DEFAULT NULL,
  type           VARCHAR(32)  DEFAULT NULL,
  status         VARCHAR(32)  DEFAULT NULL,
  timestamp      DOUBLE       DEFAULT NULL,
  createdAt      VARCHAR(64)  DEFAULT NULL,
  INDEX idx_from (fromOpenid),
  INDEX idx_to (toOpenid),
  INDEX idx_conv (conversationId)
);

-- ─── 14. AI 多轮对话 ───

CREATE TABLE IF NOT EXISTS aiConversations (
  _id            CHAR(36)     NOT NULL PRIMARY KEY,
  conversationId VARCHAR(36)  DEFAULT NULL,
  patientId      VARCHAR(128) DEFAULT NULL,
  _openid        VARCHAR(128) DEFAULT NULL,
  messages       JSON         DEFAULT NULL,
  turn           INT          DEFAULT 1,
  createdAt      VARCHAR(64)  DEFAULT NULL,
  updatedAt      VARCHAR(64)  DEFAULT NULL,
  UNIQUE KEY idx_conv (conversationId)
);

-- ─── 15. AI 批量测试结果 ───

CREATE TABLE IF NOT EXISTS aiBatchResults (
  _id       CHAR(36)     NOT NULL PRIMARY KEY,
  batchId   VARCHAR(36)  DEFAULT NULL,
  patientId VARCHAR(128) DEFAULT NULL,
  testSuite VARCHAR(128) DEFAULT NULL,
  total     INT          DEFAULT 0,
  passed    INT          DEFAULT 0,
  results   JSON         DEFAULT NULL,
  createdAt VARCHAR(64)  DEFAULT NULL,
  UNIQUE KEY idx_batch (batchId)
);

-- ─── 16. AI 测试集 ───

CREATE TABLE IF NOT EXISTS aiTestSuites (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  name        VARCHAR(128) DEFAULT NULL,
  description TEXT         DEFAULT NULL,
  questions   JSON         DEFAULT NULL,
  createdBy   VARCHAR(128) DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  UNIQUE KEY idx_name (name)
);

-- ─── 17. AI 评估记录 ───

CREATE TABLE IF NOT EXISTS aiEvaluations (
  _id               CHAR(36)     NOT NULL PRIMARY KEY,
  testId            VARCHAR(36)  DEFAULT NULL,
  conversationId    VARCHAR(36)  DEFAULT NULL,
  question          TEXT         DEFAULT NULL,
  yuanqiResponse    TEXT         DEFAULT NULL,
  evaluator         VARCHAR(128) DEFAULT NULL,
  scores            JSON         DEFAULT NULL,
  feedback          TEXT         DEFAULT NULL,
  suggestedResponse TEXT         DEFAULT NULL,
  review            JSON         DEFAULT NULL,
  apiKeyName        VARCHAR(128) DEFAULT NULL,
  createdAt         VARCHAR(64)  DEFAULT NULL,
  INDEX idx_created (createdAt)
);

-- ─── 18. API 密钥 ───

CREATE TABLE IF NOT EXISTS apiKeys (
  _id         CHAR(36)     NOT NULL PRIMARY KEY,
  `key`       VARCHAR(256) NOT NULL,
  name        VARCHAR(128) DEFAULT NULL,
  permissions JSON         DEFAULT NULL,
  active      TINYINT(1)   DEFAULT 1,
  lastUsedAt  VARCHAR(64)  DEFAULT NULL,
  createdAt   VARCHAR(64)  DEFAULT NULL,
  INDEX idx_key_active (`key`, active)
);

-- ─── 19. API 审计日志 ───

CREATE TABLE IF NOT EXISTS apiAuditLog (
  _id        CHAR(36)     NOT NULL PRIMARY KEY,
  apiKeyId   VARCHAR(36)  DEFAULT NULL,
  apiKeyName VARCHAR(128) DEFAULT NULL,
  endpoint   VARCHAR(512) DEFAULT NULL,
  method     VARCHAR(16)  DEFAULT NULL,
  ip         VARCHAR(64)  DEFAULT NULL,
  timestamp  VARCHAR(64)  DEFAULT NULL,
  INDEX idx_key (apiKeyId),
  INDEX idx_ts (timestamp)
);

-- ─── 20. 外部 ID 映射 ───

CREATE TABLE IF NOT EXISTS apiPatientMapping (
  _id        CHAR(36)     NOT NULL PRIMARY KEY,
  _openid    VARCHAR(128) DEFAULT NULL,
  externalId VARCHAR(36)  DEFAULT NULL,
  createdAt  VARCHAR(64)  DEFAULT NULL,
  UNIQUE KEY idx_openid (_openid),
  UNIQUE KEY idx_ext (externalId)
);
