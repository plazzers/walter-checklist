// "My Home" screens: home details, this month's jobs, year calendar, systems at a glance,
// calendar reminders and the house logbook. Everything stays on this device.
import * as db from './db.js';
import { MANUAL_URL } from '../config.js';
import { DISCLAIMER } from './model.js';
import { icon } from './icons.js';
import { compressPhoto } from './photos.js';
import { esc, uid, debounce, downloadBlob, shareFile, isoDay, slugify } from './util.js';
import { CLIMATES, STATES, SYSTEMS, RULES } from '../data/maintenance.js';
import {
  MONTH_NAMES, MONTH_SHORT, ROOF_TYPES, WATER_HEATER_TYPES, HEATING_TYPES, FOUNDATION_TYPES,
  newHome, homeName, monthKey, parseMonthKey, addMonths, climateFor, climateFromState, monthPlan,
  rulesForMonth, whyFor, setDone, snooze, unsnooze, hideRule, unhideRule, pruneSnoozes,
  systemsReport, rangeLabel, cleanYear, AGE_STATUS,
} from './homeplan.js';
import { buildICS } from './ics.js';
import { formatCost, whoDid, formatLogDate, sortLogs } from './logbook-pdf.js';

let ctx = null;
let upsellSessionKey = null;

const today = () => isoDay();
const now = () => new Date();
const thisYear = () => now().getFullYear();
const thisMonthKey = () => monthKey(now().getFullYear(), now().getMonth() + 1);
const homeBase = (home) => `#/home/${encodeURIComponent(home.id)}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// One save at a time, in order, so a slow save can never overwrite a newer one.
let saveChain = Promise.resolve();
function saveHome(home) {
  home.updatedAt = new Date().toISOString();
  const copy = JSON.parse(JSON.stringify(home));
  saveChain = saveChain
    .then(() => db.putHome(copy))
    .catch((e) => {
      console.error(e);
      ctx.toast("Couldn't save. Your device may be out of space.", 5000);
    });
  return saveChain;
}

// ====================================================================
//  Router for #/home/…
// ====================================================================

export async function renderMyHome(parts, context) {
  ctx = context;
  const [first, sub, extra] = parts;

  if (first === 'new') return renderProfile(null);

  const homes = await db.listHomes();
  homes.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  if (!first) {
    if (!homes.length) return renderWelcome();
    const lastId = await db.getMeta('currentHome');
    const home = homes.find((h) => h.id === lastId) || homes[0];
    return renderMonth(home, homes, null);
  }

  const home = homes.find((h) => h.id === first);
  if (!home) {
    ctx.toast('That home was not found on this device.');
    location.replace('#/home');
    return;
  }
  db.setMeta('currentHome', home.id);

  if (sub === 'edit') return renderProfile(home);
  if (sub === 'year') return renderYear(home, homes, Number(extra) || thisYear());
  if (sub === 'month') {
    const pm = parseMonthKey(extra);
    if (!pm || extra === thisMonthKey()) {
      location.replace(homeBase(home));
      return;
    }
    return renderMonth(home, homes, pm);
  }
  if (sub === 'systems') return renderSystems(home, homes);
  if (sub === 'log') {
    if (extra === 'new') return renderLogForm(home, null);
    if (extra) {
      const log = await db.getLog(extra);
      if (!log || log.homeId !== home.id) {
        location.replace(`${homeBase(home)}/log`);
        return;
      }
      return renderLogForm(home, log);
    }
    return renderLogbook(home, homes);
  }
  return renderMonth(home, homes, null);
}

// ====================================================================
//  Shared pieces
// ====================================================================

function homeBar(home, homes, active) {
  const base = homeBase(home);
  const tabs = [
    ['month', 'This month', base, 'calendar'],
    ['year', 'Year', `${base}/year`, 'list'],
    ['systems', 'Systems', `${base}/systems`, 'gauge'],
    ['log', 'Logbook', `${base}/log`, 'book'],
  ];
  const picker = homes.length > 1
    ? `<label class="visually-hidden" for="home-pick">Which home</label>
       <select id="home-pick" class="home-bar__pick">${homes.map((h) => `<option value="${esc(h.id)}" ${h.id === home.id ? 'selected' : ''}>${esc(homeName(h))}</option>`).join('')}</select>`
    : `<span class="home-bar__name">${icon('home')} ${esc(homeName(home))}</span>`;
  return `<div class="home-bar">
      ${picker}
      <span class="home-bar__links">
        <a class="btn btn--ghost btn--small" href="${base}/edit">${icon('edit')} Home details</a>
        <a class="btn btn--ghost btn--small" href="#/home/new">${icon('plus')} Add a home</a>
      </span>
    </div>
    <nav class="subnav" aria-label="My Home">
      ${tabs.map(([k, label, href, ic]) => `<a href="${href}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span></a>`).join('')}
    </nav>`;
}

function bindHomePicker() {
  const pick = ctx.main.querySelector('#home-pick');
  if (!pick) return;
  pick.addEventListener('change', () => {
    location.hash = `#/home/${encodeURIComponent(pick.value)}`;
  });
}

function ring(done, total) {
  const pct = total ? done / total : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return `<div class="ring" role="img" aria-label="${done} of ${total} done">
    <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
      <circle cx="42" cy="42" r="${r}" class="ring__track"/>
      <circle cx="42" cy="42" r="${r}" class="ring__fill" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct)).toFixed(1)}" transform="rotate(-90 42 42)"/>
    </svg>
    <span class="ring__text" aria-hidden="true">${total ? Math.round(pct * 100) : 0}%</span>
  </div>`;
}

function tagsHtml(rule) {
  return `<div class="task__tags">
    <span class="tag">${icon('clock')} ${rule.minutes >= 60 && rule.minutes % 60 === 0 ? `${rule.minutes / 60} hr` : `${rule.minutes} min`}</span>
    ${rule.diy
      ? `<span class="tag tag--diy">${icon('wrench')} Do it myself</span>`
      : `<span class="tag tag--pro">${icon('person')} Call a pro${rule.pro ? `: ${esc(rule.pro)}` : ''}</span>`}
    ${rule.safety ? `<span class="tag tag--safety">${icon('shield')} Safety</span>` : ''}
  </div>`;
}

