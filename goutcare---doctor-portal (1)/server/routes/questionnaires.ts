import { Router, Response } from 'express';
import { db } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireDoctor);

// GET /api/questionnaires — 模板列表
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const { data } = await db.collection('questionnaires')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    res.json({ items: data || [] });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaires');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/records/list — 回收的答卷列表
// ⚠️ 必须定义在 /:id 之前，否则会被 /:id 路由拦截（id = "records"）
router.get('/records/list', async (_req: AuthRequest, res: Response) => {
  try {
    const { data } = await db.collection('questionnaireRecords')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    res.json({ items: data || [] });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire records');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.collection('questionnaires').doc(req.params.id).get();
    if (!result.data || result.data.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.data[0]);
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires — 创建模板
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, questions } = req.body;
    if (!title || !questions) {
      return res.status(400).json({ error: 'title and questions are required' });
    }

    const doc = {
      title,
      description: description || '',
      questions,
      createdBy: (req as any).user?.username || 'doctor',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const result = await db.collection('questionnaires').add(doc);
    res.status(201).json({ success: true, id: result.id || result._id });
  } catch (error) {
    logger.error({ error }, 'Error creating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/questionnaires/:id — 更新模板
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, questions } = req.body;
    await db.collection('questionnaires').doc(req.params.id).update({
      title, description, questions, updatedAt: Date.now()
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error updating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/questionnaires/:id — 删除模板
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('questionnaires').doc(req.params.id).remove();
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires/:id/assign — 下发给患者
router.post('/:id/assign', async (req: AuthRequest, res: Response) => {
  try {
    const { patientOpenid, title } = req.body;
    if (!patientOpenid) {
      return res.status(400).json({ error: 'patientOpenid is required' });
    }

    const task = {
      _openid: patientOpenid,
      referenceId: req.params.id,
      title: title || '健康问卷待填写',
      type: 'questionnaire',
      status: 'pending',
      assignedBy: (req as any).user?.username || 'doctor',
      createdAt: Date.now()
    };

    const result = await db.collection('patientTasks').add(task);
    res.status(201).json({ success: true, taskId: result.id || result._id });
  } catch (error) {
    logger.error({ error }, 'Error assigning questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
