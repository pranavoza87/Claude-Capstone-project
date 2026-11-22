// US-101: unit tests for the pure date helpers (ESM, node:test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayLocal, isOverdue, filterTasks } from '../src/dates.js';

const TODAY = '2026-01-05';

test('isOverdue: past date is overdue', () => {
  assert.equal(isOverdue('2026-01-04', 'todo', TODAY), true);
  assert.equal(isOverdue('2026-01-04', 'in_progress', TODAY), true);
});

test('isOverdue: due today is not overdue', () => {
  assert.equal(isOverdue(TODAY, 'todo', TODAY), false);
});

test('isOverdue: future date is not overdue', () => {
  assert.equal(isOverdue('2026-01-06', 'todo', TODAY), false);
});

test('isOverdue: done task with a past date is not overdue', () => {
  assert.equal(isOverdue('2020-01-01', 'done', TODAY), false);
});

test('isOverdue: null, empty and undefined dates are not overdue', () => {
  assert.equal(isOverdue(null, 'todo', TODAY), false);
  assert.equal(isOverdue('', 'todo', TODAY), false);
  assert.equal(isOverdue(undefined, 'todo', TODAY), false);
});

test('isOverdue: legacy status "blocked" with a past date is overdue', () => {
  assert.equal(isOverdue('2020-01-01', 'blocked', TODAY), true);
});

test('todayLocal: fixed local date late in the evening stays on the same day', () => {
  assert.equal(todayLocal(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('todayLocal: early morning local time stays on the same day', () => {
  assert.equal(todayLocal(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('todayLocal: matches the local getters, zero-padded, for any timezone', () => {
  const d = new Date(2031, 10, 3, 1, 30);
  const pad = (n) => String(n).padStart(2, '0');
  assert.equal(todayLocal(d), `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  assert.equal(todayLocal(d), '2031-11-03');
});

test('todayLocal: defaults to the current date', () => {
  assert.match(todayLocal(), /^\d{4}-\d{2}-\d{2}$/);
});

// EPMCDMETST-73342: filterTasks (overdue quick filter + title search).
const mk = (id, title, due_date, status = 'todo') => ({ id, title, due_date, status });

test('filterTasks: overdueOnly false and empty query returns every valid task as a new array, input not mutated', () => {
  const input = [mk(1, 'alpha', null), mk(2, 'beta', '2026-01-04')];
  const snapshot = JSON.stringify(input);
  const out = filterTasks(input, '', false, TODAY);
  assert.deepEqual(out, input);
  assert.notEqual(out, input);
  assert.equal(JSON.stringify(input), snapshot);
});

test('filterTasks: overdueOnly keeps only a past-due non-done task', () => {
  const past = mk(1, 'past', '2026-01-04');
  const input = [
    past,
    mk(2, 'done', '2026-01-04', 'done'),
    mk(3, 'null', null),
    mk(4, 'empty', ''),
    mk(5, 'today', TODAY),
    mk(6, 'future', '2026-01-06'),
  ];
  assert.deepEqual(filterTasks(input, '', true, TODAY), [past]);
});

test('filterTasks: query is case-insensitive and not trimmed', () => {
  const input = [mk(1, 'alpha', null)];
  assert.equal(filterTasks(input, 'AL', false, TODAY).length, 1);
  assert.equal(filterTasks(input, ' al', false, TODAY).length, 0);
});

test('filterTasks: filter and search combine (AND)', () => {
  const river = mk(1, 'river', '2026-01-04');
  const input = [river, mk(2, 'stone', '2026-01-04'), mk(3, 'rivet', '2026-01-06')];
  assert.deepEqual(filterTasks(input, 'riv', true, TODAY), [river]);
});

test('filterTasks: today boundary with overdueOnly (yesterday included, today excluded)', () => {
  const y = mk(1, 'y', '2026-01-04');
  const input = [y, mk(2, 't', TODAY)];
  assert.deepEqual(filterTasks(input, '', true, TODAY), [y]);
});

test('filterTasks: malformed rows are dropped and id 0 is kept', () => {
  const zero = mk(0, 'zero', null);
  const input = [null, undefined, 'str', { title: 'noid' }, { id: 1, title: 42 }, zero];
  assert.deepEqual(filterTasks(input, '', false, TODAY), [zero]);
});

test('filterTasks: legacy status "blocked" with a past date is included when overdueOnly', () => {
  const b = mk(1, 'legacy', '2020-01-01', 'blocked');
  assert.deepEqual(filterTasks([b], '', true, TODAY), [b]);
});

test('filterTasks: empty input returns []', () => {
  assert.deepEqual(filterTasks([], '', true, TODAY), []);
  assert.deepEqual(filterTasks([], 'x', false, TODAY), []);
});

test('filterTasks: agrees with isOverdue for every (due, status) pair (FR-3 drift guard)', () => {
  const dues = [null, undefined, '', '2020-01-01', '2026-01-04', TODAY, '2026-01-06'];
  const statuses = ['todo', 'in_progress', 'done', 'blocked', 'weird'];
  let id = 1;
  for (const due of dues) {
    for (const status of statuses) {
      const t = mk(id++, 'task', due, status);
      const included = filterTasks([t], '', true, TODAY).length === 1;
      assert.equal(included, isOverdue(due, status, TODAY), `due=${due} status=${status}`);
    }
  }
});

test('filterTasks: unknown status string is treated as not done (included when past due)', () => {
  const w = mk(1, 'w', '2020-01-01', 'weird');
  assert.deepEqual(filterTasks([w], '', true, TODAY), [w]);
});
