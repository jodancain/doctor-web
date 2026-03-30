/**
 * OpenAI Provider（预留骨架）
 *
 * 启用方法：
 * 1. npm install openai
 * 2. 设置 OPENAI_API_KEY 环境变量
 * 3. 在 ai-provider-registry.ts 中取消注释注册行
 */

import { AIProvider, Message, ChatOptions, ChatResponse } from '../ai-provider';

export class OpenAIProvider implements AIProvider {
  name = 'openai';

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async chat(_messages: Message[], _options?: ChatOptions): Promise<ChatResponse> {
    // TODO: 使用 openai SDK 实现
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // const response = await openai.chat.completions.create({ model: 'gpt-4', messages });
    throw new Error('OpenAI provider not yet implemented. Install openai SDK and implement this method.');
  }

  async *chatStream(_messages: Message[], _options?: ChatOptions): AsyncIterable<string> {
    // TODO: 使用 openai SDK stream 实现
    throw new Error('OpenAI provider streaming not yet implemented.');
  }
}
