// "My Home" rules engine: which jobs apply to a home, month by month, and how old its systems are.
// Plain functions with no screen code, so the self-tests (tests/maintenance.html) can check them.
import { RULES, SEASONS, CLIMATES, STATES, LIFESPANS } from '../data/maintenance.js';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

export const SNOOZE_DAYS = 14;

// ----- Choices for the home form -----
export const ROOF_TYPES = { asphalt: 'Asphalt shingle', metal: 'Metal', tile: 'Tile', other: 'Other' };
export const WATER_HEATER_TYPES = { 'tank-gas': 'Tank — gas', 'tank-electric': 'Tank — electric', tankless: 'Tankless' };
export const HEATING_TYPES = {
  'gas-furnace': 'Gas furnace', 'oil-furnace': 'Oil furnace', 'electric-furnace': 'Electric furnace',
  'gas-boiler': 'Gas boiler', 'oil-boiler': 'Oil boiler', 'heat-pump': 'Heat pump', none: 'None',
};
export const FOUNDATION_TYPES = { basement: 'Basement', crawlspace: 'Crawlspace', slab: 'Slab (no basement or crawlspace)' };

// A new, empty home. Everything is optional.
export function newHome(id, now = new Date().toISOString()) {
  return {
    id, nickname: '', state: '', yearBuilt: null, climate: '',
    roofType: '', roofYear: null,
    waterHeaterType: '', waterHeaterYear: null,
    heatingType: '', heatingYear: null,
    centralAC: null, acYear: null,
    sumpPump: null, sumpYear: null,
    well: null, septic: null, septicPumpedYear: null,
    fireplace: null, deck: null, foundation: '', gutters: null,
    smokeAlarmYear: null, coAlarmYear: null, radonTestYear: null,
    household: null,
    done: {}, snoozed: {}, hidden: [],
    createdAt: now, updatedAt: now,
  };
}

export function homeName(home) {
  return (home && String(home.nickname || '').trim()) || 'My home';
}

// ----- Dates -----
const pad = (n) => String(n).padStart(2, '0');
export const monthKey = (year, month) => `${year}-${pad(month)}`;
export function parseMonthKey(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year, month } : null;
}
export function addMonths(year, month, n) {
  const i = year * 12 + (month - 1) + n;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}
export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}

// ----- Climate -----
export function climateFromState(code) {
  const s = STATES.find((x) => x[0] === code);
  return s ? s[2] : null;
}
export function climateFor(home) {
  if (home && CLIMATES[home.climate]) return home.climate;
  return climateFromState(home && home.state) || 'mixed';
}

// ----- Rules -----

// Month numbers (1–12) for a rule in a climate group.
export function monthsFor(rule, climate) {
  const out = new Set();
  for (const m of rule.months || []) {
    if (typeof m === 'number') out.add(m);
    else if (SEASONS[m] && SEASONS[m][climate]) out.add(SEASONS[m][climate]);
  }
  return [...out].sort((a, b) => a - b);
}

function applies(rule, home, ctx) {
  if (!rule.condition) return true;
  try {
    return !!rule.condition(home, ctx);
  } catch (e) {
    return false;
  }
}

// Every rule that fits this home in a given month (hidden ones included — see monthPlan).
export function rulesForMonth(home, year, month, rules = RULES) {
  const climate = climateFor(home);
  const ctx = { climate, year, month };
  return rules.filter((r) => monthsFor(r, climate).includes(month) && applies(r, home, ctx));
}

// Rules that can never apply to this home in any month (used by the tests and the hidden list).
export function rulesForHome(home, year, rules = RULES) {
  const ids = new Set();
  for (let m = 1; m <= 12; m++) rulesForMonth(home, year, m, rules).forEach((r) => ids.add(r.id));
  return rules.filter((r) => ids.has(r.id));
}

export function whyFor(rule, home) {
  return home && home.household === true && rule.whyFamily ? rule.whyFamily : rule.why;
}

const doneSet = (home, key) => new Set(((home.done || {})[key]) || []);
const snoozeKey = (key, ruleId) => `${key}:${ruleId}`;

// Everything the "This month" screen needs for one month.
//   tasks    — this month's jobs that are not hidden and not snoozed right now
//   snoozed  — snoozed jobs that are still waiting ({ rule, key, until })
//   carried  — jobs snoozed in an earlier month that are due again now ({ rule, key, until })
//   hidden   — this month's jobs the person said are "not for my house"
//   total / doneCount — for the progress ring (this month's own, non-hidden jobs)
export function monthPlan(home, year, month, today = isoDate(new Date()), rules = RULES) {
  const key = monthKey(year, month);
  const hiddenIds = new Set(home.hidden || []);
  const all = rulesForMonth(home, year, month, rules);
  const shown = all.filter((r) => !hiddenIds.has(r.id));
  const hidden = all.filter((r) => hiddenIds.has(r.id));
  const done = doneSet(home, key);
  const byId = new Map(rules.map((r) => [r.id, r]));

  const snoozed = [];
  const carried = [];
  const snoozedHere = new Set();
  for (const [k, until] of Object.entries(home.snoozed || {})) {
    const i = k.lastIndexOf(':');
    const fromKey = k.slice(0, i);
    const rule = byId.get(k.slice(i + 1));
    if (!rule || hiddenIds.has(rule.id) || !parseMonthKey(fromKey) || typeof until !== 'string') continue;
    if (doneSet(home, fromKey).has(rule.id)) continue;
    if (fromKey > key) continue;
    if (until > today) {
      snoozed.push({ rule, key: fromKey, until });
      if (fromKey === key) snoozedHere.add(rule.id);
    } else if (fromKey < key && until.slice(0, 7) === key) {
      carried.push({ rule, key: fromKey, until });
    }
  }
  snoozed.sort((a, b) => a.until.localeCompare(b.until));

  const tasks = shown
    .filter((r) => !snoozedHere.has(r.id))
    .map((rule) => ({ rule, key, done: done.has(rule.id) }));

  return {
    key, year, month,
    tasks, snoozed, carried, hidden,
    total: shown.length,
    doneCount: shown.filter((r) => done.has(r.id)).length,
  };
}

