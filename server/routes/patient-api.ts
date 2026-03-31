import { Router, Response } from 'express';
import { db, _ } from '../db';
import { logger } from '../logger';
import { requireAuth, requirePatient, AuthRequest } from '../middleware/auth';

const router = Router();

// All patient-api routes require authenticated patient
router.use(requireAuth, requirePatient);

// Collection name mapping for health records
const RECORD_COLLECTIONS: Record<string, string> = {
  ua: 'uaRecords',
  attack: 'attackRecords',
  water: 'waterRecords',
  exercise: 'exerciseRecords',
  medication: 'medicationReminders',
  diet: 'dietRecords',
};

// ─── Profile ────────────────────────────────────────────────────

// GET /api/patient/me
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.collection('users').doc(req.user!.id).get();
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = result.data[0];
    const { password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    logger.error({ error }, 'Error fetching patient profile');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Health Records ─────────────────────────────────────────────

// POST /api/patient/records/:type — submit a health record
router.post('/records/:type', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const collection = RECORD_COLLECTIONS[type];
    if (!collection) {
      return res.status(400).json({ error: `Invalid record type: ${type}. Valid: ${Object.keys(RECORD_COLLECTIONS).join(', ')}` });
    }

    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const record = {
      ...req.body,
      _openid: openid,
      timestamp: req.body.timestamp || Date.now(),
      createdAt: Date.now(),
    };

    // Remove protected fields
    delete record._id;

    const result = await db.collection(collection).add(record);
    logger.info({ type, openid }, 'Patient submitted health record');
    return res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    logger.error({ error }, 'Error submitting health record');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patient/records/:type — get own health records
router.get('/records/:type', async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const collection = RECORD_COLLECTIONS[type];
    if (!collection) {
      return res.status(400).json({ error: `Invalid record type: ${type}` });
    }

    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const dataResult = await db.collection(collection)
      .where({ _openid: openid })
      .orderBy('timestamp', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    return res.json({ items: dataResult.data, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient records');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patient/summary — get own 7-day health summary
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const query = { _openid: openid };

    const [latestUa, attackCount, waterData, exerciseData, medsCount] = await Promise.all([
      db.collection('uaRecords').where(query).orderBy('timestamp', 'desc').limit(1).get(),
      db.collection('attackRecords').where(_.and([query, { timestamp: _.gte(sevenDaysAgo) }])).count(),
      db.collection('waterRecords').where(_.and([query, { timestamp: _.gte(sevenDaysAgo) }])).get(),
      db.collection('exerciseRecords').where(_.and([query, { timestamp: _.gte(sevenDaysAgo) }])).get(),
      db.collection('medicationReminders').where(_.and([query, { timestamp: _.gte(sevenDaysAgo) }])).count(),
    ]);

    return res.json({
      latestUa: latestUa.data[0]?.value || null,
      recentAttacks: attackCount.total,
      recentWaterTotal: waterData.data.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
      recentExerciseTotal: exerciseData.data.reduce((sum: number, r: any) => sum + (r.duration || 0), 0),
      recentMedsCount: medsCount.total,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Questionnaire Tasks ────────────────────────────────────────

// GET /api/patient/tasks — get assigned tasks
router.get('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const result = await db.collection('patient_tasks')
      .where({ patientId: openid })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const items = result.data.map((item: any) => ({ ...item, id: item._id }));
    return res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient tasks');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patient/questionnaires/:id — get questionnaire template to fill
router.get('/questionnaires/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection('questionnaires').doc(id).get();

    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    const q = result.data[0];
    if (q.status !== 'Published') {
      return res.status(403).json({ error: 'Questionnaire is not published' });
    }

    return res.json({ ...q, id: q._id });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patient/questionnaires/:id/submit — submit questionnaire answers
router.post('/questionnaires/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const openid = req.user!._openid;
    const patientName = req.user!.nickName;

    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    // Verify questionnaire exists
    const qResult = await db.collection('questionnaires').doc(id).get();
    if (qResult.data.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }
    const questionnaire = qResult.data[0];

    const { answers, score, result: resultText } = req.body;

    // Create questionnaire record
    const record = {
      questionnaireId: id,
      questionnaireName: questionnaire.title,
      patientName: patientName,
      patientId: openid,
      submitDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      score: score || null,
      result: resultText || '',
      status: 'Completed',
      answers: answers || [],
      createdAt: Date.now(),
    };

    const recordResult = await db.collection('questionnaire_records').add(record);

    // Update patient_task status to completed
    await db.collection('patient_tasks').where({
      patientId: openid,
      referenceId: id,
      status: 'pending',
    }).update({
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    logger.info({ questionnaireId: id, patientId: openid }, 'Patient submitted questionnaire');
    return res.status(201).json({ success: true, id: recordResult.id });
  } catch (error) {
    logger.error({ error }, 'Error submitting questionnaire');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Messages ───────────────────────────────────────────────────

// GET /api/patient/messages — get chat messages with doctor
router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    // Find conversations that end with this patient's openid
    const convRegex = db.RegExp({ regexp: `_${openid}$` });

    const result = await db.collection('messages')
      .where({ conversationId: convRegex })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const items = result.data.reverse().map((msg: any) => ({ ...msg, id: msg._id }));
    return res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient messages');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patient/messages — send message to doctor
router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    const patientName = req.user!.nickName;

    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Find existing conversation to get doctorId
    const convRegex = db.RegExp({ regexp: `_${openid}$` });
    const existingMsg = await db.collection('messages')
      .where({ conversationId: convRegex })
      .limit(1)
      .get();

    if (existingMsg.data.length === 0) {
      return res.status(400).json({ error: '暂无与医生的会话，请等待医生先发起对话' });
    }

    const conversationId = existingMsg.data[0].conversationId;
    // Extract doctorId from conversationId (format: doctorId_patientOpenid)
    const doctorId = conversationId.replace(`_${openid}`, '');

    const message = {
      conversationId,
      senderId: openid,
      senderRole: 'patient',
      senderName: patientName,
      receiverId: doctorId,
      receiverName: existingMsg.data[0].senderRole === 'doctor'
        ? existingMsg.data[0].senderName
        : existingMsg.data[0].receiverName,
      content: content.trim(),
      type: 'text',
      createdAt: Date.now(),
      read: false,
    };

    const result = await db.collection('messages').add(message);
    return res.status(201).json({ success: true, id: result.id, message: { ...message, id: result.id } });
  } catch (error) {
    logger.error({ error }, 'Error sending patient message');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/patient/messages/read — mark doctor messages as read
router.put('/messages/read', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) {
      return res.status(400).json({ error: 'Patient _openid not found' });
    }

    const convRegex = db.RegExp({ regexp: `_${openid}$` });
    const result = await db.collection('messages').where({
      conversationId: convRegex,
      senderRole: 'doctor',
      read: false,
    }).update({ read: true });

    return res.json({ success: true, updated: result.updated });
  } catch (error) {
    logger.error({ error }, 'Error marking messages as read');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Education Articles (read-only) ─────────────────────────────

// GET /api/patient/articles — get published articles
router.get('/articles', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;

    let query: any = { status: '已发布' };
    if (category && category !== '全部') {
      query.category = category;
    }

    const [countResult, dataResult] = await Promise.all([
      db.collection('education_articles').where(query).count(),
      db.collection('education_articles')
        .where(query)
        .skip(offset)
        .limit(limit)
        .orderBy('createdAt', 'desc')
        .get()
    ]);

    const items = dataResult.data.map((item: any) => ({
      ...item,
      id: item._id,
      createdAt: item.createdAt?.$date || item.createdAt,
    }));

    return res.json({ items, total: countResult.total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching articles for patient');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patient/articles/:id — get single article
router.get('/articles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection('education_articles').doc(id).get();

    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const article = result.data[0];
    if (article.status !== '已发布') {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    await db.collection('education_articles').doc(id).update({ views: _.inc(1) });

    return res.json({ ...article, id: article._id });
  } catch (error) {
    logger.error({ error }, 'Error fetching article for patient');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
