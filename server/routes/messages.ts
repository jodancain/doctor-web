import { Router, Response } from 'express';
import { prisma } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireDoctor);

// GET /api/messages/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const unreadCount = await prisma.message.count({
      where: { receiverId: req.user!.id, senderRole: 'patient', read: false },
    });
    res.json({ unreadCount });
  } catch (error) {
    logger.error({ error }, 'Error fetching unread count');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversations
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;

    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: doctorId }, { receiverId: doctorId }] },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Group by conversationId
    const convMap = new Map<string, any>();

    for (const msg of messages) {
      if (!convMap.has(msg.conversationId)) {
        const isFromPatient = msg.senderRole === 'patient';
        convMap.set(msg.conversationId, {
          id: msg.conversationId,
          patientId: isFromPatient ? msg.senderId : msg.receiverId,
          patientName: isFromPatient ? msg.senderName : (msg.receiverName || '患者'),
          lastMessage: msg.content.substring(0, 100),
          lastMessageTime: Number(msg.createdAt),
          unreadCount: 0,
        });
      }

      const conv = convMap.get(msg.conversationId)!;
      if (msg.senderRole === 'patient' && !msg.read && msg.receiverId === doctorId) {
        conv.unreadCount++;
      }
    }

    const conversations = Array.from(convMap.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    res.json({ items: conversations });
  } catch (error) {
    logger.error({ error }, 'Error fetching conversations');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/:patientOpenid
router.get('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = `${req.user!.id}_${req.params.patientOpenid}`;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = parseInt(req.query.before as string) || Date.now();

    const messages = await prisma.message.findMany({
      where: { conversationId, createdAt: { lt: BigInt(before) } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const items = messages.reverse().map(msg => ({ ...msg, createdAt: Number(msg.createdAt) }));
    res.json({ items, hasMore: messages.length === limit });
  } catch (error) {
    logger.error({ error }, 'Error fetching messages');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:patientOpenid
router.post('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const doctorName = req.user!.nickName || '';
    const { patientOpenid } = req.params;
    const { content, type = 'text' } = req.body;
    let { patientName } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    if (!patientName) {
      const patient = await prisma.user.findFirst({ where: { openid: patientOpenid } });
      patientName = patient?.nickName || patient?.name || '患者';
    }

    const conversationId = `${doctorId}_${patientOpenid}`;
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: doctorId,
        senderRole: 'doctor',
        senderName: doctorName,
        receiverId: patientOpenid,
        receiverName: patientName,
        content: content.trim(),
        type,
        createdAt: BigInt(Date.now()),
      },
    });

    res.status(201).json({
      success: true,
      id: message.id,
      message: { ...message, createdAt: Number(message.createdAt) },
    });
  } catch (error) {
    logger.error({ error }, 'Error sending message');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:patientOpenid/read
router.put('/:patientOpenid/read', async (req: AuthRequest, res: Response) => {
  try {
    const conversationId = `${req.user!.id}_${req.params.patientOpenid}`;
    const result = await prisma.message.updateMany({
      where: { conversationId, senderRole: 'patient', receiverId: req.user!.id, read: false },
      data: { read: true },
    });
    res.json({ success: true, updated: result.count });
  } catch (error) {
    logger.error({ error }, 'Error marking messages as read');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
