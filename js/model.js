import { AREAS } from '../data/checklist.js';
import { WALK_ORDER } from '../config.js';

export const MODES = {
  B: { label: 'Buying a home', desc: 'Every area of the house. Use it when you look at a home you might buy.' },
  A: { label: 'Yearly home check', desc: 'A once-a-year walk-through of the home you live in.' },
  W: { label: 'Get ready for winter', desc: 'A shorter list for the fall, before the cold weather comes.' },
};

export const STATUSES = {
  ok: { label: 'OK', icon: 'check' },
  watch: { label: 'Keep an eye on', icon: 'eye' },
  problem: { label: 'Problem', icon: 'alert' },
  na: { label: 'N/A', icon: 'na' },
};
export const STATUS_ORDER = ['ok', 'watch', 'problem', 'na'];

export const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function walkIndex(area) {
  const i = WALK_ORDER.indexOf(area.num);
  return i === -1 ? 1000 + area.num : i;
}

const sortedAreas = [...AREAS].sort((a, b) => walkIndex(a) - walkIndex(b));

// Areas (in walking order) with only the items for this mode. Empty areas are left out.
export function areasForMode(mode) {
  return sortedAreas
    .map((a) => ({ ...a, items: a.items.filter((it) => it.modes.includes(mode)) }))
    .filter((a) => a.items.length > 0);
}

export function itemsForMode(mode) {
  return areasForMode(mode).flatMap((a) => a.items.map((it) => ({ ...it, area: a })));
}

export function answerFor(insp, itemId) {
  return insp.answers[itemId] || { status: null, note: '', photoIds: [] };
}

export function progressFor(insp, items = itemsForMode(insp.mode)) {
  const counts = { ok: 0, watch: 0, problem: 0, na: 0 };
  let done = 0;
  for (const it of items) {
    const s = insp.answers[it.id] && insp.answers[it.id].status;
    if (s && counts[s] !== undefined) {
      counts[s]++;
      done++;
    }
  }
  const total = items.length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, counts };
}

// Problems (High → Medium → Low, then walking order) and "keep an eye on" items.
export function findings(insp) {
  const items = itemsForMode(insp.mode);
  const withAnswer = items.map((it, order) => ({ ...it, order, answer: answerFor(insp, it.id) }));
  const problems = withAnswer
    .filter((it) => it.answer.status === 'problem')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.order - b.order);
  const watch = withAnswer.filter((it) => it.answer.status === 'watch');
  return { problems, watch };
}

export function displayName(insp) {
  return (insp.name || '').trim() || 'Untitled home check';
}

export const DISCLAIMER =
  'This checklist is an educational guide to help you look at a home more carefully. It is not a professional home inspection and does not replace a licensed home inspector, engineer, electrician, plumber or other qualified professional. Always hire a qualified professional before making repair or purchase decisions.';
