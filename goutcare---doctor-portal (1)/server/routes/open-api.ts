/**
 * Open API v1 — 外部 AI 接入路由
 *
 * 端点前缀: /api/open/v1
 * 认证方式: Bearer API Key
 */

import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireApiKey, ApiKeyRequest } from '../middleware/api-key-auth';
import { getHealthContext, Role } from '../services/health-context';
import { providerRegistry } from '../services/ai-provider-registry';
import { Message } from '../services/ai-provider';
import { db, _ } from '../db';
import { logger } from '../logger';

const router = Router();

// ─── 辅助函数 ───

/** 通过 externalId 查找真实 _openid */
async function resolvePatientId(externalId: string): Promise<string | null> {
  const { data } = await db.collection('apiPatientMapping')
    .where({ externalId })
    .limit(1)
    .get();
  return data[0]?._openid || null;
}

/** 确保患者有 externalId 映射，没有则创建 */
async function ensureMapping(openid: string): Promise<string> {
  const { data } = await db.collection('apiPatientMapping')
    .where({ _openid: openid })
    .limit(1)
    .get();
  if (data[0]) return data[0].externalId;

  const externalId = uuidv4();
  await db.collection('apiPatientMapping').add({
    externalId,
    _openid: openid,
    createdAt: new Date().toISOString(),
  });
  return externalId;
}

// ═══════════════════════════════════════════════
// 数据接口
// ═══════════════════════════════════════════════

/**
 * GET /patients — 患者列表（脱敏）
 */
