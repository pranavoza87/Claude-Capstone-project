// Schema migrations. Non-destructive and idempotent: only ever adds nullable columns.
// No side effects at require time; callers pass in an open better-sqlite3 handle.

function hasColumn(db, table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

/**
 * US-101: add the optional `due_date` column (TEXT, YYYY-MM-DD, NULL for existing rows).
 * Safe to run repeatedly and safe if another process adds the column concurrently.
 */
function migrate(db) {
  if (hasColumn(db, 'tasks', 'due_date')) return;
  try {
    db.exec('ALTER TABLE tasks ADD COLUMN due_date TEXT');
  } catch (err) {
    // Another connection may have added the column between the check and the ALTER.
    if (/duplicate column name/i.test(String(err && err.message)) && hasColumn(db, 'tasks', 'due_date')) {
      return;
    }
    throw err;
  }
}

module.exports = { migrate };
