import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// We'll use a simple JSON-file-based database instead of sql.js
// This avoids all native module / WASM packaging issues entirely
// Data is stored as JSON files in the userData directory

let dbDir = '';
let tables: Record<string, any[]> = {};
let dbLoaded = false;

function getDbPath(): string {
  return path.join(dbDir, 'database.json');
}

function loadFromDisk(): void {
  const dbPath = getDbPath();
  if (fs.existsSync(dbPath)) {
    try {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      tables = JSON.parse(raw);
      // Create backup after successful load
      try {
        fs.writeFileSync(dbPath + '.bak', raw);
      } catch { /* backup write failed — non-critical */ }
    } catch {
      // Main file is corrupt — try loading from backup
      try {
        const bak = fs.readFileSync(dbPath + '.bak', 'utf-8');
        tables = JSON.parse(bak);
      } catch {
        tables = {};
      }
    }
  }
  dbLoaded = true;
}

function saveToDisk(): void {
  if (!dbDir) return;
  try {
    const dbPath = getDbPath();
    const tempPath = dbPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(tables, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch {
    // Silently fail during shutdown
  }
}

// Auto-save every 5 seconds
let saveInterval: NodeJS.Timeout | null = null;

function ensureTable(name: string): any[] {
  if (!tables[name]) tables[name] = [];
  return tables[name];
}

let autoIncrements: Record<string, number> = {};

function nextId(table: string): number {
  if (!autoIncrements[table]) {
    const rows = ensureTable(table);
    autoIncrements[table] = rows.reduce((max: number, r: any) => Math.max(max, r.id || 0), 0);
  }
  autoIncrements[table]++;
  return autoIncrements[table];
}

// PreparedStatement-like API for compatibility with existing IPC handlers
class PreparedStatement {
  private tableName: string;
  private sql: string;

  constructor(sql: string) {
    this.sql = sql.trim();
    // Extract table name from common SQL patterns
    const match = sql.match(/(?:FROM|INTO|UPDATE|TABLE)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    this.tableName = match ? match[1] : '';
  }

  run(...params: any[]): { lastInsertRowid: number; changes: number } {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const sql = this.sql;

    // INSERT
    if (/^INSERT/i.test(sql)) {
      return this.handleInsert(sql, flatParams);
    }
    // UPDATE
    if (/^UPDATE/i.test(sql)) {
      return this.handleUpdate(sql, flatParams);
    }
    // DELETE
    if (/^DELETE/i.test(sql)) {
      return this.handleDelete(sql, flatParams);
    }

    saveToDisk();
    return { lastInsertRowid: 0, changes: 0 };
  }

  get(...params: any[]): any {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const rows = this.all(...flatParams);
    return rows[0] || undefined;
  }

  all(...params: any[]): any[] {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    const sql = this.sql;
    const table = ensureTable(this.tableName);

    // SELECT with WHERE
    if (/^SELECT/i.test(sql)) {
      return this.handleSelect(sql, table, flatParams);
    }

    return table;
  }

  private handleInsert(sql: string, params: any[]): { lastInsertRowid: number; changes: number } {
    const table = ensureTable(this.tableName);

    // Parse column names from INSERT INTO table (col1, col2, ...) VALUES (?, ?, ...)
    const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (!colMatch) {
      saveToDisk();
      return { lastInsertRowid: 0, changes: 0 };
    }

    const columns = colMatch[1].split(',').map(c => c.trim().replace(/"/g, ''));
    const row: any = {};

    // Check for ON CONFLICT ... DO UPDATE
    const isUpsert = /ON\s+CONFLICT/i.test(sql);

    columns.forEach((col, i) => {
      row[col] = i < params.length ? params[i] : null;
    });

    // Handle OR IGNORE
    if (/OR\s+IGNORE/i.test(sql)) {
      const existing = table.find((r: any) => {
        if (row.id !== undefined) return r.id === row.id;
        return false;
      });
      if (existing) return { lastInsertRowid: existing.id || 0, changes: 0 };
    }

    // Handle UPSERT (ON CONFLICT)
    if (isUpsert && row.url) {
      const existing = table.find((r: any) => r.url === row.url);
      if (existing) {
        // Update visit_count etc
        if (existing.visit_count !== undefined) existing.visit_count++;
        existing.last_visited_at = new Date().toISOString();
        if (row.title) existing.title = row.title;
        saveToDisk();
        return { lastInsertRowid: existing.id || 0, changes: 1 };
      }
    }

    // Auto-generate ID if not provided
    if (!row.id) {
      row.id = nextId(this.tableName);
    }

    // Set defaults
    if (!row.created_at) row.created_at = new Date().toISOString();
    if (!row.updated_at && columns.includes('updated_at')) row.updated_at = new Date().toISOString();

    table.push(row);
    saveToDisk();
    return { lastInsertRowid: row.id, changes: 1 };
  }

  private handleUpdate(sql: string, params: any[]): { lastInsertRowid: number; changes: number } {
    const table = ensureTable(this.tableName);

    // Parse SET clause and WHERE clause
    const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
    if (!setMatch) return { lastInsertRowid: 0, changes: 0 };

    const whereClause = setMatch[2] || '';
    let changes = 0;

    // Count how many ? placeholders are in the SET clause to know where WHERE params start
    const setClauses = setMatch[1].split(',').map(s => s.trim());
    let setParamCount = 0;
    setClauses.forEach(clause => {
      if (clause.includes('?')) setParamCount++;
    });

    // WHERE params start AFTER the SET params
    const whereParams = params.slice(setParamCount);
    const setParams = params.slice(0, setParamCount);

    // Find matching rows using only the WHERE params
    const rows = whereClause ? this.filterByWhere(table, whereClause, whereParams) : table;

    // Apply SET assignments using SET params
    let setParamIdx = 0;

    rows.forEach((row: any) => {
      // Reset SET param index for each row (in case of multi-row update)
      setParamIdx = 0;
      setClauses.forEach(clause => {
        const eqMatch = clause.match(/(\w+)\s*=\s*(.+)/);
        if (eqMatch) {
          const col = eqMatch[1];
          const val = eqMatch[2].trim();
          if (val === '?') {
            row[col] = setParams[setParamIdx++];
          } else if (/datetime/i.test(val)) {
            row[col] = new Date().toISOString();
          } else if (/\w+\s*\+\s*1/i.test(val)) {
            row[col] = (row[col] || 0) + 1;
          } else if (/^\d+$/.test(val)) {
            // Literal number: is_active = 0, is_active = 1
            row[col] = parseInt(val);
          } else if (/^'.*'$/.test(val)) {
            // Literal string: status = 'queued'
            row[col] = val.slice(1, -1);
          }
        }
      });
      changes++;
    });

    saveToDisk();
    return { lastInsertRowid: 0, changes };
  }

  private handleDelete(sql: string, params: any[]): { lastInsertRowid: number; changes: number } {
    const table = ensureTable(this.tableName);
    const whereMatch = sql.match(/WHERE\s+(.+)$/i);

    if (!whereMatch) {
      // DELETE all
      const count = table.length;
      tables[this.tableName] = [];
      saveToDisk();
      return { lastInsertRowid: 0, changes: count };
    }

    const before = table.length;
    const toKeep = table.filter((row: any) => !this.matchesWhere(row, whereMatch[1], params));
    tables[this.tableName] = toKeep;
    saveToDisk();
    return { lastInsertRowid: 0, changes: before - toKeep.length };
  }

  private handleSelect(sql: string, table: any[], params: any[]): any[] {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|\s*$)/i);
    let results = whereMatch ? this.filterByWhere(table, whereMatch[1], params) : [...table];

    // ORDER BY
    const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const desc = orderMatch[2]?.toUpperCase() === 'DESC';
      results.sort((a: any, b: any) => {
        const va = a[col] ?? '';
        const vb = b[col] ?? '';
        return desc ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
      });
    }

    // LIMIT / OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
      results = results.slice(offset, offset + limit);
    }

    // Handle COUNT(*) / SUM / COALESCE
    if (/COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
      return [{ count: results.length }];
    }
    if (/SUM\s*\(\s*(\w+)\s*\)/i.test(sql)) {
      const sumMatch = sql.match(/(?:COALESCE\s*\(\s*)?SUM\s*\(\s*(\w+)\s*\)/i);
      const col = sumMatch![1];
      const total = table.reduce((s: number, r: any) => s + (r[col] || 0), 0);
      return [{ total }];
    }
    if (/MAX\s*\(\s*(\w+)\s*\)/i.test(sql)) {
      const maxMatch = sql.match(/MAX\s*\(\s*(\w+)\s*\)/i);
      const col = maxMatch![1];
      const max = table.reduce((m: number, r: any) => Math.max(m, r[col] || 0), 0);
      return [{ max }];
    }

    return results;
  }

  private filterByWhere(table: any[], where: string, params: any[]): any[] {
    return table.filter((row: any) => this.matchesWhere(row, where, params));
  }

  private matchesWhere(row: any, where: string, params: any[]): boolean {
    // Simple WHERE parser: col = ? | col LIKE ? | col IN (...)
    const conditions = where.split(/\s+AND\s+/i);
    let paramIdx = 0;

    return conditions.every(cond => {
      cond = cond.trim();

      // col = ?
      const eqMatch = cond.match(/(\w+)\s*=\s*\?/);
      if (eqMatch) {
        return row[eqMatch[1]] == params[paramIdx++];
      }

      // col = value (literal)
      const eqLitMatch = cond.match(/(\w+)\s*=\s*(\d+)/);
      if (eqLitMatch) {
        return row[eqLitMatch[1]] == parseInt(eqLitMatch[2]);
      }

      // col LIKE ?
      const likeMatch = cond.match(/(\w+)\s+LIKE\s+\?/i);
      if (likeMatch) {
        const pattern = String(params[paramIdx++]).replace(/%/g, '.*');
        return new RegExp(pattern, 'i').test(String(row[likeMatch[1]] || ''));
      }

      // col IS NULL
      if (/(\w+)\s+IS\s+NULL/i.test(cond)) {
        const col = cond.match(/(\w+)\s+IS/i)![1];
        return row[col] == null;
      }

      // is_visible = 1
      const boolMatch = cond.match(/(\w+)\s*=\s*(\d+)/);
      if (boolMatch) {
        return row[boolMatch[1]] == parseInt(boolMatch[2]);
      }

      return true; // Skip unknown conditions
    });
  }
}

// Database wrapper matching the API used by all IPC handlers
class DatabaseWrapper {
  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(sql);
  }

  exec(sql: string): void {
    // Handle CREATE TABLE, CREATE INDEX etc — no-op for JSON storage
    // These are migration commands that don't apply to JSON
    saveToDisk();
  }

  pragma(_pragma: string): any {
    return undefined;
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      const result = fn();
      saveToDisk();
      return result;
    };
  }

  close(): void {
    saveToDisk();
    if (saveInterval) clearInterval(saveInterval);
  }
}

