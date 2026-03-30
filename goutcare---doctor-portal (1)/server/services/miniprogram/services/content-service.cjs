const { success, error } = require('../utils/response.cjs');

// ─────────────────────────────────────────
// 患者任务（patientTasks）
// ─────────────────────────────────────────

async function getPendingTasks(context) {
  const { db, openid } = context;
  if (!openid) return error(401, 'User not authenticated');

  try {
    const { data } = await db.collection('patientTasks')
      .where({ _openid: openid, status: 'pending' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    return success(data || []);
  } catch (err) {
    console.error('[ContentService] getPendingTasks error:', err);
    return error(500, err.message);
  }
}

async function completeTask(context) {
  const { db, openid, taskId } = context;
  if (!openid) return error(401, 'User not authenticated');
  if (!taskId) return error(400, 'taskId is required');

  try {
    const res = await db.collection('patientTasks').doc(taskId).update({
      status: 'completed', completedAt: db.serverDate()
    });
    if (res.updated === 0) {
      return error(404, 'Task not found');
    }
    return success({ taskId, completed: true });
  } catch (err) {
    console.error('[ContentService] completeTask error:', err);
    return error(500, err.message);
  }
}

// ─────────────────────────────────────────
// 问卷（questionnaires / questionnaireRecords）
// ─────────────────────────────────────────

async function getQuestionnaire(context) {
  const { db, openid, id } = context;
  if (!openid) return error(401, 'User not authenticated');
  if (!id) return error(400, 'id is required');

  try {
    const res = await db.collection('questionnaires').doc(id).get();
    if (!res.data || res.data.length === 0) return error(404, 'Questionnaire not found');
    return success(res.data[0]);
  } catch (err) {
    console.error('[ContentService] getQuestionnaire error:', err);
    return error(500, err.message);
  }
}

async function submitQuestionnaire(context) {
  const { db, openid, questionnaireId, questionnaireName, answers, taskId, patientName } = context;
  if (!openid) return error(401, 'User not authenticated');
  if (!questionnaireId || !answers) return error(400, 'questionnaireId and answers are required');

  try {
    const record = {
      questionnaireId,
      questionnaireName: questionnaireName || '',
      patientId: openid,
      patientName: patientName || '',
      answers,
      taskId: taskId || null,
      status: 'Completed',
      result: '已提交',
      submitDate: new Date().toISOString().replace('T', ' ').split('.')[0],
      submittedAt: db.serverDate(),
      createdAt: Date.now(),
      _openid: openid
    };

    const addRes = await db.collection('questionnaireRecords').add(record);

    // 同步更新任务状态
    if (taskId) {
      await db.collection('patientTasks').doc(taskId).update({
        status: 'completed', completedAt: db.serverDate()
      }).catch(e => console.warn('[ContentService] completeTask in submitQuestionnaire warning:', e));
    }

    return success({ recordId: addRes._id, submitted: true });
  } catch (err) {
    console.error('[ContentService] submitQuestionnaire error:', err);
    return error(500, err.message);
  }
}

// ─────────────────────────────────────────
// 科普文章（education_articles）
// ─────────────────────────────────────────

async function getArticle(context) {
  const { db, openid, id } = context;
  if (!openid) return error(401, 'User not authenticated');
  if (!id) return error(400, 'id is required');

  try {
    const res = await db.collection('education_articles').doc(id).get();
    if (!res.data || res.data.length === 0) return error(404, 'Article not found');

    // 异步增加阅读量（忽略失败）
    db.collection('education_articles').doc(id).update({
      $inc: { views: 1 }
    }).catch(() => {});

    return success(res.data[0]);
  } catch (err) {
    console.error('[ContentService] getArticle error:', err);
    return error(500, err.message);
  }
}

async function listArticles(context) {
  const { db, openid, category, excludeId, limit = 20 } = context;
  if (!openid) return error(401, 'User not authenticated');

  try {
    let query = db.collection('education_articles');

    if (category && excludeId) {
      // 相关推荐：同分类且排除当前文章
      query = query.where({ category, _id: db.command.neq(excludeId) });
    } else if (category) {
      query = query.where({ category });
    }

    const { data } = await query
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .get();

    return success(data || []);
  } catch (err) {
    console.error('[ContentService] listArticles error:', err);
    return error(500, err.message);
  }
}

module.exports = {
  getPendingTasks,
  completeTask,
  getQuestionnaire,
  submitQuestionnaire,
  getArticle,
  listArticles
};
