import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { logger } from '../logger';
import { getHealthContext, Role } from '../services/health-context';
import { providerRegistry } from '../services/ai-provider-registry';
import { Message } from '../services/ai-provider';

const router = Router();

/**
 * POST /api/ai/chat
 * 医生端 CDSS AI 对话（SSE 流式输出）
 * Body: { message: string, history: Array<{role, content}>, patientOpenid?: string }
 */
router.post('/chat', requireAuth, async (req: AuthRequest, res) => {
  const { message, history = [], patientOpenid } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  // SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const messages: Message[] = [];

    // 注入患者健康上下文（医生讨论某患者时）
    if (patientOpenid) {
      try {
        const healthText = await getHealthContext(patientOpenid, Role.DOCTOR, { format: 'text' });
        if (healthText && typeof healthText === 'string') {
          messages.push({ role: 'system', content: healthText });
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to get health context, skipping injection');
      }
    }

    // 追加历史消息 + 当前消息
    // 兼容旧前端：将 'model' 映射为 'assistant'（元器 API 只接受 user/assistant/system）
    messages.push(
      ...history.map((m: { role: string; text?: string; content?: string }) => ({
        role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
        content: m.content || m.text || ''
      })),
      { role: 'user' as const, content: message }
    );

    // 通过 Provider 层流式输出
    const provider = providerRegistry.getDefault();
    let hasStreamedText = false;
    try {
      const stream = provider.chatStream(messages, {
        userId: req.user?.id || 'doctor-anonymous',
      });

      for await (const chunk of stream) {
        if (!chunk) continue;
        hasStreamedText = true;
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    } catch (streamErr) {
      logger.warn({ err: streamErr }, 'AI stream failed, fallback to non-stream mode');
    }

    // 某些 Provider 在流式模式下可能报错或返回 [DONE] 但无文本，降级一次非流式请求兜底
    if (!hasStreamedText) {
      const fallback = await provider.chat(messages, {
        userId: req.user?.id || 'doctor-anonymous',
      });
      if (!fallback.content) {
        throw new Error('AI provider returned empty content');
      }
      res.write(`data: ${JSON.stringify({ text: fallback.content })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    logger.error({ err }, 'AI chat error');
    if (!res.writableEnded) {
      const rawMessage = err?.message || '';
      const friendlyMessage = /Yuanqi (API|stream) error|Yuanqi stream http 400|No available AI provider/i.test(rawMessage)
        ? 'AI 服务暂不可用：请检查元器密钥、智能体发布状态或联系管理员。'
        : (rawMessage || 'AI 服务异常');
      res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
      res.end();
    }
  }
});

export default router;
