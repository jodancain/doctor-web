const { success, error } = require('../utils/response');
const https = require('https');

function request(options, dataStr) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function askAI(context) {
  const { history } = context;
  
  if (!history || !Array.isArray(history) || history.length === 0) {
    return error(400, '问题不能为空');
  }

  const API_KEY = 'sk-9b375626104d4031ab19d174c3c64fbb';
  
  const messages = [
    { role: "system", content: "你是一个专业的痛风及高尿酸血症健康助手。请用专业、温暖、通俗易懂的中文回答患者的问题。如果用户问了与健康或痛风无关的问题，请礼貌地拒绝回答。注意：你的回答仅供参考，不构成医疗诊断，必须在回答末尾提醒用户“如身体不适请及时就医”。" },
    ...history
  ];

  const dataStr = JSON.stringify({
    model: "qwen-turbo",
    messages: messages
  });

  const options = {
    hostname: 'dashscope.aliyuncs.com',
    path: '/compatible-mode/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(dataStr)
    }
  };

  try {
    const response = await request(options, dataStr);

    if (response.status === 200 && response.data && response.data.choices) {
      const aiReply = response.data.choices[0].message.content;
      return success({ reply: aiReply });
    } else {
      console.error('AI API 报错:', response.data);
      return error(500, 'AI助手暂时开小差了，请稍后再试');
    }
  } catch (err) {
    console.error('调用 AI 失败', err);
    return error(500, '网络请求失败');
  }
}

module.exports = { askAI };
