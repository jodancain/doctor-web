import { Router, Response } from 'express';
import { db, _ } from '../db';
import { logger } from '../logger';
import { requireAuth, requireDoctor, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(requireAuth, requireDoctor);

// GET /api/messages/unread-count — total unread messages for this doctor
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const result = await db.collection('messages').where({
      receiverId: doctorId,
      senderRole: 'patient',
      read: false,
    }).count();

    res.json({ unreadCount: result.total });
  } catch (error) {
    logger.error({ error }, 'Error fetching unread count');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversations — list of conversations for this doctor
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;

    // Fetch all messages involving this doctor, sorted by time desc
    const result = await db.collection('messages')
      .where(_.or([
        { senderId: doctorId },
        { receiverId: doctorId },
      ]))
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();

    // Group by conversationId to build conversation list
    const convMap = new Map<string, {
      id: string;
      patientId: string;
      patientName: string;
      patientAvatar?: string;
      lastMessage: string;
      lastMessageTime: number;
      unreadCount: number;
    }>();

    for (const msg of result.data) {
      const convId = msg.conversationId;
      if (!convMap.has(convId)) {
        // Determine patient info from message
        const isFromPatient = msg.senderRole === 'patient';
        convMap.set(convId, {
          id: convId,
          patientId: isFromPatient ? msg.senderId : msg.receiverId,
          patientName: isFromPatient ? msg.senderName : (msg.receiverName || '患者'),
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 0,
        });
      }

      // Count unread messages from patient
      const conv = convMap.get(convId)!;
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

// GET /api/messages/:patientOpenid — get chat history with a patient
router.get('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const { patientOpenid } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const before = parseInt(req.query.before as string) || Date.now();

    const conversationId = `${doctorId}_${patientOpenid}`;

    const result = await db.collection('messages')
      .where({
        conversationId,
        createdAt: _.lt(before),
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    // Return in chronological order
    const items = result.data.reverse().map((msg: any) => ({
      ...msg,
      id: msg._id,
    }));

    res.json({ items, hasMore: result.data.length === limit });
  } catch (error) {
    logger.error({ error }, 'Error fetching messages');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:patientOpenid — doctor sends message to patient
router.post('/:patientOpenid', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const doctorName = req.user!.nickName;
    const { patientOpenid } = req.params;
    const { content, type = 'text' } = req.body;
    let { patientName } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Look up patient name from database if not provided
    if (!patientName) {
      try {
        const patientResult = await db.collection('users').where({ _openid: patientOpenid }).limit(1).get();
        if (patientResult.data.length > 0) {
          const patient = patientResult.data[0];
          patientName = patient.nickName || patient.name || '患者';
        }
      } catch {
        // Fallback to default
      }
    }
    patientName = patientName || '患者';

    const conversationId = `${doctorId}_${patientOpenid}`;

    const message = {
      conversationId,
      senderId: doctorId,
      senderRole: 'doctor',
      senderName: doctorName,
      receiverId: patientOpenid,
      receiverName: patientName,
      content: content.trim(),
      type,
      createdAt: Date.now(),
      read: false,
    };

    const result = await db.collection('messages').add(message);

    res.status(201).json({
      success: true,
      id: result.id,
      message: { ...message, id: result.id },
    });
  } catch (error) {
    logger.error({ error }, 'Error sending message');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:patientOpenid/read — mark messages as read
router.put('/:patientOpenid/read', async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = req.user!.id;
    const { patientOpenid } = req.params;
    const conversationId = `${doctorId}_${patientOpenid}`;

    const result = await db.collection('messages').where({
      conversationId,
      senderRole: 'patient',
      receiverId: doctorId,
      read: false,
    }).update({ read: true });

    res.json({ success: true, updated: result.updated });
  } catch (error) {
    logger.error({ error }, 'Error marking messages as read');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