router.get('/patients', requireApiKey('patients:read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const { data } = await db.collection('users')
      .where({ role: 'user' })
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    const { total } = await db.collection('users').where({ role: 'user' }).count();

    const patients = await Promise.all(data.map(async (u: any) => {
      const externalId = await ensureMapping(u._openid);

      // 最新尿酸
      const { data: uaData } = await db.collection('uaRecords')
        .where({ _openid: u._openid })
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      return {
        id: externalId,
        nickName: u.nickName ? u.nickName.charAt(0) + '*' : '未知',
        gender: u.gender || null,
        age: u.birthDate ? Math.floor((Date.now() - new Date(u.birthDate).getTime()) / (365.25 * 86400000)) : null,
        latestUa: uaData[0]?.value || null,
        lastActive: u.lastLoginAt || u.updatedAt || null,
      };
    }));

    res.json({ total, patients });
  } catch (err) {
    logger.error({ err }, 'Open API: list patients error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /patients/:id/health-context — 患者健康档案（JSON）
 */
router.get('/patients/:id/health-context', requireApiKey('patients:read'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const openid = await resolvePatientId(String(req.params.id));
    if (!openid) return res.status(404).json({ error: 'Patient not found' });

    const context = await getHealthContext(openid, Role.EXTERNAL, { format: 'json' });
    res.json(context);
  } catch (err) {
    logger.error({ err }, 'Open API: health context error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════
// AI 交互接口
// ═══════════════════════════════════════════════

/**
 * POST /ai/test — 单轮测试
 */
router.post('/ai/test', requireApiKey('ai:test'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { patientId, question, includeContext = true, provider: providerName, persona = 'patient' } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });

    let openid: string | null = null;
    let healthData: any = null;
    let injectedContext = '';

    if (patientId) {
      openid = await resolvePatientId(patientId);
      if (!openid) return res.status(404).json({ error: 'Patient not found' });
    }

    const messages: Message[] = [];

    if (includeContext && openid) {
      const textCtx = await getHealthContext(openid, Role.EXTERNAL, { format: 'text' });
      if (typeof textCtx === 'string') {
        injectedContext = textCtx;
        messages.push({ role: 'system', content: textCtx });
      }
      healthData = await getHealthContext(openid, Role.EXTERNAL, { format: 'json' });
    }

    messages.push({ role: 'user', content: question });

    const start = Date.now();
    const provider = (providerName && providerRegistry.get(providerName)) || providerRegistry.getDefault();
    const response = await provider.chat(messages, { userId: openid || 'test-user' });

    const testId = uuidv4();

    res.json({
      testId,
      question,
      yuanqiResponse: response.content,
      injectedContext,
      healthData,
      provider: response.provider,
      model: response.model,
      latencyMs: response.latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, 'Open API: ai test error');
    res.status(500).json({ error: err.message || 'AI test failed' });
  }
});

/**
 * POST /ai/conversation — 多轮对话
 */
router.post('/ai/conversation', requireApiKey('ai:test'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { patientId, conversationId, message, includeContext = true } = req.body;

    if (!message) return res.status(400).json({ error: 'message is required' });

    let openid: string | null = null;
    if (patientId) {
      openid = await resolvePatientId(patientId);
      if (!openid) return res.status(404).json({ error: 'Patient not found' });
    }

    let convId = conversationId;
    let history: Message[] = [];
    let turn = 1;

    if (convId) {
      // 继续已有对话
      const { data } = await db.collection('aiConversations')
        .where({ conversationId: convId })
        .limit(1)
        .get();
      if (data[0]) {
        history = data[0].messages || [];
        turn = (data[0].turn || 0) + 1;
      }
    } else {
      convId = uuidv4();

      // 新对话：注入健康上下文
      if (includeContext && openid) {
        try {
          const textCtx = await getHealthContext(openid, Role.EXTERNAL, { format: 'text' });
          if (typeof textCtx === 'string' && textCtx) {
            history.push({ role: 'system', content: textCtx });
          }
        } catch (e) {
          logger.warn({ err: e }, 'Failed to inject health context for conversation');
        }
      }
    }

    // 追加用户消息
    history.push({ role: 'user', content: message });

    // 调用 AI
    const provider = providerRegistry.getDefault();
    const response = await provider.chat(history, { userId: openid || 'conv-user' });

    // 追加 AI 回复
    history.push({ role: 'assistant', content: response.content });

    // 保存对话
    if (conversationId) {
      await db.collection('aiConversations')
        .where({ conversationId: convId })
        .update({ messages: history, turn, updatedAt: new Date().toISOString() });
    } else {
      await db.collection('aiConversations').add({
        conversationId: convId,
        patientId: patientId || null,
        _openid: openid,
        messages: history,
        turn,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      conversationId: convId,
      turn,
      userMessage: message,
      yuanqiResponse: response.content,
      injectedContext: history.find(m => m.role === 'system')?.content || '',
      fullHistory: history,
    });
  } catch (err: any) {
    logger.error({ err }, 'Open API: conversation error');
    res.status(500).json({ error: err.message || 'Conversation failed' });
  }
});

/**
 * POST /ai/compare — 多 AI 对比测试
 */
router.post('/ai/compare', requireApiKey('ai:test'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { patientId, question, providers: providerNames = [], includeContext = true } = req.body;

    if (!question) return res.status(400).json({ error: 'question is required' });
    if (!providerNames.length) return res.status(400).json({ error: 'providers array is required' });

    let openid: string | null = null;
    const messages: Message[] = [];

    if (patientId) {
      openid = await resolvePatientId(patientId);
      if (!openid) return res.status(404).json({ error: 'Patient not found' });
    }

    if (includeContext && openid) {
      const textCtx = await getHealthContext(openid, Role.EXTERNAL, { format: 'text' });
      if (typeof textCtx === 'string') messages.push({ role: 'system', content: textCtx });
    }

    messages.push({ role: 'user', content: question });

    // 并行调用多个 Provider
    const responses: Record<string, any> = {};
    await Promise.all(providerNames.map(async (name: string) => {
      const provider = providerRegistry.get(name);
      if (!provider || !provider.isAvailable()) {
        responses[name] = { error: `Provider "${name}" not available` };
        return;
      }
      try {
        const r = await provider.chat(messages, { userId: openid || 'compare-user' });
        responses[name] = { content: r.content, latencyMs: r.latencyMs, model: r.model };
      } catch (err: any) {
        responses[name] = { error: err.message };
      }
    }));

    res.json({
      question,
      responses,
      injectedContext: messages.find(m => m.role === 'system')?.content || '',
    });
  } catch (err: any) {
    logger.error({ err }, 'Open API: compare error');
    res.status(500).json({ error: err.message || 'Compare failed' });
  }
});

/**
 * POST /ai/batch-test — 批量测试
 */
router.post('/ai/batch-test', requireApiKey('ai:test'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { patientId, testSuite, questions: customQuestions } = req.body;

    let questions = customQuestions;

    // 从预定义测试集加载
    if (testSuite && !customQuestions) {
      const { data } = await db.collection('aiTestSuites')
        .where({ name: testSuite })
        .limit(1)
        .get();
      if (!data[0]) return res.status(404).json({ error: `Test suite "${testSuite}" not found` });
      questions = data[0].questions;
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions array or testSuite is required' });
    }

    let openid: string | null = null;
    let contextText = '';
    if (patientId) {
      openid = await resolvePatientId(patientId);
      if (openid) {
        const ctx = await getHealthContext(openid, Role.EXTERNAL, { format: 'text' });
        if (typeof ctx === 'string') contextText = ctx;
      }
    }

    const provider = providerRegistry.getDefault();
    const results: any[] = [];
    let totalLatency = 0;
    let passed = 0;

    // 顺序执行（避免 rate limit）
    for (const q of questions) {
      const msgs: Message[] = [];
      if (contextText) msgs.push({ role: 'system', content: contextText });
      msgs.push({ role: 'user', content: q.question });

      try {
        const response = await provider.chat(msgs, { userId: openid || 'batch-test' });
        totalLatency += response.latencyMs;

        // 自动检查
        const autoCheck = {
          mentionedExpectedTopics: [] as string[],
          missedTopics: [] as string[],
          mentionedRequired: [] as string[],
          missedRequired: [] as string[],
          mentionedForbidden: [] as string[],
          passedAllChecks: true,
        };

        const text = response.content;

        for (const topic of (q.expectedTopics || [])) {
          if (text.includes(topic)) autoCheck.mentionedExpectedTopics.push(topic);
          else autoCheck.missedTopics.push(topic);
        }
        for (const must of (q.mustMention || [])) {
          if (text.includes(must)) autoCheck.mentionedRequired.push(must);
          else { autoCheck.missedRequired.push(must); autoCheck.passedAllChecks = false; }
        }
        for (const forbidden of (q.mustNotMention || [])) {
          if (text.includes(forbidden)) { autoCheck.mentionedForbidden.push(forbidden); autoCheck.passedAllChecks = false; }
        }

        if (autoCheck.passedAllChecks) passed++;

        results.push({
          id: q.id || results.length,
          question: q.question,
          yuanqiResponse: response.content,
          latencyMs: response.latencyMs,
          autoCheck,
        });
      } catch (err: any) {
        results.push({
          id: q.id || results.length,
          question: q.question,
          error: err.message,
        });
      }
    }

    const batchId = uuidv4();

    // 保存结果
    await db.collection('aiBatchResults').add({
      batchId,
      patientId,
      testSuite: testSuite || 'custom',
      total: questions.length,
      passed,
      results,
      createdAt: new Date().toISOString(),
    });

    res.json({
      batchId,
      total: questions.length,
      results,
      summary: {
        passRate: `${Math.round(passed / questions.length * 100)}%`,
        avgLatencyMs: Math.round(totalLatency / results.filter(r => r.latencyMs).length) || 0,
      },
    });
  } catch (err: any) {
    logger.error({ err }, 'Open API: batch test error');
    res.status(500).json({ error: err.message || 'Batch test failed' });
  }
});

// ═══════════════════════════════════════════════
// 评估接口
// ═══════════════════════════════════════════════

/**
 * POST /ai/evaluate — 提交单条评估
 */
router.post('/ai/evaluate', requireApiKey('ai:evaluate'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { testId, question, yuanqiResponse, evaluator, scores, feedback, suggestedResponse } = req.body;

    if (!scores) return res.status(400).json({ error: 'scores is required' });

    const evaluation = {
      testId: testId || uuidv4(),
      question,
      yuanqiResponse,
      evaluator: evaluator || 'unknown',
      scores,
      feedback: feedback || '',
      suggestedResponse: suggestedResponse || '',
      apiKeyName: req.apiKey?.name,
      createdAt: new Date().toISOString(),
    };

    await db.collection('aiEvaluations').add(evaluation);
    res.json({ success: true, evaluationId: evaluation.testId });
  } catch (err: any) {
    logger.error({ err }, 'Open API: evaluate error');
    res.status(500).json({ error: err.message || 'Evaluation failed' });
  }
});

/**
 * POST /ai/review-session — 提交完整对话评审
 */
router.post('/ai/review-session', requireApiKey('ai:evaluate'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { conversationId, evaluator, review } = req.body;

    if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });
    if (!review) return res.status(400).json({ error: 'review is required' });

    const sessionReview = {
      conversationId,
      evaluator: evaluator || 'unknown',
      review,
      apiKeyName: req.apiKey?.name,
      createdAt: new Date().toISOString(),
    };

    await db.collection('aiEvaluations').add(sessionReview);
    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'Open API: review session error');
    res.status(500).json({ error: err.message || 'Review failed' });
  }
});

