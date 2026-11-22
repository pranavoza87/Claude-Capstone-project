// US-101: optional task due date - validator, POST, GET and brownfield tests.
// Uses only the built-in node:test runner and a throwaway SQLite file.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-due-date-test-'));
process.env.DB_PATH = path.join(tmpDir, 'test.db'); // must be set before requiring the app

const app = require('../src/server');
const db = require('../src/db');
const { validateTaskCreateDueDate, DUE_DATE_ERROR } = require('../src/validation');

let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
  db.exec('DELETE FROM tasks');
});

const post = async (body) => {
  const res = await fetch(`${base}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
const getAll = async () => {
  const res = await fetch(`${base}/api/tasks`);
  return { status: res.status, body: await res.json() };
};
const count = () => db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
const dbDue = (id) => db.prepare('SELECT due_date FROM tasks WHERE id = ?').get(id).due_date;

const VALID = ['2024-02-29', '2000-02-29', '0000-01-01', '9999-12-31', '2025-12-31'];
const EMPTY = [undefined, null, ''];
const INVALID = [
  ['1900-02-29 (not a leap year)', '1900-02-29'],
  ['2025-02-30', '2025-02-30'],
  ['2025-13-01', '2025-13-01'],
  ['2025-00-10', '2025-00-10'],
  ['2025-2-1', '2025-2-1'],
  ['ISO datetime', '2025-01-01T00:00:00Z'],
  ['leading space', ' 2025-01-01'],
  ['trailing space', '2025-01-01 '],
  ['trailing newline', '2025-01-01\n'],
  ['no dashes', '20250101'],
  ['number 0', 0],
  ['false', false],
  ['true', true],
  ['array', []],
  ['object', {}],
  ['number 123', 123],
];

// ---- Validator ----

for (const v of VALID) {
  test(`validator accepts ${v}`, () => {
    assert.deepEqual(validateTaskCreateDueDate(v), { value: v, error: null });
  });
}

for (const v of EMPTY) {
  test(`validator treats ${v === undefined ? 'undefined' : JSON.stringify(v)} as no date`, () => {
    assert.deepEqual(validateTaskCreateDueDate(v), { value: null, error: null });
  });
}

for (const [label, v] of INVALID) {
  test(`validator rejects ${label}`, () => {
    const r = validateTaskCreateDueDate(v);
    assert.equal(r.error, DUE_DATE_ERROR);
  });
}

test('DUE_DATE_ERROR text is the approved message', () => {
  assert.equal(DUE_DATE_ERROR, 'due_date must be a valid date in YYYY-MM-DD format');
});

// ---- POST ----

for (const v of VALID) {
  test(`POST accepts due_date ${v} (201) and persists it`, async () => {
    const res = await post({ title: 'Dated', due_date: v });
    assert.equal(res.status, 201);
    assert.equal(res.body.due_date, v);
    assert.equal(res.body.title, 'Dated');
    assert.equal(res.body.status, 'todo');
    assert.equal(dbDue(res.body.id), v);
  });
}

for (const [label, body] of [
  ['omitted', { title: 'No date' }],
  ['null', { title: 'No date', due_date: null }],
  ['empty string', { title: 'No date', due_date: '' }],
]) {
  test(`POST with due_date ${label} stores null`, async () => {
    const res = await post(body);
    assert.equal(res.status, 201);
    assert.equal(res.body.due_date, null);
    assert.equal(dbDue(res.body.id), null);
  });
}

for (const [label, v] of INVALID) {
  test(`POST rejects invalid due_date (${label}) with 400 and inserts nothing`, async () => {
    const res = await post({ title: 'Bad date', due_date: v });
    assert.equal(res.status, 400);
    assert.deepEqual(res.body, { error: DUE_DATE_ERROR });
    assert.equal(count(), 0);
  });
}

test('POST: title error wins over due_date error', async () => {
  const res = await post({ title: '   ', due_date: '2025-02-30' });
  assert.equal(res.status, 400);
  assert.notEqual(res.body.error, DUE_DATE_ERROR);
  assert.equal(count(), 0);
});

// ---- GET ----

test('GET includes due_date for dated and undated rows', async () => {
  await post({ title: 'Dated', due_date: '2030-05-06' });
  await post({ title: 'Undated' });
  const res = await getAll();
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 2);
  const byTitle = Object.fromEntries(res.body.map((t) => [t.title, t]));
  assert.equal(byTitle.Dated.due_date, '2030-05-06');
  assert.ok('due_date' in byTitle.Undated);
  assert.equal(byTitle.Undated.due_date, null);
});

// ---- Brownfield ----

test('a legacy row inserted with only (title, status) reads back with due_date null', async () => {
  const id = Number(db.prepare('INSERT INTO tasks (title, status) VALUES (?, ?)').run('Legacy', 'in_progress').lastInsertRowid);
  const res = await getAll();
  const legacy = res.body.find((t) => t.id === id);
  assert.deepEqual(legacy, { id, title: 'Legacy', status: 'in_progress', due_date: null });
});