// One job card. opts: { key, done, snoozeable, from }
function taskHtml(home, rule, { key, done, snoozeable, from }) {
  const id = `t-${key}-${rule.id}`;
  return `<li class="task" data-rule="${esc(rule.id)}" data-key="${esc(key)}" data-done="${done}">
    <div class="task__head">
      <h3 class="task__title" id="${id}-title">${esc(rule.title)}</h3>
      <label class="done-toggle" for="${id}">
        <input type="checkbox" id="${id}" data-action="done" ${done ? 'checked' : ''} aria-describedby="${id}-title">
        <span>Done</span>
      </label>
    </div>
    ${from ? `<p class="task__from">${icon('clock')} Snoozed from ${esc(MONTH_NAMES[parseMonthKey(from).month - 1])}</p>` : ''}
    <p class="task__why">${esc(whyFor(rule, home))}</p>
    ${tagsHtml(rule)}
    ${!rule.diy || !rule.pro ? '' : `<p class="task__pro small muted">If something looks wrong: ${esc(rule.pro)}</p>`}
    <div class="task__actions">
      ${snoozeable && !done ? `<button type="button" class="btn btn--secondary btn--small" data-action="snooze">${icon('clock')} Snooze 2 weeks</button>` : ''}
      <button type="button" class="btn btn--ghost btn--small" data-action="hide">${icon('hide')} Not for my house</button>
    </div>
  </li>`;
}

const shortDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

async function upsellHtml() {
  const key = thisMonthKey();
  let rec = {};
  try { rec = (await db.getMeta('upsell')) || {}; } catch (e) { /* fine */ }
  if (rec.dismissed === key) return '';
  if (rec.shown !== key) {
    upsellSessionKey = key;
    await db.setMeta('upsell', { ...rec, shown: key });
  }
  if (upsellSessionKey !== key) return '';
  return `<aside class="upsell" id="upsell" aria-labelledby="upsell-title">
    <h2 id="upsell-title">Want the full picture?</h2>
    <p>The Home Check Manual has the room-by-room guide and a seasonal calendar.</p>
    <div class="row">
      <a class="btn btn--secondary btn--small" href="${esc(MANUAL_URL)}" target="_blank" rel="noopener">See the Manual</a>
      <button type="button" class="btn btn--ghost btn--small" data-action="dismiss-upsell">No thanks</button>
    </div>
  </aside>`;
}

function bindTaskActions(home) {
  const onClick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.tagName === 'INPUT') return;
    const action = btn.dataset.action;
    if (action === 'dismiss-upsell') {
      const rec = (await db.getMeta('upsell')) || {};
      await db.setMeta('upsell', { ...rec, dismissed: thisMonthKey() });
      const el = document.getElementById('upsell');
      if (el) el.remove();
      return;
    }
    const li = btn.closest('[data-rule]');
    if (!li) return;
    const ruleId = li.dataset.rule;
    const key = li.dataset.key;
    if (action === 'snooze') {
      const until = snooze(home, key, ruleId, today());
      await saveHome(home);
      ctx.toast(`Snoozed until ${shortDate(until)}.`);
      ctx.refresh();
    } else if (action === 'unsnooze') {
      unsnooze(home, key, ruleId);
      await saveHome(home);
      ctx.toast('Back on your list.');
      ctx.refresh();
    } else if (action === 'hide') {
      hideRule(home, ruleId);
      await saveHome(home);
      ctx.toast('Hidden for this home. You can bring it back at the bottom of the page.', 3500);
      ctx.refresh();
    } else if (action === 'unhide') {
      unhideRule(home, ruleId);
      await saveHome(home);
      ctx.toast('Back on your list.');
      ctx.refresh();
    }
  };
  const onChange = async (e) => {
    const box = e.target.closest('input[data-action="done"]');
    if (!box) return;
    const li = box.closest('[data-rule]');
    setDone(home, li.dataset.key, li.dataset.rule, box.checked);
    li.dataset.done = String(box.checked);
    await saveHome(home);
    ctx.toast(box.checked ? 'Nice work — marked done.' : 'Marked not done.');
    ctx.refresh();
  };
  ctx.main.addEventListener('click', onClick);
  ctx.main.addEventListener('change', onChange);
  ctx.addCleanup(() => {
    ctx.main.removeEventListener('click', onClick);
    ctx.main.removeEventListener('change', onChange);
  });
}

// ====================================================================
//  Welcome (no home yet)
// ====================================================================

function renderWelcome() {
  ctx.setChrome({ title: 'My Home' });
  ctx.main.innerHTML = `
    <h1 class="page-title">My Home</h1>
    <section class="card welcome">
      <img class="welcome__avatar" src="assets/walter-avatar.png" alt="" width="72" height="72">
      <div>
        <p class="lede" style="margin-top:0">A house runs better with a little care each month. Tell me a few things about your home, and I'll make you a simple list for every month of the year.</p>
        <ul class="welcome__list">
          <li>${icon('calendar')} This month's jobs, with how long they take and whether to call a pro</li>
          <li>${icon('gauge')} How old your roof, water heater and furnace are</li>
          <li>${icon('book')} A logbook of what was done — handy when you sell</li>
          <li>${icon('phone')} Monthly reminders in your phone's calendar</li>
        </ul>
      </div>
    </section>
    <p><a class="btn btn--big" href="#/home/new">${icon('plus')} Set up my home</a></p>
    <p class="small muted center">It takes about 3 minutes. Every question is optional — skip anything you don't know.</p>`;
  ctx.afterRender();
}

// ====================================================================
//  Home details form
// ====================================================================

