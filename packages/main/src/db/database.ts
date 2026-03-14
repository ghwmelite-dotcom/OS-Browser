import Database from '@journeyapps/sqlcipher';
import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let db: Database.Database | null = null;

function getDbDir(): string {
  return path.join(app.getPath('userData'));
}

function getOrCreateEncryptionKey(): string {
  const dbDir = getDbDir();
  const keyPath = path.join(dbDir, '.keyref');

  if (fs.existsSync(keyPath) && safeStorage.isEncryptionAvailable()) {
    const encrypted = fs.readFileSync(keyPath);
    return safeStorage.decryptString(encrypted);
  }

  const keyHex = crypto.randomBytes(32).toString('hex');

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(keyHex);
    fs.writeFileSync(keyPath, encrypted);
  }

  return keyHex;
}

export function getDatabase(): Database.Database {
  if (db) return db;

  const dbDir = getDbDir();
  fs.mkdirSync(dbDir, { recursive: true });

  const dbPath = path.join(dbDir, 'data.db');
  db = new Database(dbPath);

  // Apply SQLCipher encryption
  const key = getOrCreateEncryptionKey();
  db.pragma(`key = "x'${key}'"`);

  // Performance settings
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
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
