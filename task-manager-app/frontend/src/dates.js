// Pure date and list helpers (US-101, EPMCDMETST-73342). No Date parsing of strings and no toISOString (which returns the UTC date).

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD.
export function todayLocal(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Fixed-width ISO dates compare correctly as strings. A task due today is not overdue.
export function isOverdue(dueDate, status, today) {
  return !!dueDate && status !== 'done' && dueDate < today;
}

// Title search (lowercased, not trimmed) combined with the optional overdue filter.
// isOverdue is the only definition of "overdue". Returns a new array; does not mutate input.
export function filterTasks(tasks, query, overdueOnly, today) {
  const q = query.toLowerCase();
  return tasks.filter((task) => {
    if (!task || typeof task !== 'object' || task.id == null || typeof task.title !== 'string') return false;
    if (!task.title.toLowerCase().includes(q)) return false;
    return !overdueOnly || isOverdue(task.due_date, task.status, today);
  });
}
