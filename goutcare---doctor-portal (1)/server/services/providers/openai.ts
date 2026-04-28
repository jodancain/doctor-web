/**
 * OpenAI Provider — 通过 OpenAI SDK 接入 GPT 系列
 *
 * 启用方法：
 * 1. npm install openai（已安装）
 * 2. 设置 OPENAI_API_KEY 环境变量
 * 3. 可选：设置 OPENAI_MODEL（默认 gpt-4o）
 * 4. 可选：设置 OPENAI_BASE_URL（用于兼容 API 代理）
 */

import OpenAI from 'openai';
import { AIProvider, Message, ChatOptions, ChatResponse } from '../ai-provider';

export class OpenAIProvider implements AIProvider {
  name = 'openai';

  private get apiKey() { return process.env.OPENAI_API_KEY || ''; }
  private get model() { return process.env.OPENAI_MODEL || 'gpt-4o'; }
  private get baseURL() { return process.env.OPENAI_BASE_URL || undefined; }

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        ...(this.baseURL ? { baseURL: this.baseURL } : {}),
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const start = Date.now();
    const client = this.getClient();

    const response = await client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content || '',
      provider: 'openai',
      model: response.model,
      latencyMs: Date.now() - start,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      } : undefined,
    };
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
      ...(options?.temperature !== undefined ? { temperature: options.temperature } : {}),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}
