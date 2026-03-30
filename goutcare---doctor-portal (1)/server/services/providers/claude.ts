/**
 * Claude Provider（预留骨架）
 *
 * 启用方法：
 * 1. npm install @anthropic-ai/sdk
 * 2. 设置 CLAUDE_API_KEY 环境变量
 * 3. 在 ai-provider-registry.ts 中取消注释注册行
 */

import { AIProvider, Message, ChatOptions, ChatResponse } from '../ai-provider';

export class ClaudeProvider implements AIProvider {
  name = 'claude';

  isAvailable(): boolean {
    return !!process.env.CLAUDE_API_KEY;
  }

  async chat(_messages: Message[], _options?: ChatOptions): Promise<ChatResponse> {
    // TODO: 使用 @anthropic-ai/sdk 实现
    // const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    // const response = await anthropic.messages.create({ model: 'claude-sonnet-4-6', messages, max_tokens: 2048 });
    throw new Error('Claude provider not yet implemented. Install @anthropic-ai/sdk and implement this method.');
  }

  async *chatStream(_messages: Message[], _options?: ChatOptions): AsyncIterable<string> {
    // TODO: 使用 @anthropic-ai/sdk stream 实现
    throw new Error('Claude provider streaming not yet implemented.');
  }
}
