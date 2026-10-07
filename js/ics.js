// Calendar file (.ics, RFC 5545) with one all-day reminder on the 1st of each month.
// Made on the device; works offline.
import { MONTH_NAMES, addMonths, rulesForMonth, monthKey } from './homeplan.js';

const DESCRIPTION_LIMIT = 1000;
const CRLF = '\r\n';

// Text values: backslash, semicolon, comma and line breaks must be escaped.
export function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n?|\n/g, '\\n');
}

export function unescapeText(s) {
  return String(s).replace(/\\([\\;,nN])/g, (m, c) => (c === 'n' || c === 'N' ? '\n' : c));
}

// Lines longer than 75 bytes are split, each extra piece starting with a space.
// Never splits a multi-byte character.
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      parts.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    curBytes += b;
  }
  parts.push(cur);
  return parts.join(CRLF + ' ');
}

const pad = (n) => String(n).padStart(2, '0');
const dateValue = (y, m, d) => `${y}${pad(m)}${pad(d)}`;
function utcStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// Plain-text list of a month's jobs, kept to 1,000 characters, then a pointer to the app.
export function monthDescription(titles) {
  const lines = [];
  let used = 0;
  let shown = 0;
  for (const t of titles) {
    const line = `- ${t}`;
    const add = (lines.length ? 1 : 0) + line.length;
    const restNote = titles.length - shown - 1 > 0 ? `\n…and ${titles.length - shown - 1} more.`.length : 0;
    if (used + add + restNote > DESCRIPTION_LIMIT) break;
    lines.push(line);
    used += add;
    shown++;
  }
  let text = lines.join('\n');
  if (shown < titles.length) text += `${text ? '\n' : ''}…and ${titles.length - shown} more.`;
  if (!titles.length) text = 'Nothing scheduled this month.';
  return `${text}\n\nOpen the app for details.`;
}

// Stable id: the same home and month always give the same UID, so importing again updates instead of duplicating.
export function eventUid(homeId, year, month) {
  const safe = String(homeId).replace(/[^A-Za-z0-9-]/g, '');
  return `whc-${safe}-${monthKey(year, month)}@walters-home-check`;
}

// The 12 months after `from` (starting next month). Returns the .ics text.
export function buildICS(home, { from = new Date(), count = 12, now = new Date() } = {}) {
  const start = addMonths(from.getFullYear(), from.getMonth() + 1, 1);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Walter's Home Check//My Home reminders//EN",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText("Walter's Home Check")}`,
  ];
  const stamp = utcStamp(now);
  for (let i = 0; i < count; i++) {
    const { year, month } = addMonths(start.year, start.month, i);
    const hidden = new Set(home.hidden || []);
    const titles = rulesForMonth(home, year, month).filter((r) => !hidden.has(r.id)).map((r) => r.title);
    const name = MONTH_NAMES[month - 1];
    lines.push(
      'BEGIN:VEVENT',
      `UID:${eventUid(home.id, year, month)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(year, month, 1)}`,
      `DTEND;VALUE=DATE:${dateValue(year, month, 2)}`,
      `SUMMARY:${escapeText(`Walter's Home Check: ${name} house tasks`)}`,
      `DESCRIPTION:${escapeText(monthDescription(titles))}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`${name} house tasks`)}`,
      'TRIGGER;RELATED=START:PT9H',
      'END:VALARM',
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

// Reads an .ics file back (used by the self-tests): unfolds lines and returns the events.
export function parseICS(text) {
  const unfolded = text.replace(/\r\n[ \t]/g, '').split('\r\n').filter((l) => l !== '');
  const events = [];
  const stack = [];
  let cur = null;
  for (const line of unfolded) {
    const i = line.indexOf(':');
    const name = line.slice(0, i);
    const value = line.slice(i + 1);
    if (name === 'BEGIN') {
      stack.push(value);
      if (value === 'VEVENT') cur = { alarms: 0 };
      if (value === 'VALARM' && cur) cur.alarms++;
    } else if (name === 'END') {
      if (stack.pop() !== value) throw new Error(`Unbalanced END:${value}`);
      if (value === 'VEVENT') {
        events.push(cur);
        cur = null;
      }
    } else if (cur && stack[stack.length - 1] === 'VEVENT') {
      cur[name.split(';')[0]] = name.includes(';') ? { params: name.split(';').slice(1), value } : value;
    }
  }
  if (stack.length) throw new Error('Calendar not closed');
  return { lines: unfolded, events };
}
