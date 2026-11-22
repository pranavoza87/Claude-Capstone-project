// Local-calendar date helpers. Same local getters as frontend todayLocal(); never toISOString().
const pad = (n) => String(n).padStart(2, '0');

export function formatLocal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DD for `n` calendar days from `now` (n may be negative), in local time.
export function localDateOffset(n, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n, 12, 0, 0);
  return formatLocal(d);
}

// Local noon today: a stable "now" far from any midnight boundary.
export function localNoon(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}
