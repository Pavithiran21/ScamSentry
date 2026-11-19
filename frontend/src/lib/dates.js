// Every time from the API is UTC (ISO 8601). It is shown in the browser's own time zone with
// Intl, which needs no time-zone library: the browser already knows the viewer's zone.

const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "9:41 pm" */
export function formatTime(value) {
  const parts = timeFormat.formatToParts(new Date(value));
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = (parts.find((part) => part.type === 'dayPeriod')?.value ?? '').replace(/\./g, '').toLowerCase();
  return `${hour}:${minute} ${dayPeriod}`.trim();
}

/** "8 Nov 2026" */
export function formatDate(value) {
  return fullDate.format(new Date(value));
}

/** "8 Nov 2026, 9:41 pm" */
export function formatDateTime(value) {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "6 Nov", or "6 Nov 2025" in another year. */
export function formatShortDate(value, now = new Date()) {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() ? dayMonth.format(date) : formatDate(date);
}

/** History's Checked column: "Today, 9:41 pm" or "7 Nov, 6:12 pm". */
export function formatShortDateTime(value, now = new Date()) {
  const date = new Date(value);
  const day = sameDay(date, now) ? 'Today' : formatShortDate(date, now);
  return `${day}, ${formatTime(date)}`;
}

/**
 * When the daily checks come back, in the viewer's time: "12:00 am" for the coming midnight or a
 * time later today, "6:30 pm tomorrow" otherwise (viewers far from the app's time zone).
 */
export function formatResetTime(resetAt, now = new Date()) {
  const reset = new Date(resetAt);
  const time = formatTime(reset);
  if (sameDay(reset, now)) {
    return time;
  }
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const isComingMidnight = sameDay(reset, tomorrow) && reset.getHours() === 0 && reset.getMinutes() === 0;
  return isComingMidnight ? time : `${time} tomorrow`;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** The queue's age column: "6 h", "2 d" (at least "1 h"). */
export function formatAge(value, now = new Date()) {
  const elapsed = Math.max(0, now - new Date(value));
  if (elapsed < DAY) {
    return `${Math.max(1, Math.floor(elapsed / HOUR))} h`;
  }
  return `${Math.floor(elapsed / DAY)} d`;
}

/** "2 days" for "oldest 2 days" and "Open · 2 days"; "1 hour" below a day. */
export function formatAgeWords(value, now = new Date()) {
  const elapsed = Math.max(0, now - new Date(value));
  if (elapsed < DAY) {
    const hours = Math.max(1, Math.floor(elapsed / HOUR));
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  const days = Math.floor(elapsed / DAY);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
