// Use sql-wasm (memory efficient) with WASM file loaded from extraResources
const initSqlJs = require('sql.js');
type SqlJsDatabase = any;
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

// Wrapper to provide better-sqlite3-like API over sql.js
class PreparedStatement {
  private db: SqlJsDatabase;
  private sql: string;

  constructor(db: SqlJsDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  run(...params: any[]): { lastInsertRowid: number; changes: number } {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    this.db.run(this.sql, flatParams);
    const lastId = this.db.exec('SELECT last_insert_rowid() as id')[0]?.values[0]?.[0] as number || 0;
    const changes = this.db.getRowsModified();
    saveDatabase();
    return { lastInsertRowid: lastId, changes };
  }

  get(...params: any[]): any {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.bind(flatParams.length > 0 ? flatParams : undefined);
      if (stmt.step()) {
        const columns = stmt.getColumnNames();
        const values = stmt.get();
        stmt.free();
        const row: any = {};
        columns.forEach((col, i) => { row[col] = values[i]; });
        return row;
      }
      stmt.free();
      return undefined;
    } catch {
      return undefined;
    }
  }

  all(...params: any[]): any[] {
    const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
    try {
      const results = this.db.exec(this.sql, flatParams);
      if (results.length === 0) return [];
      const { columns, values } = results[0];
      return values.map(row => {
        const obj: any = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    } catch {
      return [];
    }
  }
}

// Database wrapper with better-sqlite3-compatible API
class DatabaseWrapper {
  private sqlDb: SqlJsDatabase;

  constructor(sqlDb: SqlJsDatabase) {
    this.sqlDb = sqlDb;
  }

  prepare(sql: string): PreparedStatement {
    return new PreparedStatement(this.sqlDb, sql);
  }

  exec(sql: string): void {
    this.sqlDb.run(sql);
    saveDatabase();
  }

  pragma(pragma: string): any {
    try {
      const result = this.sqlDb.exec(`PRAGMA ${pragma}`);
      return result.length > 0 ? result[0].values[0]?.[0] : undefined;
    } catch {
      return undefined;
    }
  }

  transaction<T>(fn: () => T): () => T {
    return () => {
      this.sqlDb.run('BEGIN TRANSACTION');
      try {
        const result = fn();
        this.sqlDb.run('COMMIT');
        saveDatabase();
        return result;
      } catch (err) {
        this.sqlDb.run('ROLLBACK');
        throw err;
      }
    };
  }

  close(): void {
    saveDatabase();
    this.sqlDb.close();
  }

  getInternalDb(): SqlJsDatabase {
    return this.sqlDb;
  }
}

let wrapper: DatabaseWrapper | null = null;

function saveDatabase(): void {
  if (!db || !dbPath) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch {
    // Silently fail on save errors during shutdown
  }
}

export async function initDatabase(): Promise<void> {
  // Locate the WASM file — in packaged app it's in extraResources
  const wasmPath = app.isPackaged
    ? path.join(process.resourcesPath, 'sql-wasm.wasm')
    : path.join(__dirname, '..', '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');

  const wasmBinary = fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : undefined;

  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);

  const dbDir = app.getPath('userData');
  fs.mkdirSync(dbDir, { recursive: true });
  dbPath = path.join(dbDir, 'data.db');

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  wrapper = new DatabaseWrapper(db);
  wrapper.pragma('journal_mode = WAL');
  wrapper.pragma('foreign_keys = ON');
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
    db = null;
  }
}

export function runMigrations(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    { name: '001-initial', run: require('./migrations/001-initial').up },
  ];

  const applied = new Set(
    (database.prepare('SELECT name FROM _migrations').all() as any[])
      .map((row: any) => row.name)
  );

  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      migration.run(database);
      database.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migration.name);
    }
  }
}
