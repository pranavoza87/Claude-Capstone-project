// US-101: unit tests for the pure date helpers (ESM, node:test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayLocal, isOverdue } from '../src/dates.js';

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
