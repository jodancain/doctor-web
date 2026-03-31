import { Router, Response } from 'express';
import { db, _ } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth to all education routes
router.use(requireAuth);

const COLLECTION_NAME = 'education_articles';

// GET /api/education
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;
    const q = req.query.q as string;

    const conditions: any[] = [];

    if (category && category !== '全部') {
      conditions.push({ category });
    }

    if (q) {
      const searchRegex = db.RegExp({ regexp: q, options: 'i' });
      conditions.push({ title: searchRegex });
    }

    const query = conditions.length > 0 ? (conditions.length === 1 ? conditions[0] : _.and(conditions)) : {};

    const [countResult, dataResult] = await Promise.all([
      db.collection(COLLECTION_NAME).where(query).count(),
      db.collection(COLLECTION_NAME)
        .where(query)
        .skip(offset)
        .limit(limit)
        .orderBy('createdAt', 'desc')
        .get()
    ]);

    // Format dates for frontend if needed (CloudBase returns $date object sometimes depending on how it was inserted)
    const formattedData = dataResult.data.map(item => ({
      ...item,
      id: item._id, // map _id to id for frontend compatibility
      createdAt: item.createdAt?.$date || item.createdAt,
      updatedAt: item.updatedAt?.$date || item.updatedAt,
      time: new Date(item.createdAt?.$date || item.createdAt || Date.now()).toISOString().replace('T', ' ').substring(0, 16)
    }));

    res.json({
      items: formattedData,
      total: countResult.total,
      limit,
      offset
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching education articles');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/education/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection(COLLECTION_NAME).doc(id).get();
    
    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    const article = result.data[0];
    res.json({
      ...article,
      id: article._id
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching article details');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/education (doctor only)
router.post('/', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const article = req.body;
    
    const doc = {
      ...article,
      authorId: req.user?.id || 'system',
      views: 0,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    };
    
    const result = await db.collection(COLLECTION_NAME).add(doc);
    res.status(201).json({ success: true, id: result.id });
  } catch (error) {
    logger.error({ error }, 'Error creating article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/education/:id (doctor only)
router.put('/:id', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Remove protected fields
    delete updates._id;
    delete updates.id;
    delete updates.createdAt;
    delete updates.authorId;
    
    updates.updatedAt = db.serverDate();
    
    const result = await db.collection(COLLECTION_NAME).doc(id).update(updates);
    
    if (result.updated === 0) {
      return res.status(404).json({ error: 'Article not found or no changes made' });
    }
    
    res.json({ success: true, updated: result.updated });
  } catch (error) {
    logger.error({ error }, 'Error updating article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/education/:id (doctor only)
router.delete('/:id', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.collection(COLLECTION_NAME).doc(id).remove();
    
    if (result.deleted === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    res.json({ success: true, deleted: result.deleted });
  } catch (error) {
    logger.error({ error }, 'Error deleting article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;