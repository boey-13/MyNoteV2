// src/db/sqlite.ts
import SQLite from 'react-native-sqlite-storage';
import type { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

/**
 * Bump this when you change the schema and add a new migration.
 * v1: created app_meta + folders + (intended) notes/note_assets
 * v2: ensure notes, note_assets and related indexes exist (repair migration)
 */
export const SCHEMA_VERSION = 2;

let dbInstance: SQLiteDatabase | null = null;

/** Open (or reuse) the DB connection and ensure schema is ready. */
export async function getDB(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabase({ name: 'mynote.db', location: 'default' });
  await dbInstance.executeSql('PRAGMA foreign_keys = ON;'); // enforce FK
  await runMigrations(dbInstance);

  return dbInstance;
}

/** Run schema migrations incrementally based on the stored version. */
async function runMigrations(db: SQLiteDatabase): Promise<void> {
  // Meta table to track schema version
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Read current schema version (0 if not set)
  const versionRes = await db.executeSql(
    `SELECT value FROM app_meta WHERE key='schema_version' LIMIT 1;`
  );
  let current =
    versionRes[0].rows.length ? Number(versionRes[0].rows.item(0).value) : 0;

  if (current < 1) {
    await migrateToV1(db);
    current = 1;
    await setSchemaVersion(db, current);
  }
  if (current < 2) {
    await migrateToV2(db); // repair / ensure notes + note_assets + indexes
    current = 2;
    await setSchemaVersion(db, current);
  }
}

async function setSchemaVersion(db: SQLiteDatabase, v: number): Promise<void> {
  await db.executeSql(
    `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schema_version', ?);`,
    [String(v)]
  );
}

/** Split a multi-statement SQL string into individual statements. */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length)
    .map(s => s + ';');
}

/**
 * v1: initial tables (folders). Notes were intended here originally,
 * but if earlier runs partially created only folders, v2 will repair it.
 */
async function migrateToV1(db: SQLiteDatabase): Promise<void> {
  const createSQL = `
  -- folders
  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );
  `;
  const stmts = splitStatements(createSQL);

  // IMPORTANT: transaction callback must be synchronous (no async/await inside).
  await db.transaction(tx => {
    for (const sql of stmts) tx.executeSql(sql);
  });
}

/**
 * v2: ensure notes, note_assets and related indexes exist.
 * This is idempotent (uses IF NOT EXISTS), safe to run on any DB state.
 */
async function migrateToV2(db: SQLiteDatabase): Promise<void> {
  const createSQL = `
  -- notes
  CREATE TABLE IF NOT EXISTS notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT NOT NULL,
    content      TEXT DEFAULT '',
    folder_id    INTEGER,
    is_favorite  INTEGER DEFAULT 0,   -- 0/1
    is_deleted   INTEGER DEFAULT 0,   -- 0/1 (soft delete)
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now')),
    deleted_at   TEXT,
    remote_id    TEXT,
    version      INTEGER DEFAULT 1,
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );

  -- note_assets
  CREATE TABLE IF NOT EXISTS note_assets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id    INTEGER NOT NULL,
    type       TEXT NOT NULL,         -- 'image'
    path       TEXT NOT NULL,         -- relative path, e.g. /attachments/<noteId>/xxx.jpg
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );

  -- indexes
  CREATE INDEX IF NOT EXISTS idx_notes_folder   ON notes(folder_id);
  CREATE INDEX IF NOT EXISTS idx_notes_deleted  ON notes(is_deleted);
  CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(is_favorite);
  `;
  const stmts = splitStatements(createSQL);

  await db.transaction(tx => {
    for (const sql of stmts) tx.executeSql(sql);
  });
}

/** Helper: ISO timestamp string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Debug helper: read current schema version and list existing tables. */
export async function schemaStatus(): Promise<{ version: number; tables: string[] }> {
  const db = await getDB();

  const ver = await db.executeSql(
    "SELECT value FROM app_meta WHERE key='schema_version' LIMIT 1;"
  );
  const version = ver[0].rows.length ? Number(ver[0].rows.item(0).value) : 0;

  const t = await db.executeSql(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  );
  const tables: string[] = [];
  for (let i = 0; i < t[0].rows.length; i++) {
    tables.push(t[0].rows.item(i).name);
  }

  return { version, tables };
}