/**
 * GET /ai/evaluations — 查看评估历史
 */
router.get('/ai/evaluations', requireApiKey('ai:evaluate'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const { data } = await db.collection('aiEvaluations')
      .orderBy('createdAt', 'desc')
      .skip(offset)
      .limit(limit)
      .get();

    const { total } = await db.collection('aiEvaluations').count();
    res.json({ total, evaluations: data });
  } catch (err) {
    logger.error({ err }, 'Open API: list evaluations error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════════
// 知识 & 测试集
// ═══════════════════════════════════════════════

/**
 * GET /ai/knowledge — 元器知识摘要
 */
router.get('/ai/knowledge', requireApiKey('ai:knowledge'), async (_req: ApiKeyRequest, res: Response) => {
  res.json({
    agent: {
      name: '小风',
      id: process.env.YUANQI_APP_ID || '',
      provider: 'yuanqi',
      description: '痛风/高尿酸血症健康管理助手',
    },
    capabilities: [
      '痛风基础知识问答',
      '饮食嘌呤含量查询',
      '用药常识解答',
      '生活方式建议',
      '发作急性期指导',
    ],
    limitations: [
      '不能开处方',
      '不能替代医生诊断',
      '不了解患者实时检查报告（需通过上下文注入）',
    ],
    systemPromptSummary: '角色：痛风健康管理AI助手；风格：专业但亲切；约束：不诊断不开药，建议就医场景明确提醒',
    contextInjection: {
      enabled: true,
      dataFields: ['profile', 'uricAcid', 'attacks', 'medications', 'water', 'exercise', 'diet'],
    },
    availableProviders: providerRegistry.listAvailable(),
    lastUpdated: '2026-03-27',
  });
});

/**
 * GET /ai/test-suites — 查看测试集
 */
router.get('/ai/test-suites', requireApiKey('ai:knowledge'), async (_req: ApiKeyRequest, res: Response) => {
  try {
    const { data } = await db.collection('aiTestSuites').orderBy('createdAt', 'desc').limit(50).get();
    res.json({ testSuites: data });
  } catch (err) {
    logger.error({ err }, 'Open API: list test suites error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /ai/test-suites — 创建测试集
 */
router.post('/ai/test-suites', requireApiKey('ai:knowledge'), async (req: ApiKeyRequest, res: Response) => {
  try {
    const { name, description, questions } = req.body;
    if (!name || !questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'name and questions are required' });
    }

    await db.collection('aiTestSuites').add({
      name,
      description: description || '',
      questions,
      createdBy: req.apiKey?.name || 'unknown',
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, name });
  } catch (err: any) {
    logger.error({ err }, 'Open API: create test suite error');
    res.status(500).json({ error: err.message || 'Failed to create test suite' });
  }
});

export default router;
