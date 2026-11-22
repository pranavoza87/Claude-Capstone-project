const path = require('path');
const Database = require('better-sqlite3');
const { migrate } = require('./migrations');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'tasks.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    title  TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo'
  )
`);

migrate(db);

module.exports = db;
