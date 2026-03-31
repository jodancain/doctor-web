import { Router, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// GET /api/education
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string;
    const q = req.query.q as string;

    const where: any = {};
    if (category && category !== '全部') where.category = category;
    if (q) where.title = { contains: q };

    const [total, data] = await Promise.all([
      prisma.educationArticle.count({ where }),
      prisma.educationArticle.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const items = data.map(item => ({
      ...item,
      time: item.createdAt.toISOString().replace('T', ' ').substring(0, 16),
    }));

    res.json({ items, total, limit, offset });
  } catch (error) {
    logger.error({ error }, 'Error fetching education articles');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/education/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const article = await prisma.educationArticle.findUnique({ where: { id: req.params.id } });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json(article);
  } catch (error) {
    logger.error({ error }, 'Error fetching article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/education (doctor only)
router.post('/', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, readTime, coverUrl, status } = req.body;
    const article = await prisma.educationArticle.create({
      data: {
        title,
        content,
        category,
        readTime: readTime || 3,
        coverUrl,
        status: status || '草稿',
        authorId: req.user!.id,
      },
    });
    res.status(201).json({ success: true, id: article.id });
  } catch (error) {
    logger.error({ error }, 'Error creating article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/education/:id (doctor only)
router.put('/:id', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, readTime, coverUrl, status } = req.body;
    const result = await prisma.educationArticle.update({
      where: { id: req.params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(readTime !== undefined && { readTime }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(status !== undefined && { status }),
      },
    });
    res.json({ success: true, updated: 1 });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Article not found' });
    logger.error({ error }, 'Error updating article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/education/:id (doctor only)
router.delete('/:id', requireDoctor, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.educationArticle.delete({ where: { id: req.params.id } });
    res.json({ success: true, deleted: 1 });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Article not found' });
    logger.error({ error }, 'Error deleting article');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
