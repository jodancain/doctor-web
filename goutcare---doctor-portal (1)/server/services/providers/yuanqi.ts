/**
 * 腾讯元器 Provider — 实现 AIProvider 接口
 */

import https from 'https';
import { AIProvider, Message, ChatOptions, ChatResponse } from '../ai-provider';

function httpsPost(options: https.RequestOptions, body: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', (chunk) => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, data: JSON.parse(buf) });
        } catch {
          resolve({ status: res.statusCode || 0, data: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export class YuanqiProvider implements AIProvider {
  name = 'yuanqi';

  private get appId() { return process.env.YUANQI_APP_ID || ''; }
  private get appKey() { return process.env.YUANQI_APP_KEY || ''; }

  isAvailable(): boolean {
    return !!(this.appId && this.appKey);
  }

  /**
   * 按腾讯元器文档规范整理消息：
   * 1) content 必须是 [{ type:'text', text }]
   * 2) role 仅支持 user/assistant
   * 3) 要求 user/assistant 交替，且从 user 开始
   */
  private normalizeMessages(messages: Message[]): Array<{ role: 'user' | 'assistant'; content: Array<{ type: 'text'; text: string }> }> {
    const normalized: Array<{ role: 'user' | 'assistant'; content: Array<{ type: 'text'; text: string }> }> = [];

    for (const item of messages) {
      const text = (item.content || '').toString().trim();
      if (!text) continue;

      // 元器不支持 system，这里将其降级为 user 上下文文本
      let role: 'user' | 'assistant' = item.role === 'assistant' ? 'assistant' : 'user';
      let finalText = text;
      if (item.role === 'system') {
        role = 'user';
        finalText = `[系统上下文]\n${text}`;
      }

      const last = normalized[normalized.length - 1];
      // 保证交替：连续同角色时合并为一条
      if (last && last.role === role) {
        last.content[0].text += `\n${finalText}`;
        continue;
      }

      normalized.push({
        role,
        content: [{ type: 'text', text: finalText }],
      });
    }

    if (normalized.length === 0) {
      return [{ role: 'user', content: [{ type: 'text', text: '你好' }] }];
    }

    // 元器要求 user 开始；若首条不是 user，则转成 user 语义
    if (normalized[0].role !== 'user') {
      normalized[0] = {
        role: 'user',
        content: [{ type: 'text', text: `请参考以下助手历史回复继续对话：\n${normalized[0].content[0].text}` }],
      };
    }

    // 首条从 assistant 改成 user 后，常与下一条真实 user 连续，元器要求 user/assistant 严格交替，需合并相邻同角色
    let i = 0;
    while (i < normalized.length - 1) {
      if (normalized[i].role === normalized[i + 1].role) {
        normalized[i].content[0].text += `\n${normalized[i + 1].content[0].text}`;
        normalized.splice(i + 1, 1);
      } else {
        i += 1;
      }
    }

    return normalized.slice(-40);
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
    const start = Date.now();
    const yuanqiMessages = this.normalizeMessages(messages);

    const body = JSON.stringify({
      assistant_id: this.appId,
      user_id: options.userId || 'anonymous-' + Date.now(),
      stream: false,
      messages: yuanqiMessages,
    });

    const reqOpts: https.RequestOptions = {
      hostname: 'yuanqi.tencent.com',
      path: '/openapi/v1/agent/chat/completions',
      method: 'POST',
      headers: {
        'X-Source': 'openapi',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.appKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const res = await httpsPost(reqOpts, body);

    if (res.status === 200 && res.data?.choices) {
      return {
        content: res.data.choices[0].message.content,
        provider: 'yuanqi',
        model: `yuanqi/${this.appId}`,
        latencyMs: Date.now() - start,
        usage: res.data.usage ? {
          promptTokens: res.data.usage.prompt_tokens || 0,
          completionTokens: res.data.usage.completion_tokens || 0,
        } : undefined,
      };
    }

    throw new Error(`Yuanqi API error: ${JSON.stringify(res.data)}`);
  }

  async *chatStream(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
    const yuanqiMessages = this.normalizeMessages(messages);
    const body = JSON.stringify({
      assistant_id: this.appId,
      user_id: options.userId || 'doctor-anonymous',
      stream: true,
      messages: yuanqiMessages,
    });

    const reqOpts: https.RequestOptions = {
      hostname: 'yuanqi.tencent.com',
      path: '/openapi/v1/agent/chat/completions',
      method: 'POST',
      headers: {
        'X-Source': 'openapi',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.appKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    // 将 Node.js 流转换为 AsyncIterable（支持 SSE 分片、格式兼容与错误透传）
    const chunks: string[] = [];
    let notify: (() => void) | null = null;
    let done = false;
    let error: Error | null = null;
    let rawBuffer = '';
    let errorBody = '';

    const pushChunk = (text?: unknown) => {
      if (typeof text === 'string' && text.length > 0) {
        chunks.push(text);
        notify?.();
      }
    };

    const extractContent = (parsed: any): string => {
      return (
        parsed?.choices?.[0]?.delta?.content ||
        parsed?.choices?.[0]?.message?.content ||
        parsed?.data?.choices?.[0]?.delta?.content ||
        parsed?.data?.choices?.[0]?.message?.content ||
        parsed?.output_text ||
        ''
      );
    };

    const req = https.request(reqOpts, (res) => {
      const status = res.statusCode || 0;
      res.setEncoding('utf8');

      res.on('data', (chunk: string) => {
        // 非 200 时通常为 JSON 错误体，先完整收集后抛错
        if (status !== 200) {
          errorBody += chunk;
          return;
        }

        rawBuffer += chunk;
        let newlineIndex = rawBuffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = rawBuffer.slice(0, newlineIndex).trim();
          rawBuffer = rawBuffer.slice(newlineIndex + 1);

          if (!line.startsWith('data:')) {
            newlineIndex = rawBuffer.indexOf('\n');
            continue;
          }

          const payload = line.slice(5).trim();
          if (!payload) {
            newlineIndex = rawBuffer.indexOf('\n');
            continue;
          }

          if (payload === '[DONE]') {
            done = true;
            notify?.();
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed?.error) {
              error = new Error(parsed.error?.message || parsed.error || 'Yuanqi stream error');
              done = true;
              notify?.();
              return;
            }
            pushChunk(extractContent(parsed));
          } catch {
            // 分片中可能包含不完整 JSON，忽略该行并继续等待后续数据
          }
          newlineIndex = rawBuffer.indexOf('\n');
        }
      });

      res.on('end', () => {
        if (status !== 200) {
          error = new Error(`Yuanqi stream http ${status}: ${errorBody || 'unknown error'}`);
        }
        done = true;
        notify?.();
      });
      res.on('error', (e) => {
        error = e;
        done = true;
        notify?.();
      });
    });

    req.on('error', (e) => {
      error = e;
      done = true;
      notify?.();
    });
    req.write(body);
    req.end();

    // Yield chunks as they arrive
    while (true) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else if (done) {
        if (error) throw error;
        return;
      } else {
        await new Promise<void>((r) => {
          notify = r;
        });
      }
    }
  }
}
