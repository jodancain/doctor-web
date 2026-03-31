import { Router, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireDoctor);

// GET /api/questionnaires
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const q = req.query.q as string;

    const where: any = {};
    if (q) where.title = { contains: q };

    const [total, data] = await Promise.all([
      prisma.questionnaire.count({ where }),
      prisma.questionnaire.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const items = data.map(item => ({
      ...item,
      updateDate: item.updatedAt.toISOString().split('T')[0],
    }));

    res.json({ items, total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaires');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/records/list — must be before /:id
router.get('/records/list', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const q = req.query.q as string;

    const where: any = {};
    if (q) {
      where.OR = [
        { questionnaireName: { contains: q } },
        { patientName: { contains: q } },
        { patientId: { contains: q } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.questionnaireRecord.count({ where }),
      prisma.questionnaireRecord.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { submitDate: 'desc' },
      }),
    ]);

    res.json({ items: data, total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire records');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.questionnaire.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Questionnaire not found' });
    res.json(item);
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, status, questions } = req.body;
    const item = await prisma.questionnaire.create({
      data: {
        title,
        type: type || 'Survey',
        status: status || 'Draft',
        questions: questions || [],
        questionCount: (questions || []).length,
        authorId: req.user!.id,
      },
    });
    res.status(201).json({ success: true, id: item.id });
  } catch (error) {
    logger.error({ error }, 'Error creating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/questionnaires/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, type, status, questions } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (questions !== undefined) {
      data.questions = questions;
      data.questionCount = questions.length;
    }

    await prisma.questionnaire.update({ where: { id: req.params.id }, data });
    res.json({ success: true, updated: 1 });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Questionnaire not found' });
    logger.error({ error }, 'Error updating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/questionnaires/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await Promise.all([
      prisma.patientTask.deleteMany({ where: { referenceId: id } }),
      prisma.questionnaireRecord.deleteMany({ where: { questionnaireId: id } }),
    ]);
    await prisma.questionnaire.delete({ where: { id } });
    res.json({ success: true, deleted: 1 });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Questionnaire not found' });
    logger.error({ error }, 'Error deleting questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires/:id/distribute
router.post('/:id/distribute', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { patientIds } = req.body;

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ error: 'patientIds is required' });
    }

    const questionnaire = await prisma.questionnaire.findUnique({ where: { id } });
    if (!questionnaire) return res.status(404).json({ error: 'Questionnaire not found' });

    // Look up patient user IDs from openids
    const patientUsers = await prisma.user.findMany({
      where: { openid: { in: patientIds.map((p: any) => p.id) } },
      select: { id: true, openid: true, nickName: true },
    });

    const tasks = patientIds.map((p: { id: string; name: string }) => {
      const patientUser = patientUsers.find(u => u.openid === p.id);
      return {
        patientId: patientUser?.id || p.id,
        patientName: p.name,
        taskType: 'questionnaire',
        referenceId: id,
        title: questionnaire.title,
        status: 'pending',
        doctorId: req.user!.id,
        doctorName: req.user!.nickName,
      };
    });

    await Promise.all(tasks.map((task: any) => prisma.patientTask.create({ data: task })));

    await prisma.questionnaire.update({
      where: { id },
      data: { usageCount: { increment: patientIds.length } },
    });

    logger.info({ questionnaireId: id, patientCount: patientIds.length }, 'Distributed questionnaire');
    res.json({ success: true, distributed: patientIds.length });
  } catch (error) {
    logger.error({ error }, 'Error distributing questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
