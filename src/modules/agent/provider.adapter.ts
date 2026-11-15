import { AgentContext, AgentToolDef } from './agent.tools.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

export interface AIProviderResult {
  toolName?: string;
  toolArgs?: any;
  textResponse?: string;
  provider: 'gemini' | 'local_deterministic';
}

export interface AIProviderAdapter {
  processPrompt(context: AgentContext, prompt: string, tools: Record<string, AgentToolDef>): Promise<AIProviderResult>;
}

export class DeterministicLocalAdapter implements AIProviderAdapter {
  async processPrompt(_context: AgentContext, prompt: string): Promise<AIProviderResult> {
    const normalized = prompt.trim().toLowerCase();

    if (
      normalized.includes('dead') ||
      normalized.includes('slow moving') ||
      normalized.includes('ruka hua') ||
      normalized.includes('stagnant') ||
      normalized.includes('ageing')
    ) {
      return { toolName: 'get_dead_stock_summary', toolArgs: {}, provider: 'local_deterministic' };
    }

    if (
      normalized.includes('budget') ||
      normalized.includes('cash limit') ||
      normalized.includes('paise kam') ||
      normalized.includes('allocation')
    ) {
      const match = normalized.match(/(\d+)/);
      const limit = match ? parseInt(match[0], 10) : 5000;
      return { toolName: 'get_cash_budget_plan', toolArgs: { budgetLimit: limit }, provider: 'local_deterministic' };
    }

    if (
      normalized.includes('khata') ||
      normalized.includes('udhaar') ||
      normalized.includes('udhaari') ||
      normalized.includes('credit') ||
      normalized.includes('receivable')
    ) {
      return { toolName: 'get_khata_summary', toolArgs: {}, provider: 'local_deterministic' };
    }

    if (
      normalized.includes('festival') ||
      normalized.includes('diwali') ||
      normalized.includes('eid') ||
      normalized.includes('holi') ||
      normalized.includes('pongal') ||
      normalized.includes('tyohar')
    ) {
      return { toolName: 'plan_festival_demand', toolArgs: { festivalId: 'diwali' }, provider: 'local_deterministic' };
    }

    if (
      normalized.includes('reorder') ||
      normalized.includes('mangwana') ||
      normalized.includes('replenish') ||
      normalized.includes('order suggestion') ||
      normalized.includes('what should i order')
    ) {
      return { toolName: 'calculate_reorder', toolArgs: { windowDays: 14 }, provider: 'local_deterministic' };
    }

    if (
      (normalized.includes('low') && normalized.includes('stock')) ||
      normalized.includes('kam stock') ||
      normalized.includes('khatam') ||
      normalized.includes('out of stock')
    ) {
      return { toolName: 'get_low_stock_items', toolArgs: {}, provider: 'local_deterministic' };
    }

    if (
      normalized.includes('expiry') ||
      normalized.includes('expire') ||
      normalized.includes('kharab')
    ) {
      return { toolName: 'get_expiry_risks', toolArgs: { horizonDays: 30 }, provider: 'local_deterministic' };
    }

    return { toolName: 'get_inventory_summary', toolArgs: {}, provider: 'local_deterministic' };
  }
}

export class GeminiProviderAdapter implements AIProviderAdapter {
  private localFallback = new DeterministicLocalAdapter();

  async processPrompt(context: AgentContext, prompt: string, tools: Record<string, AgentToolDef>): Promise<AIProviderResult> {
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return this.localFallback.processPrompt(context, prompt);
    }

    try {
      // Build tool declarations
      const functionDeclarations = Object.values(tools).map(t => ({
        name: t.name,
        description: t.description,
        parameters: {
          type: 'OBJECT',
          properties: {}
        }
      }));

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ functionDeclarations }]
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        logger.warn(`Gemini API returned status ${res.status}. Falling back to deterministic engine.`);
        return this.localFallback.processPrompt(context, prompt);
      }

      const data = await res.json() as any;
      const call = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

      if (call && tools[call.name]) {
        return {
          toolName: call.name,
          toolArgs: call.args || {},
          provider: 'gemini'
        };
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return {
        textResponse: text,
        provider: 'gemini'
      };
    } catch (err) {
      logger.warn('Gemini call failed or timed out. Falling back to deterministic local adapter.', { error: (err as any)?.message });
      return this.localFallback.processPrompt(context, prompt);
    }
  }
}

export const aiProvider: AIProviderAdapter = new GeminiProviderAdapter();