let wrapper: DatabaseWrapper | null = null;

export async function initDatabase(): Promise<void> {
  dbDir = app.getPath('userData');
  fs.mkdirSync(dbDir, { recursive: true });
  loadFromDisk();

  wrapper = new DatabaseWrapper();

  // Auto-save periodically
  saveInterval = setInterval(saveToDisk, 5000);
}

export function getDatabase(): DatabaseWrapper {
  if (!wrapper) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return wrapper as any;
}

export function closeDatabase(): void {
  if (wrapper) {
    wrapper.close();
    wrapper = null;
  }
}

export function runMigrations(): void {
  // Ensure default tables exist with seed data
  ensureTable('user_profile');
  ensureTable('tabs');
  ensureTable('history');
  ensureTable('bookmarks');
  ensureTable('bookmark_folders');
  ensureTable('conversations');
  ensureTable('chat_messages');
  ensureTable('offline_queue');
  ensureTable('adblock_stats');
  ensureTable('user_agents');
  ensureTable('translation_cache');
  ensureTable('summary_cache');
  ensureTable('gov_portals');
  ensureTable('credentials');
  ensureTable('window_state');

  // Ensure default user profile
  const profile = ensureTable('user_profile');
  if (profile.length === 0) {
    profile.push({
      id: 1,
      display_name: 'User',
      email: null,
      avatar_path: null,
      default_model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      theme: 'light',
      language: 'en',
      sidebar_position: 'right',
      ad_blocking: 1,
      privacy_mode: 0,
      search_engine: 'osbrowser',
      sync_enabled: 0,
      created_at: new Date().toISOString(),
    });
  }

  // Ensure default window state
  const ws = ensureTable('window_state');
  if (ws.length === 0) {
    ws.push({
      id: 1, x: 100, y: 100, width: 1280, height: 800,
      is_maximized: 0, is_fullscreen: 0, display_id: '',
      updated_at: new Date().toISOString(),
    });
  }

  saveToDisk();
}