const yn = (v) => (v === true ? 'yes' : v === false ? 'no' : '');
const ynValue = (s) => (s === 'yes' ? true : s === 'no' ? false : null);

function selectHtml(name, label, options, value, { hint = '', blank = "Don't know" } = {}) {
  return `<div class="field">
    <label for="f-${name}">${label}</label>
    ${hint ? `<p class="hint" id="f-${name}-hint">${hint}</p>` : ''}
    <select id="f-${name}" name="${name}" ${hint ? `aria-describedby="f-${name}-hint"` : ''}>
      <option value="">${esc(blank)}</option>
      ${Object.entries(options).map(([k, v]) => `<option value="${esc(k)}" ${value === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
    </select>
  </div>`;
}

function yesNoHtml(name, label, value) {
  return selectHtml(name, label, { yes: 'Yes', no: 'No' }, yn(value), { blank: 'Not sure' });
}

function yearHtml(name, label, value, hint = 'Leave empty if you don\'t know.') {
  return `<div class="field field--year">
    <label for="f-${name}">${label}</label>
    <input type="text" id="f-${name}" name="${name}" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"
      value="${value ? esc(value) : ''}" placeholder="Year" aria-describedby="f-${name}-hint f-${name}-err">
    <p class="hint" id="f-${name}-hint">${hint}</p>
    <p class="error small" id="f-${name}-err" role="alert"></p>
  </div>`;
}

function readForm(form, home) {
  const fd = new FormData(form);
  const get = (k) => String(fd.get(k) || '').trim();
  const year = (k) => cleanYear(get(k), thisYear());
  home.nickname = get('nickname');
  home.state = get('state');
  home.climate = get('climate');
  home.yearBuilt = year('yearBuilt');
  home.roofType = get('roofType');
  home.roofYear = year('roofYear');
  home.waterHeaterType = get('waterHeaterType');
  home.waterHeaterYear = year('waterHeaterYear');
  home.heatingType = get('heatingType');
  home.heatingYear = home.heatingType === 'none' ? null : year('heatingYear');
  home.centralAC = ynValue(get('centralAC'));
  home.acYear = home.centralAC ? year('acYear') : null;
  home.sumpPump = ynValue(get('sumpPump'));
  home.sumpYear = home.sumpPump ? year('sumpYear') : null;
  home.well = ynValue(get('well'));
  home.septic = ynValue(get('septic'));
  home.septicPumpedYear = home.septic ? year('septicPumpedYear') : null;
  home.fireplace = ynValue(get('fireplace'));
  home.deck = ynValue(get('deck'));
  home.foundation = get('foundation');
  home.gutters = ynValue(get('gutters'));
  home.smokeAlarmYear = year('smokeAlarmYear');
  home.coAlarmYear = year('coAlarmYear');
  home.radonTestYear = year('radonTestYear');
  home.household = ynValue(get('household'));
}

function renderProfile(existing) {
  const isNew = !existing;
  const home = existing || newHome(uid('home'));
  ctx.setChrome({ title: isNew ? 'Set up my home' : 'Home details', back: isNew ? '#/home' : homeBase(home) });
  const stateOptions = Object.fromEntries(STATES.map(([code, name]) => [code, name]));
  const autoLabel = (state) => {
    const c = climateFromState(state);
    return c ? `Automatic — ${CLIMATES[c]} (from your state)` : 'Automatic — pick a state, or choose here';
  };

  ctx.main.innerHTML = `
    <h1 class="page-title">${isNew ? 'Set up my home' : 'Home details'}</h1>
    <p class="lede">Everything is optional and stays on this device. ${isNew ? 'Skip anything you don\'t know — you can fill it in later.' : 'Changes save automatically.'}</p>
    <form id="home-form" novalidate>
      <fieldset class="form-group">
        <legend>About the home</legend>
        <div class="field">
          <label for="f-nickname">Nickname</label>
          <p class="hint" id="f-nickname-hint">For example "Our house" or "The lake cabin".</p>
          <input type="text" id="f-nickname" name="nickname" value="${esc(home.nickname)}" autocomplete="off" aria-describedby="f-nickname-hint">
        </div>
        ${selectHtml('state', 'US state', stateOptions, home.state, { blank: 'Choose a state', hint: 'Only used to pick your climate, so jobs land in the right month.' })}
        <div class="field">
          <label for="f-climate">Climate</label>
          <select id="f-climate" name="climate">
            <option value="" id="climate-auto">${esc(autoLabel(home.state))}</option>
            ${Object.entries(CLIMATES).map(([k, v]) => `<option value="${k}" ${home.climate === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
          </select>
        </div>
        ${yearHtml('yearBuilt', 'Year built', home.yearBuilt)}
      </fieldset>

      <fieldset class="form-group">
        <legend>Systems</legend>
        <p class="hint">Install years let me show how old things are. Leave a year empty if you don't know it.</p>
        <div class="pair">${selectHtml('roofType', 'Roof', ROOF_TYPES, home.roofType)}${yearHtml('roofYear', 'Roof installed', home.roofYear, '')}</div>
        <div class="pair">${selectHtml('waterHeaterType', 'Water heater', WATER_HEATER_TYPES, home.waterHeaterType)}${yearHtml('waterHeaterYear', 'Water heater installed', home.waterHeaterYear, '')}</div>
        <div class="pair">${selectHtml('heatingType', 'Furnace / boiler (heating)', HEATING_TYPES, home.heatingType)}${yearHtml('heatingYear', 'Heating installed', home.heatingYear, '')}</div>
        <div class="pair">${yesNoHtml('centralAC', 'Central air conditioning', home.centralAC)}${yearHtml('acYear', 'AC installed', home.acYear, '')}</div>
        <div class="pair">${yesNoHtml('sumpPump', 'Sump pump', home.sumpPump)}${yearHtml('sumpYear', 'Sump pump installed', home.sumpYear, '')}</div>
        <div class="pair">${yesNoHtml('well', 'Private well', home.well)}</div>
        <div class="pair">${yesNoHtml('septic', 'Septic system', home.septic)}${yearHtml('septicPumpedYear', 'Septic last pumped', home.septicPumpedYear, '')}</div>
        <div class="pair">${yesNoHtml('fireplace', 'Fireplace or wood stove', home.fireplace)}${yesNoHtml('deck', 'Deck', home.deck)}</div>
        <div class="pair">${selectHtml('foundation', 'Basement, crawlspace or slab', FOUNDATION_TYPES, home.foundation)}${yesNoHtml('gutters', 'Gutters', home.gutters)}</div>
        <div class="pair">${yearHtml('smokeAlarmYear', 'Smoke alarms installed', home.smokeAlarmYear, 'The year is printed on the back.')}${yearHtml('coAlarmYear', 'CO alarms installed', home.coAlarmYear, 'The year is printed on the back.')}</div>
        <div class="pair">${yearHtml('radonTestYear', 'Last radon test', home.radonTestYear, 'Leave empty if never or not sure.')}</div>
      </fieldset>

      <fieldset class="form-group">
        <legend>Who lives here</legend>
        ${yesNoHtml('household', 'Kids or older adults at home?', home.household)}
        <p class="hint">Only changes the wording of a few safety reminders.</p>
      </fieldset>

      <button class="btn btn--big" type="submit">${isNew ? `Save and see this month's list ${icon('next')}` : `Done ${icon('check')}`}</button>
    </form>
    ${isNew ? '' : `<section class="section" aria-labelledby="del-home-title">
      <h2 id="del-home-title">Delete this home</h2>
      <p class="small muted">Removes the home details, its monthly list and its logbook from this device.</p>
      <button type="button" class="btn btn--danger" data-action="delete-home">${icon('trash')} Delete "${esc(homeName(home))}"</button>
    </section>`}`;

  const form = ctx.main.querySelector('#home-form');
  const autoOpt = ctx.main.querySelector('#climate-auto');

  // Show/hide the year fields that only make sense with a "yes".
  const deps = [['heatingType', 'heatingYear', (v) => v !== 'none'], ['centralAC', 'acYear', (v) => v === 'yes'],
    ['sumpPump', 'sumpYear', (v) => v === 'yes'], ['septic', 'septicPumpedYear', (v) => v === 'yes']];
  const syncDeps = () => {
    for (const [src, dst, show] of deps) {
      const field = form.querySelector(`#f-${dst}`).closest('.field');
      field.hidden = !show(form.elements[src].value);
    }
    autoOpt.textContent = autoLabel(form.elements.state.value);
  };
  syncDeps();

  const checkYear = (input) => {
    if (!input || !/Year$/.test(input.name)) return true;
    const err = ctx.main.querySelector(`#f-${input.name}-err`);
    const bad = input.value.trim() && cleanYear(input.value, thisYear()) === null;
    err.textContent = bad ? 'Please type a 4-digit year, like 2012.' : '';
    input.toggleAttribute('aria-invalid', !!bad);
    return !bad;
  };

  const autosave = debounce(async () => {
    readForm(form, home);
    await saveHome(home);
  }, 400);
  if (!isNew) {
    form.addEventListener('input', () => autosave());
    form.addEventListener('change', () => autosave());
    ctx.addFlush(autosave.flush);
  }
  form.addEventListener('change', (e) => {
    syncDeps();
    checkYear(e.target);
  });
  form.addEventListener('focusout', (e) => checkYear(e.target));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = [...form.querySelectorAll('input[name$="Year"]')].filter((i) => !checkYear(i));
    if (bad.length) {
      bad[0].focus();
      return;
    }
    readForm(form, home);
    if (isNew) home.createdAt = new Date().toISOString();
    await autosave.flush();
    await saveHome(home);
    await db.setMeta('currentHome', home.id);
    ctx.toast(isNew ? 'Your home is saved.' : 'Saved.');
    location.hash = homeBase(home);
  });

  const onClick = async (e) => {
    const btn = e.target.closest('[data-action="delete-home"]');
    if (!btn) return;
    if (!confirm(`Delete "${homeName(home)}"?\n\nIts details, monthly list and logbook (with photos) will be removed from this device. This cannot be undone.`)) return;
    autosave.flush();
    await saveChain;
    await db.deleteHome(home.id);
    ctx.toast('Home deleted.');
    location.hash = '#/home';
  };
  ctx.main.addEventListener('click', onClick);
  ctx.addCleanup(() => ctx.main.removeEventListener('click', onClick));
  ctx.afterRender();
}

