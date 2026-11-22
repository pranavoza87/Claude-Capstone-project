// Pure date helpers (US-101). No Date parsing of strings and no toISOString (which returns the UTC date).

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD.
export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Fixed-width ISO dates compare correctly as strings. A task due today is not overdue.
export function isOverdue(dueDate, status, today) {
  return !!dueDate && status !== 'done' && dueDate < today;
}
