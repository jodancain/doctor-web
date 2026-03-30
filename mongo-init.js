// MongoDB 初始化脚本 — 首次启动时自动执行
// 创建 goutcare 数据库和索引

db = db.getSiblingDB('goutcare');

// ===== 用户表索引 =====
db.users.createIndex({ username: 1 }, { unique: true, sparse: true });
db.users.createIndex({ _openid: 1 });
db.users.createIndex({ role: 1 });

// ===== 健康记录索引 =====
const recordCollections = [
  'uaRecords',
  'attackRecords',
  'waterRecords',
  'exerciseRecords',
  'dietRecords'
];

recordCollections.forEach(name => {
  db[name].createIndex({ _openid: 1, createdAt: -1 });
  db[name].createIndex({ _openid: 1, timestamp: -1 });
});

// ===== 用药提醒 =====
db.medicationReminders.createIndex({ _openid: 1, status: 1 });

// ===== 消息/聊天 =====
db.messages.createIndex({ participants: 1, createdAt: -1 });
db.messages.createIndex({ clientMsgId: 1 }, { unique: true, sparse: true });

// ===== 健康教育文章 =====
db.education_articles.createIndex({ category: 1, createdAt: -1 });

// ===== 问卷 =====
db.questionnaires.createIndex({ status: 1 });

print('✅ GoutCare database initialized with indexes');