// ====================================================================
//  This month (and any other month from the year view)
// ====================================================================

async function renderMonth(home, homes, which) {
  pruneSnoozes(home, today());
  const n = now();
  const isCurrent = !which;
  const year = which ? which.year : n.getFullYear();
  const month = which ? which.month : n.getMonth() + 1;
  const plan = monthPlan(home, year, month, today());
  const name = MONTH_NAMES[month - 1];
  const base = homeBase(home);
  ctx.setChrome({ title: isCurrent ? 'My Home' : `${name} ${year}`, back: isCurrent ? null : `${base}/year/${year}` });

  const count = plan.total;
  const heading = `${isCurrent ? name : `${name} ${year}`} — ${count ? `${plural(count, 'thing')} for your house` : 'nothing due for your house'}`;

  const items = plan.tasks.map((t) => taskHtml(home, t.rule, { key: t.key, done: t.done, snoozeable: isCurrent }));
  const carried = isCurrent ? plan.carried.map((c) => taskHtml(home, c.rule, { key: c.key, done: false, snoozeable: true, from: c.key })) : [];

  const snoozedHtml = isCurrent && plan.snoozed.length
    ? `<details class="fold">
        <summary>Snoozed (${plan.snoozed.length})</summary>
        <ul class="mini-list">${plan.snoozed.map((s) => `<li data-rule="${esc(s.rule.id)}" data-key="${esc(s.key)}">
          <span><strong>${esc(s.rule.title)}</strong><br><span class="small muted">Back on ${esc(shortDate(s.until))}</span></span>
          <button type="button" class="btn btn--secondary btn--small" data-action="unsnooze">Bring back now</button></li>`).join('')}</ul>
      </details>` : '';

  const nm = addMonths(year, month, 1);
  const hiddenIds = new Set(home.hidden || []);
  const nextRules = rulesForMonth(home, nm.year, nm.month).filter((r) => !hiddenIds.has(r.id));
  const nextHtml = isCurrent
    ? `<details class="fold">
        <summary>Coming up next month: ${esc(MONTH_NAMES[nm.month - 1])} (${nextRules.length})</summary>
        ${nextRules.length ? `<ul class="plain-list">${nextRules.map((r) => `<li>${esc(r.title)}</li>`).join('')}</ul>` : '<p class="muted">Nothing scheduled.</p>'}
      </details>` : '';

  const allHidden = [...hiddenIds];
  const hiddenHtml = allHidden.length
    ? `<details class="fold">
        <summary>Not for my house (${allHidden.length})</summary>
        <p class="small muted">Jobs you hid for this home. Bring any of them back here.</p>
        <ul class="mini-list">${allHidden.map((id) => {
          const r = ruleById(id);
          return r ? `<li data-rule="${esc(r.id)}" data-key="${esc(plan.key)}"><span>${esc(r.title)}</span>
            <button type="button" class="btn btn--secondary btn--small" data-action="unhide">Show again</button></li>` : '';
        }).join('')}</ul>
      </details>` : '';

  ctx.main.innerHTML = `
    ${homeBar(home, homes, isCurrent ? 'month' : 'year')}
    <div class="month-head">
      ${ring(plan.doneCount, plan.total)}
      <div>
        <h1 class="page-title month-title" id="month-title" tabindex="-1">${esc(heading)}</h1>
        <p class="muted" style="margin:0">${plan.total ? `${plan.doneCount} of ${plan.total} done${plan.doneCount === plan.total ? ' — nice work!' : ''}` : 'Enjoy the quiet month.'}</p>
      </div>
    </div>
    ${carried.length ? `<h2 class="list-title">Left over from last month</h2><ul class="task-list">${carried.join('')}</ul>` : ''}
    ${items.length ? `<ul class="task-list">${items.join('')}</ul>` : (plan.total ? '' : `<p class="empty">Nothing on the list for ${esc(name)}. Your next jobs are below.</p>`)}
    ${snoozedHtml}
    ${nextHtml}
    ${hiddenHtml}
    ${isCurrent ? calendarCardHtml() : `<p class="section"><a class="btn btn--secondary btn--block" href="${base}/year/${year}">${icon('back')} Back to the year</a></p>`}
    ${isCurrent ? await upsellHtml() : ''}
    <p class="disclaimer">${esc(DISCLAIMER)}</p>`;

  bindHomePicker();
  bindTaskActions(home);
  if (isCurrent) bindCalendarExport(home);
  ctx.afterRender();
}

