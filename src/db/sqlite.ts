// src/db/sqlite.ts
import SQLite from 'react-native-sqlite-storage';
import type { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

/**
 * Bump this when you change the schema and add a new migration.
 * v1: created app_meta + folders + (intended) notes/note_assets
 * v2: ensure notes, note_assets and related indexes exist (repair migration)
 */
export const SCHEMA_VERSION = 8;

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
  if (current < 3) {
    await migrateToV3(db);
    current = 3;
    await setSchemaVersion(db, current);
  }
  if (current < 4) {
    await migrateToV4(db);
    current = 4;
    await setSchemaVersion(db, current);
  }
  if (current < 5) {
    await migrateToV5(db);
    current = 5;
    await setSchemaVersion(db, current);
  }
  if (current < 6) {
    await migrateToV6(db);
    current = 6;
    await setSchemaVersion(db, current);
  }
  if (current < 7) {
    await migrateToV7(db);
    current = 7;
    await setSchemaVersion(db, current);
  }
  if (current < 8) {
    await migrateToV8(db);
    current = 8;
    await setSchemaVersion(db, current);
  }
  if (current < 9) {
    await migrateToV9(db);
    current = 9;
    await setSchemaVersion(db, current);
  }
  if (current < 10) {
    await migrateToV10(db);
    current = 10;
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

async function migrateToV3(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // users table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          created_at TEXT NOT NULL
        )`,
        [],
      );
      // add user_id to notes (ignore failure if exists)
      tx.executeSql(`ALTER TABLE notes ADD COLUMN user_id INTEGER`, [], () => {}, () => false);
      // index for user
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id)`, []);
      // seed guest and backfill
      tx.executeSql(
        `INSERT OR IGNORE INTO users(username, password, created_at) VALUES('guest', '', ?)`,
        [nowISO()],
      );
      tx.executeSql(`SELECT id FROM users WHERE username='guest' LIMIT 1`, [], (_, rs) => {
        const guestId = rs.rows.item(0).id;
        tx.executeSql(`UPDATE notes SET user_id = COALESCE(user_id, ?)`, [guestId]);
        resolve();
      });
    }, reject);
  });
}

async function migrateToV4(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // add user_id to folders (ignore failure if exists)
      tx.executeSql(`ALTER TABLE folders ADD COLUMN user_id INTEGER`, [], () => {}, () => false);
      // index for folders user
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id)`, []);
      // backfill folders with guest user
      tx.executeSql(`SELECT id FROM users WHERE username='guest' LIMIT 1`, [], (_, rs) => {
        const guestId = rs.rows.item(0).id;
        tx.executeSql(`UPDATE folders SET user_id = COALESCE(user_id, ?)`, [guestId]);
        resolve();
      });
    }, reject);
  });
}

async function migrateToV5(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // add email column to users table (ignore failure if exists)
      tx.executeSql(`ALTER TABLE users ADD COLUMN email TEXT`, [], () => {}, () => false);
      // add unique constraint for email
      tx.executeSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`, []);
      // backfill guest user with email
      tx.executeSql(`UPDATE users SET email = 'guest@example.com' WHERE username='guest'`, []);
      resolve();
    }, reject);
  });
}

async function migrateToV6(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // Remove username unique constraint by recreating the table
      // First, create a new table without the unique constraint
      tx.executeSql(`
        CREATE TABLE users_new(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `, []);
      
      // Copy data from old table to new table
      tx.executeSql(`
        INSERT INTO users_new (id, username, email, password, created_at)
        SELECT id, username, COALESCE(email, 'guest@example.com'), password, created_at
        FROM users
      `, []);
      
      // Drop old table
      tx.executeSql(`DROP TABLE users`, []);
      
      // Rename new table
      tx.executeSql(`ALTER TABLE users_new RENAME TO users`, []);
      
      // Recreate indexes
      tx.executeSql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`, []);
      
      resolve();
    }, reject);
  });
}

async function migrateToV7(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // Add dirty column to notes (ignore if already exists)
      tx.executeSql(`ALTER TABLE notes ADD COLUMN dirty INTEGER DEFAULT 0`, [], () => {}, () => false);
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_notes_dirty ON notes(dirty)`, []);
      // Delete action queue (for permanent deletion)
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_queue(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,          -- 'DELETE'
          note_local_id INTEGER,
          remote_id TEXT,
          try_count INTEGER DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL
        )
      `, []);
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_syncq_user ON sync_queue(user_id, created_at)`, []);
      resolve();
    }, reject);
  });
}

async function migrateToV8(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // Add avatar column to users table (ignore if already exists)
      tx.executeSql(`ALTER TABLE users ADD COLUMN avatar TEXT`, [], () => {}, () => false);
      resolve();
    }, reject);
  });
}

async function migrateToV9(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // Add updated_at column to folders table (ignore if already exists)
      tx.executeSql(`ALTER TABLE folders ADD COLUMN updated_at TEXT`, [], () => {}, () => false);
      resolve();
    }, reject);
  });
}

async function migrateToV10(db: SQLiteDatabase): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.transaction(tx => {
      // Backfill null updated_at values with created_at values
      tx.executeSql(`UPDATE folders SET updated_at = created_at WHERE updated_at IS NULL`, []);
      resolve();
    }, reject);
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
