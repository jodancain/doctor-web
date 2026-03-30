/**
 * AI Provider 注册中心
 *
 * 管理多个 AI 提供商，支持按名称获取、设置默认、列出可用。
 */

import { AIProvider } from './ai-provider';
import { YuanqiProvider } from './providers/yuanqi';
import { logger } from '../logger';

class AIProviderRegistry {
  private providers = new Map<string, AIProvider>();
  private _defaultName: string;

  constructor() {
    this._defaultName = process.env.AI_DEFAULT_PROVIDER || 'yuanqi';
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider);
    logger.info(`AI Provider registered: ${provider.name} (available: ${provider.isAvailable()})`);
  }

  get(name: string): AIProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): AIProvider {
    const p = this.providers.get(this._defaultName);
    if (p && p.isAvailable()) return p;

    // 回退到第一个可用的
    for (const provider of this.providers.values()) {
      if (provider.isAvailable()) return provider;
    }

    throw new Error('No available AI provider configured');
  }

  setDefault(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" is not registered`);
    }
    this._defaultName = name;
  }

  listAvailable(): string[] {
    return Array.from(this.providers.values())
      .filter(p => p.isAvailable())
      .map(p => p.name);
  }

  listAll(): string[] {
    return Array.from(this.providers.keys());
  }
}

// ─── 单例 ───

export const providerRegistry = new AIProviderRegistry();

// 自动注册内置 Provider
providerRegistry.register(new YuanqiProvider());

// 预留：当配置了 CLAUDE_API_KEY 时自动注册
// import { ClaudeProvider } from './providers/claude';
// if (process.env.CLAUDE_API_KEY) providerRegistry.register(new ClaudeProvider());

// 预留：当配置了 OPENAI_API_KEY 时自动注册
// import { OpenAIProvider } from './providers/openai';
// if (process.env.OPENAI_API_KEY) providerRegistry.register(new OpenAIProvider());