const RULE_MAP = new Map(RULES.map((r) => [r.id, r]));
const ruleById = (id) => RULE_MAP.get(id);

// ====================================================================
//  Calendar reminders (.ics)
// ====================================================================

function calendarCardHtml() {
  const phone = ctx.onPhone();
  return `<section class="card cal-card" aria-labelledby="cal-title">
    <h2 id="cal-title">${icon('calendar')} Reminders on your phone</h2>
    <p>Adds one reminder on the 1st of each month for the next 12 months, listing that month's jobs. If you add them again later, most calendar apps update the reminders instead of making copies.</p>
    <button type="button" class="btn btn--block" data-action="ics">${icon('calendar')} Add reminders to my phone calendar</button>
    ${phone ? '<button type="button" class="btn btn--ghost btn--block" data-action="ics-download">Download the calendar file instead</button>' : ''}
    <p class="small muted" style="margin-top:10px">${phone ? 'Choose your Calendar app when asked.' : 'Open the downloaded file to add it to your calendar, or email it to your phone.'}</p>
  </section>`;
}

function bindCalendarExport(home) {
  const onClick = async (e) => {
    const btn = e.target.closest('[data-action="ics"], [data-action="ics-download"]');
    if (!btn) return;
    try {
      const text = buildICS(home, { from: now() });
      const blob = new Blob([text], { type: 'text/calendar' });
      const filename = `walters-home-check-${slugify(home.nickname || 'my-home')}-reminders.ics`;
      if (btn.dataset.action === 'ics' && ctx.onPhone()) {
        const r = await shareFile(blob, filename, "Walter's Home Check reminders");
        if (r === 'downloaded') ctx.toast('Calendar file downloaded. Open it to add the reminders.', 4000);
      } else {
        downloadBlob(blob, filename);
        ctx.toast('Calendar file downloaded. Open it to add the reminders.', 4000);
      }
    } catch (err) {
      console.error(err);
      ctx.toast("Sorry, the calendar file couldn't be made.", 4000);
    }
  };
  ctx.main.addEventListener('click', onClick);
  ctx.addCleanup(() => ctx.main.removeEventListener('click', onClick));
}

// ====================================================================
//  Year calendar
// ====================================================================

