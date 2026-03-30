const { success, error } = require('../utils/response');

// 集合映射
const COLLECTION_MAP = {
  ua: 'uaRecords',
  attack: 'attackRecords',
  water: 'waterRecords',
  exercise: 'exerciseRecords',
  medication: 'medicationReminders',
  diet: 'dietRecords'
};

async function addRecord(context) {
  const { db, openid, type, data } = context;
  const collectionName = COLLECTION_MAP[type];
  
  if (!collectionName) {
    return error(400, `Invalid record type: ${type}`);
  }

  if (!openid) {
    return error(401, 'User not authenticated');
  }

  // 确保时间戳字段存在
  const timestamp = data.timestamp || data.createdAt || Date.now();
  
  const record = {
    ...data,
    value: data.value, // 确保value字段存在（对于尿酸记录）
    timestamp: timestamp,
    createdAt: timestamp,
    _openid: openid
  };

  try {
  const res = await db.collection(collectionName).add({ data: record });
    console.log(`[RecordService] Added record to ${collectionName}:`, res._id);
  return success({ ...record, _id: res._id });
  } catch (err) {
    console.error(`[RecordService] Add record error:`, err);
    return error(500, `Failed to save record: ${err.message}`);
  }
}

async function getRecords(context) {
  const { db, openid, type, limit = 20, offset = 0 } = context;
  const collectionName = COLLECTION_MAP[type];

  if (!collectionName) {
    return error(400, `Invalid record type: ${type}`);
  }

  if (!openid) {
    return error(401, 'User not authenticated');
  }

  try {
    // 优先使用timestamp排序，如果没有则使用createdAt
    const { data } = await db.collection(collectionName)
      .where({ _openid: openid })
      .orderBy('timestamp', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    // 如果timestamp字段不存在，尝试使用createdAt排序
    if (data.length === 0) {
      const { data: dataByCreated } = await db.collection(collectionName)
        .where({ _openid: openid })
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(limit)
        .get();
      return success(dataByCreated || []);
    }

    return success(data);
  } catch (err) {
    console.error(`[RecordService] Get records error:`, err);
    // 如果timestamp字段没有索引，尝试使用createdAt
    try {
  const { data } = await db.collection(collectionName)
    .where({ _openid: openid })
    .orderBy('createdAt', 'desc')
    .skip(offset)
    .limit(limit)
    .get();
  return success(data);
    } catch (err2) {
      return error(500, `Failed to get records: ${err2.message}`);
    }
  }
}

async function getHomeSummary(context) {
  const { db, openid } = context;
  
  // 并行查询各项数据的最新记录或统计
  const [uaRes, attackRes, waterRes, exerciseRes, medicationRes] = await Promise.all([
    db.collection('uaRecords').where({ _openid: openid }).orderBy('createdAt', 'desc').limit(1).get(),
    db.collection('attackRecords').where({ _openid: openid }).count(), // 简化为总数，实际应为7天
    db.collection('waterRecords').where({ _openid: openid }).orderBy('createdAt', 'desc').limit(100).get(), // 需聚合
    db.collection('exerciseRecords').where({ _openid: openid }).orderBy('createdAt', 'desc').limit(100).get(),
    db.collection('medicationReminders').where({ _openid: openid, status: 'active' }).count()
  ]);

  // 简化的统计逻辑
  const latestUa = uaRes.data[0];
  const waterTotal = waterRes.data.reduce((acc, cur) => acc + (cur.amount || 0), 0); // 这里仅作示例，实际应过滤日期
  const exerciseTotal = exerciseRes.data.reduce((acc, cur) => acc + (cur.duration || 0), 0);

  return success({
    latestUaValue: latestUa ? latestUa.value : null,
    latestUaTimestamp: latestUa ? latestUa.createdAt : null,
    attackCount7d: attackRes.total, // 暂用总数代替
    waterTotal7d: waterTotal,
    exerciseMinutes7d: exerciseTotal,
    medicationCount: medicationRes.total
  });
}

async function updateRecord(context) {
  const { db, openid, type, id, data } = context;
  const collectionName = COLLECTION_MAP[type];

  if (!collectionName) return error(400, `Invalid record type: ${type}`);
  if (!openid) return error(401, 'User not authenticated');
  if (!id) return error(400, 'Record ID is required');

  try {
    const res = await db.collection(collectionName).where({
      _id: id,
      _openid: openid
    }).update({
      data: {
        ...data,
        updatedAt: Date.now()
      }
    });

    if (res.stats.updated === 0) {
       return error(404, 'Record not found or no permission');
    }
    return success({ id, updated: true });
  } catch (err) {
    console.error(`[RecordService] Update record error:`, err);
    return error(500, `Failed to update record: ${err.message}`);
  }
}

async function deleteRecord(context) {
  const { db, openid, type, id } = context;
  const collectionName = COLLECTION_MAP[type];

  if (!collectionName) return error(400, `Invalid record type: ${type}`);
  if (!openid) return error(401, 'User not authenticated');
  if (!id) return error(400, 'Record ID is required');

  try {
    const res = await db.collection(collectionName).where({
      _id: id,
      _openid: openid
    }).remove();

    if (res.stats.removed === 0) {
       return error(404, 'Record not found or no permission');
    }
    return success({ id, deleted: true });
  } catch (err) {
    console.error(`[RecordService] Delete record error:`, err);
    return error(500, `Failed to delete record: ${err.message}`);
  }
}

module.exports = {
  addRecord,
  getRecords,
  getHomeSummary,
  updateRecord,
  deleteRecord
};

