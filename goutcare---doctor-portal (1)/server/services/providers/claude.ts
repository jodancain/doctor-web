/**
 * Claude Provider — 通过 Anthropic SDK 接入 Claude API
 *
 * 启用方法：
 * 1. npm install @anthropic-ai/sdk（已安装）
 * 2. 设置 CLAUDE_API_KEY 环境变量
 * 3. 可选：设置 CLAUDE_MODEL（默认 claude-sonnet-4-6）
 */

import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, Message, ChatOptions, ChatResponse } from '../ai-provider';

export class ClaudeProvider implements AIProvider {
  name = 'claude';

  private get apiKey() { return process.env.CLAUDE_API_KEY || ''; }
  private get model() { return process.env.CLAUDE_MODEL || 'claude-sonnet-4-6'; }

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const start = Date.now();
    const client = this.getClient();

    // Anthropic API 的 system 需要单独传，不放在 messages 数组里
    const systemMessages = messages.filter(m => m.role === 'system');
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n') || undefined;

    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // 确保首条是 user（Anthropic 要求）
    if (chatMessages.length === 0 || chatMessages[0].role !== 'user') {
      chatMessages.unshift({ role: 'user', content: '你好' });
    }

    const response = await client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 2048,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: chatMessages,
    });

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    return {
      content: textContent,
      provider: 'claude',
      model: response.model,
      latencyMs: Date.now() - start,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
      },
    };
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const client = this.getClient();

    const systemMessages = messages.filter(m => m.role === 'system');
    const systemPrompt = systemMessages.map(m => m.content).join('\n\n') || undefined;

    const chatMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    if (chatMessages.length === 0 || chatMessages[0].role !== 'user') {
      chatMessages.unshift({ role: 'user', content: '你好' });
    }

    const stream = client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens || 2048,
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
