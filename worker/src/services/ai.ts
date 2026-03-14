import type { Env } from '../types';

export interface AIInferenceOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
}

const MODEL_FALLBACK_CHAIN = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/qwen/qwen2.5-72b-instruct',
  '@cf/meta/llama-3.1-8b-instruct',
];

export async function runInference(
  ai: Ai,
  options: AIInferenceOptions
): Promise<ReadableStream | string> {
  const modelsToTry = [options.model, ...MODEL_FALLBACK_CHAIN.filter(m => m !== options.model)];
  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const result = await ai.run(model as any, {
        messages: options.messages,
        stream: options.stream,
      });

      if (options.stream && result instanceof ReadableStream) {
        return result;
      }
      return (result as any).response || JSON.stringify(result);
    } catch (err) {
      lastError = err as Error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError || new Error('All AI models failed');
}

export function buildSystemPrompt(pageContext?: string): string {
  let prompt = `You are OS Browser AI, an intelligent browsing assistant built for Ghana's civil and public servants. You help users summarize pages, answer questions, draft official correspondence, translate between English and Twi, research topics, and analyze data. Be concise, professional, and helpful.`;

  if (pageContext) {
    prompt += `\n\nThe user is currently viewing: ${pageContext}`;
  }
  return prompt;
}
