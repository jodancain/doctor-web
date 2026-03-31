import { Router, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, requirePatient, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requirePatient);

// Model mapping for health records
const getRecordModel = (type: string) => {
  const map: Record<string, any> = {
    ua: prisma.uaRecord,
    attack: prisma.attackRecord,
    water: prisma.waterRecord,
    exercise: prisma.exerciseRecord,
    medication: prisma.medicationReminder,
    diet: prisma.dietRecord,
  };
  return map[type];
};

// ─── Profile ────────────────────────────────────────────────────

router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    logger.error({ error }, 'Error fetching patient profile');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Health Records ─────────────────────────────────────────────

router.post('/records/:type', async (req: AuthRequest, res: Response) => {
  try {
    const model = getRecordModel(req.params.type);
    if (!model) return res.status(400).json({ error: `Invalid record type: ${req.params.type}` });

    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const { _id, ...data } = req.body;
    const record = await model.create({
      data: {
        ...data,
        openid,
        timestamp: BigInt(data.timestamp || Date.now()),
        createdAt: BigInt(Date.now()),
      },
    });

    return res.status(201).json({ success: true, id: record.id });
  } catch (error) {
    logger.error({ error }, 'Error submitting health record');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/records/:type', async (req: AuthRequest, res: Response) => {
  try {
    const model = getRecordModel(req.params.type);
    if (!model) return res.status(400).json({ error: `Invalid record type: ${req.params.type}` });

    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const items = await model.findMany({
      where: { openid },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit,
    });

    return res.json({ items, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient records');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const sevenDaysAgo = BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [latestUa, attackCount, waterData, exerciseData, medsCount] = await Promise.all([
      prisma.uaRecord.findFirst({ where: { openid }, orderBy: { timestamp: 'desc' } }),
      prisma.attackRecord.count({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.waterRecord.findMany({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.exerciseRecord.findMany({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
      prisma.medicationReminder.count({ where: { openid, timestamp: { gte: sevenDaysAgo } } }),
    ]);

    return res.json({
      latestUa: latestUa?.value || null,
      recentAttacks: attackCount,
      recentWaterTotal: waterData.reduce((sum, r) => sum + (r.amount || 0), 0),
      recentExerciseTotal: exerciseData.reduce((sum, r) => sum + (r.duration || 0), 0),
      recentMedsCount: medsCount,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Questionnaire Tasks ────────────────────────────────────────

router.get('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const items = await prisma.patientTask.findMany({
      where: { patientId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient tasks');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/questionnaires/:id', async (req: AuthRequest, res: Response) => {
  try {
    const q = await prisma.questionnaire.findUnique({ where: { id: req.params.id } });
    if (!q) return res.status(404).json({ error: 'Questionnaire not found' });
    if (q.status !== 'Published') return res.status(403).json({ error: 'Questionnaire is not published' });
    return res.json(q);
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/questionnaires/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const questionnaire = await prisma.questionnaire.findUnique({ where: { id } });
    if (!questionnaire) return res.status(404).json({ error: 'Questionnaire not found' });

    const { answers, score, result: resultText } = req.body;

    const record = await prisma.questionnaireRecord.create({
      data: {
        questionnaireId: id,
        questionnaireName: questionnaire.title,
        patientId: req.user!.id,
        patientName: req.user!.nickName || '',
        submitDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        score: score || null,
        result: resultText || '',
        status: 'Completed',
        answers: answers || [],
        createdAt: BigInt(Date.now()),
      },
    });

    // Update task status
    await prisma.patientTask.updateMany({
      where: { patientId: req.user!.id, referenceId: id, status: 'pending' },
      data: { status: 'completed', completedAt: new Date() },
    });

    return res.status(201).json({ success: true, id: record.id });
  } catch (error) {
    logger.error({ error }, 'Error submitting questionnaire');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Messages ───────────────────────────────────────────────────

router.get('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: openid }, { receiverId: openid }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items = messages.reverse().map(msg => ({ ...msg, createdAt: Number(msg.createdAt) }));
    return res.json({ items });
  } catch (error) {
    logger.error({ error }, 'Error fetching patient messages');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/messages', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content is required' });

    // Find existing conversation
    const existing = await prisma.message.findFirst({
      where: { OR: [{ senderId: openid }, { receiverId: openid }] },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return res.status(400).json({ error: '暂无与医生的会话，请等待医生先发起对话' });
    }

    const conversationId = existing.conversationId;
    const doctorId = conversationId.split('_')[0];

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: openid,
        senderRole: 'patient',
        senderName: req.user!.nickName || '',
        receiverId: doctorId,
        receiverName: '',
        content: content.trim(),
        type: 'text',
        createdAt: BigInt(Date.now()),
      },
    });

    return res.status(201).json({ success: true, id: message.id, message: { ...message, createdAt: Number(message.createdAt) } });
  } catch (error) {
    logger.error({ error }, 'Error sending patient message');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/messages/read', async (req: AuthRequest, res: Response) => {
  try {
    const openid = req.user!._openid;
    if (!openid) return res.status(400).json({ error: 'Patient _openid not found' });

    const result = await prisma.message.updateMany({
      where: { receiverId: openid, senderRole: 'doctor', read: false },
      data: { read: true },
    });

    return res.json({ success: true, updated: result.count });
  } catch (error) {
    logger.error({ error }, 'Error marking messages as read');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Education Articles ─────────────────────────────────────────

router.get('/articles', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;

    const where: any = { status: '已发布' };
    if (category && category !== '全部') where.category = category;

    const [total, data] = await Promise.all([
      prisma.educationArticle.count({ where }),
      prisma.educationArticle.findMany({ where, skip: offset, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);

    return res.json({ items: data, total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching articles');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/articles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.educationArticle.findUnique({ where: { id: req.params.id } });
    if (!article || article.status !== '已发布') return res.status(404).json({ error: 'Article not found' });

    await prisma.educationArticle.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    return res.json(article);
  } catch (error) {
    logger.error({ error }, 'Error fetching article');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
