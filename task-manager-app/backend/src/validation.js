// Request validation for PATCH /api/tasks/:id.
// Spec: ENH-01 Design Spec section 4.2.3 (validation rules), 4.2.1 (error details shape).

// Maximum title length, measured in Unicode code points (not UTF-16 code units), so most emoji and
// other astral characters count as one. Emoji with variation selectors (such as a heart with FE0F) and ZWJ
// sequences count once per code point they contain, so they count as several.
const TITLE_MAX_LENGTH = 200;

// C0 controls (U+0000-U+001F), DEL and C1 controls (U+007F-U+009F). A title is a single line, so
// newline and tab are rejected too when they sit inside the title. Only leading/trailing whitespace
// (what String.prototype.trim() strips, e.g. \n, \t, \r) is trimmed first. Other controls (NUL, BEL, DEL,
// U+0085) are not whitespace to trim(), so they are rejected even at the start or end.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

// Invisible characters that render as nothing: ZERO WIDTH SPACE, NON-JOINER, JOINER, WORD JOINER, BOM,
// and variation selectors (U+FE00-U+FE0F, U+E0100-U+E01EF). Used only to detect a title with no visible
// content; they stay legal inside a real title (a ZWJ is part of many emoji sequences, a ZWNJ is needed
// in some scripts, and FE0F turns a base character like a heart into its emoji form). A selector with
// no visible base character is what makes a title empty.
const INVISIBLE_CHARS = /[\u200B-\u200D\u2060\uFEFF\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;

// True when nothing visible is left after dropping whitespace, control and zero-width characters.
function isEffectivelyEmpty(title) {
  return title.replace(INVISIBLE_CHARS, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim() === '';
}

// Allowed task statuses (spec 4.1.1 / 4.2.3, TSK-105). Enforced in the API layer only:
// SQLite cannot add a CHECK via ALTER, and existing rows are left untouched.
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

/**
 * Validate the optional `status` of a POST /api/tasks body (EPMCDMETST-72162, REQ-01).
 * A missing or falsy status (undefined, null, '', 0, false) defaults to 'todo'. Any other value must be a
 * string in TASK_STATUSES, the same allowlist PATCH enforces. Returns { value, error }; `error` is null
 * when valid, otherwise a message suitable for the POST `{ error }` response.
 */
function validateTaskCreateStatus(status) {
  if (!status) return { value: 'todo', error: null };
  if (typeof status !== 'string' || !TASK_STATUSES.includes(status)) {
    return { value: null, error: `status must be one of: ${TASK_STATUSES.join(', ')}` };
  }
  return { value: status, error: null };
}

const DUE_DATE_ERROR = 'due_date must be a valid date in YYYY-MM-DD format';
const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validate the optional `due_date` of a POST /api/tasks body (US-101).
 * undefined, null and '' mean "no due date" (value null). Anything else must be a string in strict
 * YYYY-MM-DD form that is a real calendar date. No falsy defaulting (0 and false are errors) and
 * no Date parsing of the string. Returns { value, error }.
 */
function validateTaskCreateDueDate(v) {
  if (v === undefined || v === null || v === '') return { value: null, error: null };
  if (typeof v !== 'string') return { value: null, error: DUE_DATE_ERROR };
  const m = DUE_DATE_PATTERN.exec(v);
  if (!m) return { value: null, error: DUE_DATE_ERROR };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) return { value: null, error: DUE_DATE_ERROR };
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const monthLengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d < 1 || d > monthLengths[mo - 1]) return { value: null, error: DUE_DATE_ERROR };
  return { value: v, error: null };
}

// Fields a PATCH body may contain. Anything else is rejected (spec 4.2.3).
const PATCHABLE_FIELDS = ['title', 'status'];

/**
 * Validate a PATCH body.
 * Returns { value, details }: `value` holds the normalized fields to apply and
 * `details` is a list of { field, issue } entries (empty when the body is valid).
 */
function validateTaskPatch(body) {
  const details = [];
  const value = {};

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    details.push({ field: 'body', issue: 'must be a JSON object' });
    return { value, details };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    details.push({
      field: 'body',
      issue: `must include at least one of: ${PATCHABLE_FIELDS.join(', ')}`,
    });
    return { value, details };
  }

  for (const key of keys) {
    if (!PATCHABLE_FIELDS.includes(key)) {
      details.push({ field: key, issue: 'unknown field' });
    }
  }

  if (Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string') {
      details.push({ field: 'title', issue: 'must be a string' });
    } else {
      const title = body.title.trim();
      if (isEffectivelyEmpty(title)) {
        details.push({ field: 'title', issue: 'must not be empty' });
      } else if (CONTROL_CHARS.test(title)) {
        details.push({ field: 'title', issue: 'must not contain control characters' });
      } else if ([...title].length > TITLE_MAX_LENGTH) {
        details.push({ field: 'title', issue: `must be at most ${TITLE_MAX_LENGTH} characters` });
      } else {
        value.title = title;
      }
    }
  }

  if (Object.hasOwn(body, 'status')) {
    if (typeof body.status !== 'string' || !TASK_STATUSES.includes(body.status)) {
      details.push({ field: 'status', issue: `must be one of: ${TASK_STATUSES.join(', ')}` });
    } else {
      value.status = body.status;
    }
  }

  return { value, details };
}

module.exports = { TITLE_MAX_LENGTH, TASK_STATUSES, PATCHABLE_FIELDS, validateTaskPatch, validateTaskCreateStatus, validateTaskCreateDueDate, DUE_DATE_ERROR };
