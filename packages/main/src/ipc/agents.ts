import { ipcMain } from 'electron';
import { IPC } from '../../../shared/dist';
import { getDatabase } from '../db/database';
import { aiRequest } from '../net/cloudflare';
import { getConnectivityStatus } from '../net/connectivity';

export function registerAgentHandlers(): void {
  ipcMain.handle(IPC.AGENT_LIST, () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM user_agents ORDER BY created_at DESC').all();
  });

  ipcMain.handle(IPC.AGENT_CREATE, (_event, data: any) => {
    if (!data || typeof data.name !== 'string' || typeof data.system_prompt !== 'string') return null;
    if (data.name.length > 256 || data.system_prompt.length > 10000) return null;
    if (data.description && typeof data.description === 'string' && data.description.length > 2048) return null;
    if (data.model && typeof data.model === 'string' && data.model.length > 256) return null;
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO user_agents (name, description, system_prompt, model) VALUES (?, ?, ?, ?)'
    ).run(data.name, data.description || '', data.system_prompt, data.model || '@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    return { id: result.lastInsertRowid, ...data };
  });

  ipcMain.handle(IPC.AGENT_UPDATE, (_event, id: number, data: any) => {
    if (typeof id !== 'number' || id < 1 || !data || typeof data !== 'object') return;
    const db = getDatabase();
    const allowed = ['name', 'description', 'system_prompt', 'model', 'triggers', 'is_active'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (fields.length === 0) return;
    const sets = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => data[f]);
    db.prepare(`UPDATE user_agents SET ${sets}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  });

  ipcMain.handle(IPC.AGENT_DELETE, (_event, id: number) => {
    if (typeof id !== 'number' || id < 1) return;
    const db = getDatabase();
    db.prepare('DELETE FROM user_agents WHERE id = ?').run(id);
  });

  ipcMain.handle(IPC.AGENT_EXECUTE, async (_event, id: number, input: string) => {
    if (typeof id !== 'number' || id < 1) return { content: 'Invalid agent ID', error: true };
    if (typeof input !== 'string' || input.length > 10000) return { content: 'Input too long', error: true };
    const db = getDatabase();
    const agent = db.prepare('SELECT * FROM user_agents WHERE id = ?').get(id) as any;
    if (!agent) return { content: 'Agent not found', error: true };

    if (getConnectivityStatus() === 'offline') {
      return { content: 'You are offline. Agent execution requires an internet connection.', error: true };
    }

    try {
      const result = await aiRequest('chat', {
        message: input,
        model: agent.model,
        conversation_history: [],
        page_context: `Custom agent: ${agent.name}. System: ${agent.system_prompt}`,
      });
      return result;
    } catch (err: any) {
      console.error('[Agent:execute] Request failed:', err.message);
      return { content: 'Unable to execute agent. Please try again.', error: true };
    }
  });
}
