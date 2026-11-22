// US-101: migration tests. Loads ../src/migrations directly with throwaway databases
// and never opens the real tasks.db.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const { migrate } = require('../src/migrations');

const mkTmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-migrations-test-'));
const columns = (db) => db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
const LEGACY_DDL = `CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo'
)`;
const seedLegacy = (db) => {
  db.exec(LEGACY_DDL);
  const ins = db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)');
  ins.run('A', 'todo');
  ins.run('B', 'in_progress');
  ins.run('C', 'done');
  ins.run('D', 'blocked'); // legacy status outside the current enum
};

test('migrates a legacy table twice without error, preserving rows', () => {
  const dir = mkTmp();
  const db = new Database(path.join(dir, 'legacy.db'));
  try {
    seedLegacy(db);
    assert.doesNotThrow(() => migrate(db));
    assert.doesNotThrow(() => migrate(db));
    assert.equal(columns(db).filter((c) => c === 'due_date').length, 1);
    const rows = db.prepare('SELECT id, title, status, due_date FROM tasks ORDER BY id').all();
    assert.deepEqual(rows, [
      { id: 1, title: 'A', status: 'todo', due_date: null },
      { id: 2, title: 'B', status: 'in_progress', due_date: null },
      { id: 3, title: 'C', status: 'done', due_date: null },
      { id: 4, title: 'D', status: 'blocked', due_date: null },
    ]);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('does not throw when another connection already added the column (concurrent start)', () => {
  const dir = mkTmp();
  const file = path.join(dir, 'race.db');
  const a = new Database(file);
  const b = new Database(file);
  try {
    seedLegacy(a);
    b.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
    assert.doesNotThrow(() => migrate(a));
    assert.equal(columns(a).filter((c) => c === 'due_date').length, 1);
    assert.equal(a.prepare('SELECT COUNT(*) AS n FROM tasks').get().n, 4);
  } finally {
    a.close();
    b.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('fresh database: create, migrate, insert with a date', () => {
  const db = new Database(':memory:');
  try {
    db.exec(LEGACY_DDL);
    migrate(db);
    const id = Number(db.prepare('INSERT INTO tasks (title, status, due_date) VALUES (?, ?, ?)').run('X', 'todo', '2030-01-01').lastInsertRowid);
    assert.deepEqual(db.prepare('SELECT title, due_date FROM tasks WHERE id = ?').get(id), { title: 'X', due_date: '2030-01-01' });
  } finally {
    db.close();
  }
});

test('db.js migrates a seeded legacy file on require and keeps rows', () => {
  const dir = mkTmp();
  const file = path.join(dir, 'legacy-via-dbjs.db');
  const seed = new Database(file);
  seedLegacy(seed);
  seed.close();

  const prevPath = process.env.DB_PATH;
  process.env.DB_PATH = file;
  const dbKey = require.resolve('../src/db');
  const serverKey = require.resolve('../src/server');
  delete require.cache[dbKey];
  delete require.cache[serverKey];
  let db;
  try {
    db = require('../src/db');
    assert.ok(columns(db).includes('due_date'));
    const rows = db.prepare('SELECT id, title, status, due_date FROM tasks ORDER BY id').all();
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.due_date === null));
    assert.equal(rows[3].status, 'blocked');
  } finally {
    if (db) db.close();
    delete require.cache[dbKey];
    delete require.cache[serverKey];
    if (prevPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = prevPath;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
