/**
 * AI Provider 统一接口定义
 *
 * 所有 AI 提供商（元器/Claude/OpenAI/...）都实现此接口，
 * 通过 Registry 注册后可统一调用和切换。
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  userId?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  latencyMs: number;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AIProvider {
  /** 提供商名称 'yuanqi' | 'claude' | 'openai' */
  name: string;

  /** 单轮对话（非流式），返回完整回复 */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;

  /**
   * 流式对话 — 返回一个 AsyncIterable，逐块产出文本
   * 调用方可 for-await-of 遍历写入 SSE
   */
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string>;

  /** 检查此 Provider 是否已正确配置（API Key 等） */
  isAvailable(): boolean;
}