function renderYear(home, homes, year) {
  if (year < 2000 || year > 2100) year = thisYear();
  const base = homeBase(home);
  ctx.setChrome({ title: `${year} calendar`, back: base });
  const cur = thisMonthKey();
  const cells = MONTH_NAMES.map((name, i) => {
    const m = i + 1;
    const plan = monthPlan(home, year, m, today());
    const key = monthKey(year, m);
    const href = key === cur ? base : `${base}/month/${key}`;
    const pct = plan.total ? Math.round((plan.doneCount / plan.total) * 100) : 0;
    const all = plan.total && plan.doneCount === plan.total;
    return `<li><a class="month-cell ${key === cur ? 'month-cell--now' : ''}" href="${href}" aria-label="${name} ${year}: ${plan.total} tasks, ${plan.doneCount} done${key === cur ? ' (this month)' : ''}">
      <span class="month-cell__name">${MONTH_SHORT[i]}${key === cur ? ' <span class="month-cell__now">Now</span>' : ''}</span>
      <span class="month-cell__count">${plural(plan.total, 'task')}</span>
      <span class="month-cell__done">${all ? `${icon('check')} All done` : `${plan.doneCount} done`}</span>
      <span class="progress__bar" aria-hidden="true"><span class="progress__fill" style="width:${pct}%"></span></span>
    </a></li>`;
  }).join('');

  ctx.main.innerHTML = `
    ${homeBar(home, homes, 'year')}
    <div class="year-head">
      <a class="btn btn--secondary btn--small" href="${base}/year/${year - 1}" aria-label="Previous year, ${year - 1}">${icon('back')} ${year - 1}</a>
      <h1 class="page-title" id="year-title" tabindex="-1">${year}</h1>
      <a class="btn btn--secondary btn--small" href="${base}/year/${year + 1}" aria-label="Next year, ${year + 1}">${year + 1} ${icon('next')}</a>
    </div>
    <p class="muted">Tap a month to see its list. Climate: <strong>${esc(CLIMATES[climateFor(home)])}</strong>.</p>
    <ul class="year-grid">${cells}</ul>
    <p class="disclaimer">${esc(DISCLAIMER)}</p>`;
  bindHomePicker();
  ctx.afterRender();
}

// ====================================================================
//  Systems at a glance
// ====================================================================

const STATUS_ICON = { ok: 'check', older: 'eye', past: 'alert' };

function renderSystems(home, homes) {
  const base = homeBase(home);
  ctx.setChrome({ title: 'Systems at a glance', back: base });
  const year = thisYear();
  const rows = systemsReport(home, year);
  const known = rows.filter((r) => r.result);
  const unknown = rows.filter((r) => !r.result);

  const card = (r) => {
    const res = r.result;
    return `<li class="sys sys--${res.status}">
      <div class="sys__head">
        <h2 class="sys__name">${esc(r.name)}${r.type ? ` <span class="sys__type">${esc(r.type)}</span>` : ''}</h2>
        <span class="sys__age">${plural(res.age, 'year')} old</span>
      </div>
      <p class="sys__status">${icon(STATUS_ICON[res.status])} <strong>${esc(res.label)}</strong></p>
      <div class="agebar" aria-hidden="true">
        <span class="agebar__fill" style="width:${res.pct}%"></span>
        <span class="agebar__mark" style="left:${res.lowPct}%"></span>
      </div>
      <p class="small muted">Installed ${esc(r.year)} · Typical range: ${esc(rangeLabel(r.range))} <em>(typical range, not a prediction)</em></p>
    </li>`;
  };

  ctx.main.innerHTML = `
    ${homeBar(home, homes, 'systems')}
    <h1 class="page-title" id="sys-title" tabindex="-1">Systems at a glance</h1>
    <p class="lede">How old the big things in your house are, next to how long they typically last. Every house is different — use it for planning, not as a forecast.</p>
    <ul class="legend">
      <li>${icon('check')} ${esc(AGE_STATUS.ok)}</li>
      <li>${icon('eye')} ${esc(AGE_STATUS.older)}</li>
      <li>${icon('alert')} ${esc(AGE_STATUS.past)}</li>
    </ul>
    ${known.length ? `<ul class="sys-list">${known.map(card).join('')}</ul>` : `<p class="empty">Add install years in <a href="${base}/edit">home details</a> to see how old your systems are.</p>`}
    ${unknown.length ? `<section class="section" aria-labelledby="unk-title">
      <h2 id="unk-title">No age yet</h2>
      <ul class="plain-list">${unknown.map((r) => `<li><strong>${esc(r.name)}</strong>${r.type ? ` — ${esc(r.type)}` : ''}: ${r.range ? 'install year not known' : 'no typical range for this type'}</li>`).join('')}</ul>
      <p><a class="btn btn--secondary" href="${base}/edit">${icon('edit')} Add install years</a></p>
    </section>` : ''}
    <p class="disclaimer">${esc(DISCLAIMER)}</p>`;
  bindHomePicker();
  ctx.afterRender();
}

// ====================================================================
//  Logbook
// ====================================================================