// ----- Changes to a home's task state (they change the home object; the caller saves it) -----

export function setDone(home, key, ruleId, isDone) {
  home.done = home.done || {};
  const list = new Set(home.done[key] || []);
  if (isDone) list.add(ruleId);
  else list.delete(ruleId);
  if (list.size) home.done[key] = [...list];
  else delete home.done[key];
  if (isDone && home.snoozed) delete home.snoozed[snoozeKey(key, ruleId)];
}

export function isDone(home, key, ruleId) {
  return doneSet(home, key).has(ruleId);
}

export function snooze(home, key, ruleId, today = isoDate(new Date()), days = SNOOZE_DAYS) {
  home.snoozed = home.snoozed || {};
  const until = addDays(today, days);
  home.snoozed[snoozeKey(key, ruleId)] = until;
  return until;
}

export function unsnooze(home, key, ruleId) {
  if (home.snoozed) delete home.snoozed[snoozeKey(key, ruleId)];
}

export function hideRule(home, ruleId) {
  home.hidden = [...new Set([...(home.hidden || []), ruleId])];
}

export function unhideRule(home, ruleId) {
  home.hidden = (home.hidden || []).filter((id) => id !== ruleId);
}

// Tidy up old snooze records (more than a year old) so the home record doesn't grow forever.
export function pruneSnoozes(home, today = isoDate(new Date())) {
  const cutoff = addDays(today, -400);
  for (const [k, until] of Object.entries(home.snoozed || {})) {
    if (typeof until !== 'string' || until < cutoff) delete home.snoozed[k];
  }
}

// ----- Systems at a glance -----

export const AGE_STATUS = {
  ok: 'Plenty of life left',
  older: 'Getting older — keep an eye on it',
  past: 'At or past typical age — start planning',
};

// "Getting older" starts at 75% of the low end of the typical range;
// "At or past typical age" starts at the low end.
export function ageStatus(installYear, range, currentYear) {
  const y = Number(installYear);
  if (!installYear || !Number.isFinite(y) || y > currentYear || !range) return null;
  const age = currentYear - y;
  const [low, high] = range;
  let status = 'ok';
  if (age >= low) status = 'past';
  else if (age >= Math.ceil(low * 0.75)) status = 'older';
  const scale = high || Math.round(low * 1.25);
  return { age, low, high, status, label: AGE_STATUS[status], pct: Math.min(100, Math.round((age / scale) * 100)), lowPct: Math.round((low / scale) * 100) };
}

export function rangeLabel(range) {
  const [low, high] = range;
  if (!high) return `${low}+ years`;
  if (low === high) return `replace at ${low} years`;
  return `${low}–${high} years`;
}

// One row per system the home has. Rows without a year (or without a typical range) have status null.
export function systemsReport(home, currentYear) {
  const rows = [];
  const add = (key, name, type, year, range) => {
    rows.push({ key, name, type, year: year || null, range: range || null, result: range ? ageStatus(year, range, currentYear) : null });
  };
  if (home.roofType || home.roofYear) {
    add('roof', 'Roof', ROOF_TYPES[home.roofType] || '', home.roofYear, LIFESPANS.roof[home.roofType]);
  }
  if (home.waterHeaterType || home.waterHeaterYear) {
    add('water-heater', 'Water heater', WATER_HEATER_TYPES[home.waterHeaterType] || '', home.waterHeaterYear, LIFESPANS.waterHeater[home.waterHeaterType]);
  }
  if (home.heatingType !== 'none' && (home.heatingType || home.heatingYear)) {
    const name = /boiler$/.test(home.heatingType) ? 'Boiler' : home.heatingType === 'heat-pump' ? 'Heat pump' : 'Furnace';
    add('heating', name, HEATING_TYPES[home.heatingType] || '', home.heatingYear, LIFESPANS.heating[home.heatingType]);
  }
  if (home.centralAC === true) add('ac', 'Central AC', '', home.acYear, LIFESPANS.centralAC);
  if (home.sumpPump === true) add('sump', 'Sump pump', '', home.sumpYear, LIFESPANS.sumpPump);
  add('smoke', 'Smoke alarms', '', home.smokeAlarmYear, LIFESPANS.smokeAlarm);
  add('co', 'CO alarms', '', home.coAlarmYear, LIFESPANS.coAlarm);
  return rows;
}

// ----- Checking a saved home (backup restore) -----
export function cleanYear(v, currentYear = new Date().getFullYear()) {
  const n = Number(String(v == null ? '' : v).trim());
  if (!String(v == null ? '' : v).trim() || !Number.isInteger(n) || n < 1800 || n > currentYear + 1) return null;
  return n;
}
