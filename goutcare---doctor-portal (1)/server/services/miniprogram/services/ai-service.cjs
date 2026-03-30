const { success, error } = require('../utils/response.cjs');

// 动态加载 TS 模块（已被 ts-node / tsx 编译）
let getHealthContext, Role, providerRegistry;
try {
  const hc = require('../../services/health-context');
  getHealthContext = hc.getHealthContext;
  Role = hc.Role;
  const reg = require('../../services/ai-provider-registry');
  providerRegistry = reg.providerRegistry;
} catch (e) {
  console.warn('[ai-service] 无法加载健康上下文/Provider 模块，使用降级模式:', e.message);
}

async function askAI(context) {
  const { history, openid } = context;

  if (!history || !Array.isArray(history) || history.length === 0) {
    return error(400, '问题不能为空');
  }

  try {
    // 注入患者健康上下文
    let messages = [...history];
    if (getHealthContext && openid) {
      try {
        const healthText = await getHealthContext(openid, Role.PATIENT, { format: 'text' });
        if (healthText) {
          messages = [{ role: 'system', content: healthText }, ...messages];
        }
      } catch (err) {
        console.warn('[ai-service] 健康上下文获取失败，跳过注入:', err.message);
      }
    }

    // 通过 Provider 层调用 AI
    if (providerRegistry) {
      const provider = providerRegistry.getDefault();
      const response = await provider.chat(messages, { userId: openid || 'anonymous-' + Date.now() });
      return success({ reply: response.content });
    }

    // 降级：直接调用元器（Provider 模块未加载时）
    return await askYuanqiDirect(messages, openid);
  } catch (err) {
    console.error('调用 AI 失败', err);
    return error(500, 'AI助手暂时开小差了，请稍后再试');
  }
}

// 降级直调元器（备用）
async function askYuanqiDirect(messages, openid) {
  const https = require('https');
  const APP_KEY = process.env.YUANQI_APP_KEY;
  const APP_ID = process.env.YUANQI_APP_ID;
  if (!APP_KEY || !APP_ID) {
    return error(503, 'AI 服务未配置，请联系管理员');
  }

  // 元器 API 要求：content 必须是 [{type:'text', text:'...'}] 数组格式
  // role 仅支持 user/assistant，且必须交替，从 user 开始
  const normalizedMessages = [];
  for (const msg of messages) {
    const text = (msg.content || '').toString().trim();
    if (!text) continue;
    let role = msg.role === 'assistant' ? 'assistant' : 'user';
    let finalText = text;
    if (msg.role === 'system') {
      role = 'user';
      finalText = `[系统上下文]\n${text}`;
    }
    const last = normalizedMessages[normalizedMessages.length - 1];
    if (last && last.role === role) {
      last.content[0].text += `\n${finalText}`;
      continue;
    }
    normalizedMessages.push({
      role,
      content: [{ type: 'text', text: finalText }]
    });
  }
  if (normalizedMessages.length === 0) {
    normalizedMessages.push({ role: 'user', content: [{ type: 'text', text: '你好' }] });
  }
  if (normalizedMessages[0].role !== 'user') {
    normalizedMessages[0] = {
      role: 'user',
      content: [{ type: 'text', text: `请参考以下助手历史回复继续对话：\n${normalizedMessages[0].content[0].text}` }]
    };
  }

  const dataStr = JSON.stringify({
    assistant_id: APP_ID,
    user_id: openid || 'anonymous-' + Date.now(),
    stream: false,
    messages: normalizedMessages.slice(-40)
  });

  const options = {
    hostname: 'yuanqi.tencent.com',
    path: '/openapi/v1/agent/chat/completions',
    method: 'POST',
    headers: {
      'X-Source': 'openapi',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${APP_KEY}`,
      'Content-Length': Buffer.byteLength(dataStr)
    }
  };

  const response = await new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    req.write(dataStr);
    req.end();
  });

  if (response.status === 200 && response.data && response.data.choices) {
    return success({ reply: response.data.choices[0].message.content });
  }
  console.error('AI API 报错:', response.data);
  return error(500, 'AI助手暂时开小差了，请稍后再试');
}

module.exports = { askAI };
