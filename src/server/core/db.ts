import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DATA_DIR = process.env.PANEL_DATA_DIR ?? path.resolve('data');

const SUPERSEDED = '';

const MIGRATIONS: Array<string | ((d: DatabaseSync) => void)> = [
  SUPERSEDED,
  `
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  SUPERSEDED,
  SUPERSEDED,
  SUPERSEDED,
  `
  DROP TABLE IF EXISTS messages;
  DROP TABLE IF EXISTS turns;
  DROP TABLE IF EXISTS conversations;
  DELETE FROM settings WHERE key LIKE 'ctx:%';
  CREATE TABLE conversations (
    id            TEXT PRIMARY KEY,
    mode          TEXT NOT NULL CHECK (mode IN ('chat', 'code')),
    title         TEXT NOT NULL,
    project       TEXT,
    owner_id      TEXT,
    head_turn     TEXT,
    running_since TEXT,
    context_json  TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    CHECK (mode = 'code' OR project IS NULL)
  );
  CREATE INDEX conversations_owner ON conversations(owner_id, updated_at);
  CREATE TABLE turns (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    parent_id       TEXT REFERENCES turns(id) ON DELETE CASCADE,
    sdk_session_id  TEXT,
    sdk_leaf        TEXT,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX turns_parent ON turns(conversation_id, parent_id, created_at);
  CREATE TABLE messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    turn_id         TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
    kind            TEXT NOT NULL CHECK (kind IN ('user', 'assistant', 'thinking', 'tool', 'file', 'notice', 'error')),
    tool_use_id     TEXT,
    data_json       TEXT NOT NULL,
    created_at      TEXT NOT NULL
  );
  CREATE INDEX messages_turn ON messages(turn_id, id);
  CREATE INDEX messages_tool ON messages(conversation_id, tool_use_id);
  `,
  `
  ALTER TABLE conversations ADD COLUMN pinned_at INTEGER;
  ALTER TABLE conversations ADD COLUMN archived_at INTEGER;
  ALTER TABLE conversations ADD COLUMN incognito INTEGER NOT NULL DEFAULT 0;
  `,
  `
  CREATE TABLE conversation_reads (
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         TEXT NOT NULL,
    read_at         TEXT NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES ('unread_since', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
  `,
  `
  CREATE TABLE project_state (
    project     TEXT PRIMARY KEY,
    archived_at INTEGER
  );
  CREATE TABLE project_pins (
    project   TEXT NOT NULL,
    user_id   TEXT NOT NULL,
    pinned_at INTEGER NOT NULL,
    PRIMARY KEY (project, user_id)
  );
  `,
  `
  CREATE TABLE scheduled_tasks (
    id                   TEXT PRIMARY KEY,
    owner_id             TEXT,
    name                 TEXT NOT NULL,
    prompt               TEXT NOT NULL,
    frequency            TEXT NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekdays', 'weekly')),
    time                 TEXT NOT NULL,
    weekday              INTEGER CHECK (weekday BETWEEN 0 AND 6),
    mode                 TEXT NOT NULL CHECK (mode IN ('chat', 'code')),
    project              TEXT,
    model                TEXT,
    effort               TEXT,
    web_search           INTEGER NOT NULL DEFAULT 0,
    enabled              INTEGER NOT NULL DEFAULT 1,
    template             TEXT,
    next_run_at          TEXT,
    last_run_at          TEXT,
    last_status          TEXT,
    last_error           TEXT,
    last_conversation_id TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL,
    CHECK (mode = 'code' OR project IS NULL),
    CHECK (frequency <> 'weekly' OR weekday IS NOT NULL)
  );
  CREATE INDEX scheduled_due ON scheduled_tasks(enabled, next_run_at);
  CREATE INDEX scheduled_owner ON scheduled_tasks(owner_id, created_at);
  ALTER TABLE conversations ADD COLUMN scheduled_task_id TEXT REFERENCES scheduled_tasks(id) ON DELETE SET NULL;
  `,
  (d) => {
    const row = d.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'conversations'").get() as { sql: string };
    const sql = row.sql.replace(/,\s*CHECK \(mode = 'code' OR project IS NULL\)/, '');
    if (sql === row.sql) return;
    const { schema_version: sv } = d.prepare('PRAGMA schema_version').get() as { schema_version: number };
    d.exec('PRAGMA writable_schema = ON');
    d.prepare("UPDATE sqlite_schema SET sql = ? WHERE type = 'table' AND name = 'conversations'").run(sql);
    d.exec(`PRAGMA schema_version = ${sv + 1}; PRAGMA writable_schema = OFF`);
  },
];

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  db = new DatabaseSync(path.join(DATA_DIR, 'panel.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

function migrate(d: DatabaseSync): void {
  const current = (d.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  for (let v = current; v < MIGRATIONS.length; v++) {
    d.exec('BEGIN');
    try {
      const step = MIGRATIONS[v];
      if (typeof step === 'string') d.exec(step); else step(d);
      d.exec(`PRAGMA user_version = ${v + 1}`);
      d.exec('COMMIT');
    } catch (err) {
      d.exec('ROLLBACK');
      throw err;
    }
  }
}