async function renderLogbook(home, homes) {
  const base = homeBase(home);
  ctx.setChrome({ title: 'Logbook', back: base });
  const logs = sortLogs(await db.getLogsForHome(home.id));
  let filter = '';
  try { filter = sessionStorage.getItem('whc-log-filter') || ''; } catch (e) { /* fine */ }
  if (filter && !SYSTEMS[filter]) filter = '';

  ctx.main.innerHTML = `
    ${homeBar(home, homes, 'log')}
    <h1 class="page-title" id="log-title" tabindex="-1">House logbook</h1>
    <p class="lede">A record of what was done to the house, by whom, and what it cost. Handy for warranties, and when you sell.</p>
    <p><a class="btn btn--big" href="${base}/log/new">${icon('plus')} Add an entry</a></p>
    ${logs.length ? `<div class="field">
      <label for="log-filter">Show</label>
      <select id="log-filter">
        <option value="">All parts of the house (${logs.length})</option>
        ${Object.entries(SYSTEMS).map(([k, v]) => {
          const n = logs.filter((l) => (l.system || 'other') === k).length;
          return n ? `<option value="${k}" ${filter === k ? 'selected' : ''}>${esc(v)} (${n})</option>` : '';
        }).join('')}
      </select>
    </div>` : ''}
    <ul class="log-list" id="log-list">${logs.length ? '' : ''}</ul>
    ${logs.length ? '' : '<p class="empty">No entries yet. Add the first one — a new water heater, a furnace tune-up, a roof repair…</p>'}
    <section class="card report-box section" aria-labelledby="logpdf-title">
      <h2 id="logpdf-title">Logbook PDF</h2>
      <p>A clean PDF of your home details, system ages and every logbook entry with photos.</p>
      <button type="button" class="btn btn--block" data-action="log-pdf" ${logs.length ? '' : 'disabled'}>${icon('doc')} Export logbook PDF</button>
      <p class="report-status small" id="logpdf-status" role="status"></p>
    </section>
    <p class="disclaimer">${esc(DISCLAIMER)}</p>`;

  const list = ctx.main.querySelector('#log-list');
  let alive = true;
  ctx.addCleanup(() => { alive = false; });

  async function drawList() {
    const shown = filter ? logs.filter((l) => (l.system || 'other') === filter) : logs;
    const html = [];
    for (const l of shown) {
      let thumb = '';
      if (l.photoIds && l.photoIds.length) {
        const p = await db.getLogPhoto(l.photoIds[0]);
        if (p) thumb = `<img class="log-card__thumb" src="${p.dataUrl}" alt="">`;
      }
      html.push(`<li><a class="log-card" href="${base}/log/${encodeURIComponent(l.id)}">
        ${thumb}
        <span class="log-card__body">
          <span class="log-card__meta">${esc(formatLogDate(l.date))} · ${esc(SYSTEMS[l.system] || SYSTEMS.other)}</span>
          <span class="log-card__what">${esc(l.what || 'Logbook entry')}</span>
          <span class="log-card__who">${esc(whoDid(l))}${formatCost(l.cost) ? ` · ${esc(formatCost(l.cost))}` : ''}${l.photoIds && l.photoIds.length > 1 ? ` · ${l.photoIds.length} photos` : ''}</span>
          ${l.notes ? `<span class="log-card__notes">${esc(l.notes)}</span>` : ''}
        </span>
      </a></li>`);
    }
    if (alive) list.innerHTML = html.join('');
  }
  await drawList();

  const sel = ctx.main.querySelector('#log-filter');
  if (sel) {
    sel.addEventListener('change', () => {
      filter = sel.value;
      try { sessionStorage.setItem('whc-log-filter', filter); } catch (e) { /* fine */ }
      drawList();
    });
  }

  const statusEl = ctx.main.querySelector('#logpdf-status');
  const onClick = async (e) => {
    const btn = e.target.closest('[data-action="log-pdf"]');
    if (!btn) return;
    btn.disabled = true;
    try {
      const { buildLogbook } = await import('./logbook-pdf.js');
      const blob = await buildLogbook(home, logs, (msg) => { if (alive) statusEl.textContent = msg; });
      const filename = `house-logbook-${slugify(home.nickname || 'my-home')}-${isoDay()}.pdf`;
      if (!alive) return;
      let r = 'downloaded';
      if (ctx.onPhone()) r = await shareFile(blob, filename, 'House Logbook');
      else downloadBlob(blob, filename);
      statusEl.innerHTML = r === 'cancelled' ? '' : `<strong>Your logbook PDF is ready.</strong> <span class="muted">${esc(filename)}</span>`;
    } catch (err) {
      console.error(err);
      statusEl.innerHTML = `<span class="error">Sorry, the PDF couldn't be made. ${esc(err.message || '')}</span>`;
    } finally {
      btn.disabled = false;
    }
  };
  ctx.main.addEventListener('click', onClick);
  ctx.addCleanup(() => ctx.main.removeEventListener('click', onClick));
  bindHomePicker();
  ctx.afterRender();
}

function parseCost(s) {
  const t = String(s || '').replace(/[$,\s]/g, '');
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t);
}

