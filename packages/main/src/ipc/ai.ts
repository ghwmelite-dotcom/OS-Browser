import { ipcMain, BrowserWindow } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';
import { aiRequest } from '../net/cloudflare';
import { getConnectivityStatus } from '../net/connectivity';
import { queueRequest } from '../services/offline-queue';
import crypto from 'crypto';

export function registerAIHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IPC.AI_CHAT, async (_event, request: any) => {
    const { message, model, conversation_history, page_context } = request;

    if (getConnectivityStatus() === 'offline') {
      queueRequest('chat', { message, model, conversation_history, page_context }, 1);
      return { content: 'You are offline. Your message has been queued and will be processed when you reconnect.', model, queued: true };
    }

    try {
      const result = await aiRequest('chat', { message, model, conversation_history, page_context });

      // If streaming response, read and return
      if (result instanceof Response) {
        const reader = result.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            mainWindow.webContents.send(IPC.AI_CHAT_STREAM, chunk);
          }
        }

        return { content: fullContent, model };
      }

      return result;
    } catch (err: any) {
      console.error('[AI:chat] Request failed:', err.message);
      return { content: 'Unable to process your request. Please try again.', model, error: true };
    }
  });

  ipcMain.handle(IPC.AI_SUMMARIZE, async (_event, request: any) => {
    const { url, page_text } = request;
    const db = getDatabase();

    // Check local cache first
    const hash = hashString(url);
    const cached = db.prepare('SELECT * FROM summary_cache WHERE url_hash = ?').get(hash) as any;
    if (cached) return { summary: cached.summary, url, cached: true };

    if (getConnectivityStatus() === 'offline') {
      queueRequest('summarize', { url, page_text }, 2);
      return { summary: 'You are offline. Summarization has been queued.', queued: true };
    }

    try {
      const result = await aiRequest('summarize', { url, page_text });

      // Cache locally
      db.prepare(
        'INSERT OR REPLACE INTO summary_cache (url_hash, url, summary, model) VALUES (?, ?, ?, ?)'
      ).run(hash, url, result.summary, result.model || 'unknown');

      return result;
    } catch (err: any) {
      console.error('[AI:summarize] Request failed:', err.message);
      return { summary: 'Unable to summarize this page. Please try again.', error: true };
    }
  });

  ipcMain.handle(IPC.AI_TRANSLATE, async (_event, request: any) => {
    const { text, source_lang, target_lang } = request;
    const db = getDatabase();

    // Check local cache
    const hash = hashString(text);
    const cached = db.prepare(
      'SELECT * FROM translation_cache WHERE source_text_hash = ? AND source_lang = ? AND target_lang = ?'
    ).get(hash, source_lang || 'en', target_lang || 'ak') as any;
    if (cached) return { translated_text: cached.translated_text, cached: true };

    if (getConnectivityStatus() === 'offline') {
      queueRequest('translate', { text, source_lang, target_lang }, 2);
      return { translated_text: 'You are offline. Translation has been queued.', queued: true };
    }

    try {
      const result = await aiRequest('translate', { text, source_lang, target_lang });

      // Cache locally
      db.prepare(
        'INSERT OR REPLACE INTO translation_cache (source_text_hash, source_lang, target_lang, translated_text) VALUES (?, ?, ?, ?)'
      ).run(hash, source_lang || 'en', target_lang || 'ak', result.translated_text);

      return result;
    } catch (err: any) {
      console.error('[AI:translate] Request failed:', err.message);
      return { translated_text: 'Unable to translate. Please try again.', error: true };
    }
  });

  ipcMain.handle(IPC.AI_SEARCH, async (_event, query: string) => {
    if (typeof query !== 'string' || query.length > 2000) {
      return { answer: 'Invalid query', query: '', error: true };
    }
    if (getConnectivityStatus() === 'offline') {
      return { answer: 'You are offline. Search requires an internet connection.', query, error: true };
    }

    try {
      return await aiRequest('search', { query });
    } catch (err: any) {
      console.error('[AI:search] Request failed:', err.message);
      return { answer: 'Unable to search. Please try again.', query, error: true };
    }
  });

  // Conversation handlers
  ipcMain.handle(IPC.CONVERSATION_LIST, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC').all();
  });

  ipcMain.handle(IPC.CONVERSATION_CREATE, (_event, data: any) => {
    if (!data || typeof data !== 'object') return null;
    if (data.title && (typeof data.title !== 'string' || data.title.length > 512)) return null;
    if (data.page_url && (typeof data.page_url !== 'string' || data.page_url.length > 4096)) return null;
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO conversations (title, model, page_url) VALUES (?, ?, ?)'
    ).run(data.title || 'New Conversation', data.model, data.page_url || null);
    return { id: result.lastInsertRowid, ...data };
  });

  ipcMain.handle(IPC.CONVERSATION_DELETE, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.CONVERSATION_MESSAGES, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return [];
    const db = getDatabase();
    return db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at').all(id);
  });

  ipcMain.handle(IPC.CONVERSATION_ADD_MESSAGE, (_event, data: any) => {
    if (!data || typeof data !== 'object') return null;
    if (typeof data.conversation_id !== 'number' || data.conversation_id < 1) return null;
    if (typeof data.role !== 'string' || !['user', 'assistant', 'system'].includes(data.role)) return null;
    if (typeof data.content !== 'string' || data.content.length > 100000) return null;
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO chat_messages (conversation_id, role, content, model, page_context, tokens_used) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(data.conversation_id, data.role, data.content, data.model, data.page_context || null, data.tokens_used || 0);

    // Update conversation updated_at
    db.prepare('UPDATE conversations SET updated_at = datetime("now") WHERE id = ?').run(data.conversation_id);

    return { id: result.lastInsertRowid, ...data };
  });
}

function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}
