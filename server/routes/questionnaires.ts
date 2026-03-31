import { Router, Response } from 'express';
import { db, _ } from '../db';
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

    let query: any = {};
    if (q) {
      const searchRegex = db.RegExp({ regexp: q, options: 'i' });
      query = { title: searchRegex };
    }

    const [countResult, dataResult] = await Promise.all([
      db.collection('questionnaires').where(query).count(),
      db.collection('questionnaires')
        .where(query)
        .skip(offset)
        .limit(limit)
        .orderBy('updatedAt', 'desc')
        .get()
    ]);

    const items = dataResult.data.map((item: any) => ({
      ...item,
      id: item._id,
      updateDate: new Date(item.updatedAt?.$date || item.updatedAt || Date.now()).toISOString().split('T')[0],
    }));

    res.json({ items, total: countResult.total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaires');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/records/list — must be before /:id to avoid route conflict
router.get('/records/list', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const q = req.query.q as string;

    let query: any = {};
    if (q) {
      const searchRegex = db.RegExp({ regexp: q, options: 'i' });
      query = _.or([
        { questionnaireName: searchRegex },
        { patientName: searchRegex },
        { patientId: searchRegex },
      ]);
    }

    const [countResult, dataResult] = await Promise.all([
      db.collection('questionnaire_records').where(query).count(),
      db.collection('questionnaire_records')
        .where(query)
        .skip(offset)
        .limit(limit)
        .orderBy('submitDate', 'desc')
        .get()
    ]);

    const items = dataResult.data.map((item: any) => ({
      ...item,
      id: item._id,
    }));

    res.json({ items, total: countResult.total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire records');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/questionnaires/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection('questionnaires').doc(id).get();

    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    const item = result.data[0];
    res.json({ ...item, id: item._id });
  } catch (error) {
    logger.error({ error }, 'Error fetching questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;

    const doc = {
      title: data.title,
      type: data.type || 'Survey',
      status: data.status || 'Draft',
      questions: data.questions || [],
      questionCount: (data.questions || []).length,
      usageCount: 0,
      authorId: req.user?.id || 'system',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };

    const result = await db.collection('questionnaires').add(doc);
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    logger.error({ error }, 'Error creating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/questionnaires/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.authorId;

    if (updates.questions) {
      updates.questionCount = updates.questions.length;
    }
    updates.updatedAt = db.serverDate();

    const result = await db.collection('questionnaires').doc(id).update(updates);

    if (result.updated === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    res.json({ success: true, updated: result.updated });
  } catch (error) {
    logger.error({ error }, 'Error updating questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/questionnaires/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection('questionnaires').doc(id).remove();

    if (result.deleted === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }

    // Clean up related records
    await Promise.all([
      db.collection('patient_tasks').where({ referenceId: id }).remove(),
      db.collection('questionnaire_records').where({ questionnaireId: id }).remove(),
    ]);

    res.json({ success: true, deleted: result.deleted });
  } catch (error) {
    logger.error({ error }, 'Error deleting questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/questionnaires/:id/distribute — send questionnaire to selected patients
router.post('/:id/distribute', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { patientIds } = req.body; // array of { id, name }

    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ error: 'patientIds is required' });
    }

    // Verify questionnaire exists
    const qResult = await db.collection('questionnaires').doc(id).get();
    if (qResult.data.length === 0) {
      return res.status(404).json({ error: 'Questionnaire not found' });
    }
    const questionnaire = qResult.data[0];

    // Create patient tasks in batch
    const tasks = patientIds.map((p: { id: string; name: string }) => ({
      patientId: p.id,
      patientName: p.name,
      taskType: 'questionnaire',
      referenceId: id,
      title: questionnaire.title,
      status: 'pending',
      createdAt: new Date().toISOString(),
      doctorId: req.user?.id,
      doctorName: req.user?.nickName,
    }));

    // CloudBase doesn't support batch add, so we add sequentially
    await Promise.all(tasks.map((task: any) => db.collection('patient_tasks').add(task)));

    // Increment usage count
    await db.collection('questionnaires').doc(id).update({
      usageCount: _.inc(patientIds.length)
    });

    logger.info({ questionnaireId: id, patientCount: patientIds.length }, 'Distributed questionnaire');
    res.json({ success: true, distributed: patientIds.length });
  } catch (error) {
    logger.error({ error }, 'Error distributing questionnaire');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