async function renderLogForm(home, existing) {
  const isNew = !existing;
  const base = homeBase(home);
  const log = existing ? { ...existing, photoIds: [...(existing.photoIds || [])] } : {
    id: uid('log'), homeId: home.id, date: isoDay(), what: '', system: '', who: 'me', company: '',
    cost: null, notes: '', photoIds: [], createdAt: '', updatedAt: '',
  };
  ctx.setChrome({ title: isNew ? 'New logbook entry' : 'Logbook entry', back: `${base}/log` });

  ctx.main.innerHTML = `
    <h1 class="page-title">${isNew ? 'New logbook entry' : 'Logbook entry'}</h1>
    <form id="log-form" novalidate>
      <div class="field">
        <label for="l-date">Date</label>
        <input type="date" id="l-date" name="date" value="${esc(log.date)}" max="${esc(addOneYear(isoDay()))}">
      </div>
      <div class="field">
        <label for="l-what">What was done</label>
        <p class="hint" id="l-what-hint">For example "Replaced the water heater" or "Furnace tune-up".</p>
        <input type="text" id="l-what" name="what" value="${esc(log.what)}" aria-describedby="l-what-hint l-what-err" autocomplete="off">
        <p class="error small" id="l-what-err" role="alert"></p>
      </div>
      <div class="field">
        <label for="l-system">Part of the house</label>
        <select id="l-system" name="system">
          ${Object.entries(SYSTEMS).map(([k, v]) => `<option value="${k}" ${(log.system || 'other') === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}
        </select>
      </div>
      <fieldset class="form-group form-group--plain">
        <legend>Who did it</legend>
        <div class="choice-row">
          <label class="choice"><input type="radio" name="who" value="me" ${log.who !== 'company' ? 'checked' : ''}> Me</label>
          <label class="choice"><input type="radio" name="who" value="company" ${log.who === 'company' ? 'checked' : ''}> A company</label>
        </div>
        <div class="field" id="company-field" ${log.who === 'company' ? '' : 'hidden'}>
          <label for="l-company">Company name</label>
          <input type="text" id="l-company" name="company" value="${esc(log.company)}" autocomplete="organization">
        </div>
      </fieldset>
      <div class="field">
        <label for="l-cost">Cost <span class="muted">(optional)</span></label>
        <p class="hint" id="l-cost-hint">Just the number, like 250 or 89.99.</p>
        <input type="text" id="l-cost" name="cost" inputmode="decimal" value="${log.cost != null ? esc(log.cost) : ''}" aria-describedby="l-cost-hint l-cost-err" autocomplete="off">
        <p class="error small" id="l-cost-err" role="alert"></p>
      </div>
      <div class="field">
        <label for="l-notes">Notes <span class="muted">(optional)</span></label>
        <textarea id="l-notes" name="notes" rows="3" placeholder="Model number, warranty, anything worth remembering">${esc(log.notes)}</textarea>
      </div>
      <div class="field">
        <span class="label">Photo <span class="muted">(optional)</span></span>
        <div class="photo-row">
          <div class="photo-buttons">
            <label class="btn btn--secondary btn--small" for="l-cam">${icon('camera')} Take photo</label>
            <input type="file" id="l-cam" data-photo accept="image/*" capture="environment">
            <label class="btn btn--secondary btn--small" for="l-gal">${icon('image')} Choose photo</label>
            <input type="file" id="l-gal" data-photo accept="image/*" multiple>
          </div>
          <span class="busy" id="l-busy" role="status"></span>
        </div>
        <ul class="thumbs" id="l-thumbs" aria-label="Photos"></ul>
      </div>
      <button class="btn btn--big" type="submit">${isNew ? `${icon('plus')} Add to logbook` : `${icon('check')} Save changes`}</button>
    </form>
    <p class="center" style="margin-top:12px"><a class="btn btn--ghost" href="${base}/log">Cancel</a></p>
    ${isNew ? '' : `<p class="section"><button type="button" class="btn btn--danger btn--block" data-action="delete-log">${icon('trash')} Delete this entry</button></p>`}`;

  const form = ctx.main.querySelector('#log-form');
  const thumbs = ctx.main.querySelector('#l-thumbs');
  const busy = ctx.main.querySelector('#l-busy');
  const pending = []; // new photos not saved yet
  const removed = [];

  const addThumb = (photo) => {
    const li = document.createElement('li');
    li.className = 'thumb';
    li.dataset.photoId = photo.id;
    li.innerHTML = `<button type="button" class="thumb__open" aria-label="View photo larger"><img alt=""></button>
      <button type="button" class="thumb__del" aria-label="Remove photo">${icon('trash')}</button>`;
    li.querySelector('img').src = photo.dataUrl;
    thumbs.appendChild(li);
  };
  for (const id of log.photoIds) {
    const p = await db.getLogPhoto(id);
    if (p) addThumb(p);
  }

  form.addEventListener('change', async (e) => {
    if (e.target.name === 'who') {
      ctx.main.querySelector('#company-field').hidden = e.target.value !== 'company';
      return;
    }
    const input = e.target.closest('input[data-photo]');
    if (!input || !input.files || !input.files.length) return;
    const files = [...input.files];
    input.value = '';
    for (const [i, file] of files.entries()) {
      busy.textContent = files.length > 1 ? `Adding photo ${i + 1} of ${files.length}…` : 'Adding photo…';
      try {
        const { dataUrl, width, height } = await compressPhoto(file);
        const photo = { id: uid('lphoto'), homeId: home.id, logId: log.id, dataUrl, width, height, createdAt: new Date().toISOString() };
        pending.push(photo);
        addThumb(photo);
      } catch (err) {
        console.error(err);
        ctx.toast(err.message || "That photo couldn't be added.", 4000);
      }
    }
    busy.textContent = '';
  });

  const onClick = async (e) => {
    const del = e.target.closest('.thumb__del');
    if (del) {
      const li = del.closest('.thumb');
      const id = li.dataset.photoId;
      const i = pending.findIndex((p) => p.id === id);
      if (i >= 0) pending.splice(i, 1);
      else removed.push(id);
      li.remove();
      return;
    }
    const open = e.target.closest('.thumb__open');
    if (open) {
      ctx.openViewer(open.querySelector('img').src, 'Logbook photo');
      return;
    }
    if (e.target.closest('[data-action="delete-log"]')) {
      if (!confirm('Delete this logbook entry and its photos? This cannot be undone.')) return;
      await db.deleteLog(log.id);
      ctx.toast('Entry deleted.');
      location.hash = `${base}/log`;
    }
  };
  ctx.main.addEventListener('click', onClick);
  ctx.addCleanup(() => ctx.main.removeEventListener('click', onClick));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const what = String(fd.get('what') || '').trim();
    const cost = parseCost(fd.get('cost'));
    const whatErr = ctx.main.querySelector('#l-what-err');
    const costErr = ctx.main.querySelector('#l-cost-err');
    whatErr.textContent = what ? '' : 'Please write a few words about what was done.';
    costErr.textContent = Number.isNaN(cost) ? 'Please type just a number, like 250 or 89.99.' : '';
    if (!what) return form.elements.what.focus();
    if (Number.isNaN(cost)) return form.elements.cost.focus();
    const stamp = new Date().toISOString();
    Object.assign(log, {
      date: String(fd.get('date') || '') || isoDay(),
      what,
      system: String(fd.get('system') || 'other'),
      who: fd.get('who') === 'company' ? 'company' : 'me',
      company: String(fd.get('company') || '').trim(),
      cost,
      notes: String(fd.get('notes') || '').trim(),
      photoIds: [...log.photoIds.filter((id) => !removed.includes(id)), ...pending.map((p) => p.id)],
      createdAt: log.createdAt || stamp,
      updatedAt: stamp,
    });
    if (log.who !== 'company') log.company = '';
    try {
      await db.saveLog(log, pending, removed);
      try { sessionStorage.removeItem('whc-log-filter'); } catch (err) { /* fine */ }
      ctx.toast(isNew ? 'Added to your logbook.' : 'Saved.');
      location.hash = `${base}/log`;
    } catch (err) {
      console.error(err);
      ctx.toast("Couldn't save. Your device may be out of space.", 5000);
    }
  });
  ctx.afterRender();
}

function addOneYear(day) {
  const [y, m, d] = day.split('-');
  return `${Number(y) + 1}-${m}-${d}`;
}
