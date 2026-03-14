import { Hono } from 'hono';
import type { Env } from '../types';
import { runInference, buildSystemPrompt } from '../services/ai';

type Variables = { deviceId: string };

export const aiRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Chat
aiRoutes.post('/chat', async (c) => {
  const { message, model, conversation_history, page_context } = await c.req.json();
  const messages = [
    { role: 'system', content: buildSystemPrompt(page_context) },
    ...(conversation_history || []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const stream = await runInference(c.env.AI, { model: model || c.env.DEFAULT_MODEL, messages, stream: true });
    if (stream instanceof ReadableStream) {
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }
    return c.json({ content: stream, model });
  } catch (err) {
    return c.json({ error: 'AI service temporarily unavailable' }, 503);
  }
});

// Summarize
aiRoutes.post('/summarize', async (c) => {
  const { url, page_text } = await c.req.json();
  const cacheKey = `summary:${await hashText(url)}`;
  const cached = await c.env.PAGE_CACHE.get(cacheKey, 'json');
  if (cached) return c.json(cached);

  const truncated = (page_text || '').slice(0, 6000);
  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Summarize the following web page content. Provide a concise summary with 3-5 key points. Format with bullet points.' },
        { role: 'user', content: `URL: ${url}\n\nContent:\n${truncated}` },
      ],
    });
    const response = { summary: result as string, url, model: c.env.DEFAULT_MODEL };
    await c.env.PAGE_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });
    return c.json(response);
  } catch (err) {
    return c.json({ error: 'Summarization failed' }, 503);
  }
});

// Translate
aiRoutes.post('/translate', async (c) => {
  const { text, source_lang, target_lang } = await c.req.json();
  try {
    const result = await c.env.AI.run('@cf/meta/m2m100-1.2b' as any, {
      text,
      source_lang: source_lang || 'en',
      target_lang: target_lang || 'ak',
    });
    return c.json({
      translated_text: (result as any).translated_text,
      source_lang, target_lang,
      disclaimer: 'Translation may not be fully accurate. Verify important content.',
    });
  } catch (err) {
    return c.json({ error: 'Translation failed' }, 503);
  }
});

// Search
aiRoutes.post('/search', async (c) => {
  const { query } = await c.req.json();
  const cacheKey = `search:${await hashText(query)}`;
  const cached = await c.env.PAGE_CACHE.get(cacheKey, 'json');
  if (cached) return c.json(cached);

  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'You are a search assistant. Provide a comprehensive answer to the query. Include relevant facts, context, and sources where possible. Be concise but thorough.' },
        { role: 'user', content: query },
      ],
    });
    const response = { answer: result as string, query, model: c.env.DEFAULT_MODEL };
    await c.env.PAGE_CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 1800 });
    return c.json(response);
  } catch (err) {
    return c.json({ error: 'Search failed' }, 503);
  }
});

// Compare
aiRoutes.post('/compare', async (c) => {
  const { items, criteria } = await c.req.json();
  try {
    const result = await runInference(c.env.AI, {
      model: c.env.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: 'Compare the following items. Create a structured comparison with pros, cons, and a recommendation. Use a table format where appropriate.' },
        { role: 'user', content: `Compare: ${items.join(' vs ')}\n${criteria ? `Criteria: ${criteria}` : ''}` },
      ],
    });
    return c.json({ comparison: result as string, items, model: c.env.DEFAULT_MODEL });
  } catch (err) {
    return c.json({ error: 'Comparison failed' }, 503);
  }
});

async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
