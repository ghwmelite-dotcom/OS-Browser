import { Hono } from 'hono';
import type { Env } from '../types';

type Variables = { deviceId: string };

const AI_MODELS = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B', provider: 'Meta', useCase: 'Default chat, reasoning, summarization', isDefault: true },
  { id: '@cf/meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B', provider: 'Meta', useCase: 'Quick/lightweight responses' },
  { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1', provider: 'DeepSeek', useCase: 'Code, math, deep reasoning' },
  { id: '@cf/mistral/mistral-small-3.1-24b-instruct', label: 'Mistral Small', provider: 'Mistral', useCase: 'Chat, translation assist' },
  { id: '@cf/qwen/qwen2.5-72b-instruct', label: 'Qwen 2.5 72B', provider: 'Alibaba', useCase: 'Multilingual, code' },
  { id: '@hf/google/gemma-7b-it', label: 'Gemma 7B', provider: 'Google', useCase: 'Fast lightweight tasks' },
];

export const healthRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

healthRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', app: 'OS Browser API', version: '1.0.0' });
});

healthRoutes.get('/models', (c) => {
  return c.json({ models: AI_MODELS });
});

healthRoutes.post('/register-device', async (c) => {
  const body = await c.req.json<{ app_version?: string }>().catch(() => ({}));
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const deviceId = crypto.randomUUID();

  await c.env.SESSIONS.put(`device:${token}`, JSON.stringify({
    id: deviceId,
    created_at: new Date().toISOString(),
    app_version: body.app_version || '1.0.0',
  }));

  return c.json({ device_token: token, device_id: deviceId });
});
