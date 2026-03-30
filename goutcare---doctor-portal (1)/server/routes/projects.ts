import { Router, Response } from 'express';
import { db } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireDoctor);

// GET /api/projects
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const { data } = await db.collection('research_projects')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    res.json({ items: data || [] });
  } catch (error) {
    logger.error({ error }, 'Error fetching projects');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const result = await db.collection('research_projects').doc(req.params.id).get();
    if (!result.data || result.data.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.data[0]);
  } catch (error) {
    logger.error({ error }, 'Error fetching project');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, targetCount, status, startDate, endDate } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const doc = {
      name,
      description: description || '',
      targetCount: targetCount || 0,
      enrolledCount: 0,
      status: status || '设计中',
      startDate: startDate || null,
      endDate: endDate || null,
      createdBy: (req as any).user?.username || 'doctor',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const result = await db.collection('research_projects').add(doc);
    res.status(201).json({ success: true, id: result.id || result._id });
  } catch (error) {
    logger.error({ error }, 'Error creating project');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, targetCount, enrolledCount, status, startDate, endDate } = req.body;
    await db.collection('research_projects').doc(req.params.id).update({
      name, description, targetCount, enrolledCount, status, startDate, endDate, updatedAt: Date.now()
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error updating project');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('research_projects').doc(req.params.id).remove();
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error deleting project');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
