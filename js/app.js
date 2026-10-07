import './sha256.js';
import * as db from './db.js';
import { APP_NAME, YOUTUBE_URL, STORE_URL, SUPPORT_EMAIL, ACCESS_CODE_HASHES } from '../config.js';
import {
  MODES, STATUSES, STATUS_ORDER, DISCLAIMER,
  areasForMode, itemsForMode, answerFor, progressFor, findings, displayName,
} from './model.js';
import { icon } from './icons.js';
import { compressPhoto } from './photos.js';
import { esc, uid, formatDate, debounce, isIOS, isAndroid, downloadBlob, shareFile, isoDay, slugify } from './util.js';
import * as install from './install.js';
import { renderMyHome } from './myhome.js';

const APP_VERSION = '2.0';
const BACKUP_REMINDER_DAYS = 14;

const main = document.getElementById('app');
const backBtn = document.getElementById('back-btn');
const tabbar = document.getElementById('tabbar');
const toastEl = document.getElementById('toast');

let unlocked = false;
let view = { name: null, insp: null, cleanup: [] };

// ====================================================================
//  Helpers
// ====================================================================

function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function setChrome({ title, back = null }) {
  document.title = title ? `${title} — Walter's Home Check` : "Walter's Home Check";
  backBtn.hidden = !back;
  backBtn.onclick = back ? () => { location.hash = back; } : null;
}

// Bottom tabs: Checks · My Home · Settings
const TABS = [
  ['checks', '#/', 'Checks', 'list'],
  ['home', '#/home', 'My Home', 'home'],
  ['settings', '#/settings', 'Settings', 'gear'],
];
function setTab(active) {
  if (!active) {
    tabbar.hidden = true;
    document.body.classList.remove('has-tabbar');
    return;
  }
  if (!tabbar.firstElementChild) {
    tabbar.innerHTML = TABS.map(([k, href, label, ic]) => `<a class="tabbar__tab" href="${href}" data-tab="${k}">${icon(ic)}<span>${label}</span></a>`).join('');
  }
  tabbar.querySelectorAll('[data-tab]').forEach((a) => {
    if (a.dataset.tab === active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  tabbar.hidden = false;
  document.body.classList.add('has-tabbar');
}

function progressBar(pct, label = `${pct}%`) {
  return `<div class="progress">
    <div class="progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progress">
      <div class="progress__fill" style="width:${pct}%"></div>
    </div>
    <span class="progress__label">${esc(label)}</span>
  </div>`;
}

function statusLabelHtml(status) {
  const s = STATUSES[status];
  return `${icon(s.icon)}<span>${esc(s.label)}</span>`;
}

// One save at a time, in order, so a slow save can never overwrite a newer one.
let saveChain = Promise.resolve();
function saveInspection(insp) {
  insp.updatedAt = new Date().toISOString();
  const copy = JSON.parse(JSON.stringify(insp));
  saveChain = saveChain
    .then(() => db.putInspection(copy))
    .catch((e) => {
      console.error(e);
      toast("Couldn't save. Your device may be out of space.", 5000);
    });
  return saveChain;
}

function ensureAnswer(insp, itemId) {
  if (!insp.answers[itemId]) insp.answers[itemId] = { status: null, note: '', photoIds: [] };
  if (!insp.answers[itemId].photoIds) insp.answers[itemId].photoIds = [];
  return insp.answers[itemId];
}

function openViewer(src, alt) {
  const prevFocus = document.activeElement;
  const el = document.createElement('div');
  el.className = 'viewer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Photo');
  el.innerHTML = `<button type="button" class="viewer__close" aria-label="Close photo">${icon('close')}</button><img alt="${esc(alt)}">`;
  el.querySelector('img').src = src;
  const close = () => {
    el.remove();
    document.removeEventListener('keydown', onKey);
    if (prevFocus) prevFocus.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.viewer__close')) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(el);
  el.querySelector('.viewer__close').focus();
}

async function requestPersistentStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* not supported — fine */ }
}

// ====================================================================
//  Router
// ====================================================================

const pendingFlushes = new Set();
let keepScroll = false;

// Draw the same screen again (after a change), keeping the scroll position.
function refresh() {
  keepScroll = true;
  return route();
}

async function route() {
  for (const f of pendingFlushes) await f();
  view.cleanup.forEach((fn) => fn());
  view = { name: null, insp: null, cleanup: [] };

  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);

  if (!unlocked) {
    setTab(null);
    return renderUnlock();
  }
  setTab(parts[0] === 'home' ? 'home' : parts[0] === 'settings' ? 'settings' : 'checks');

  try {
    if (parts[0] === 'home') return await renderMyHome(parts.slice(1), myHomeContext);
    if (parts[0] === 'new') return await renderNew();
    if (parts[0] === 'settings') return await renderSettings();
    if (parts[0] === 'check' && parts[1]) {
      const insp = await db.getInspection(parts[1]);
      if (!insp) {
        toast('That check was not found on this device.');
        location.replace('#/');
        return;
      }
      view.insp = insp;
      if (parts[2] === 'area' && parts[3]) return renderArea(insp, parts[3], parts[4]);
      if (parts[2] === 'summary') return await renderSummary(insp);
      if (parts[2] === 'report') return renderReport(insp);
      return renderAreas(insp);
    }
    return await renderHome();
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="card"><h1>Something went wrong</h1><p>${esc(e.message || e)}</p><p><a class="btn" href="#/">Go to the start</a></p></div>`;
  }
}

// What the My Home screens (js/myhome.js) need from here.
const myHomeContext = {
  main,
  toast,
  setChrome,
  afterRender: (sel) => afterRender(sel),
  refresh: () => refresh(),
  onPhone: () => onPhone(),
  openViewer,
  addCleanup: (fn) => view.cleanup.push(fn),
  addFlush: (fn) => {
    pendingFlushes.add(fn);
    view.cleanup.push(() => pendingFlushes.delete(fn));
  },
};

function afterRender(focusSelector) {
  if (keepScroll) {
    keepScroll = false;
    return;
  }
  window.scrollTo(0, 0);
  const target = focusSelector && main.querySelector(focusSelector);
  if (target) {
    target.scrollIntoView({ block: 'start' });
    target.focus({ preventScroll: true });
  } else {
    main.focus({ preventScroll: true });
  }
}

// ====================================================================
//  1. Unlock
// ====================================================================

function renderUnlock() {
  setChrome({ title: 'Enter your access code' });
  main.innerHTML = `
  <section class="unlock">
    <img class="unlock__avatar" src="assets/walter-avatar.png" alt="Walter" width="112" height="112">
    <h1>Welcome to Walter's Home Check</h1>
    <p class="lede">Let's walk through the house together, one area at a time — outside first, then inside.</p>
    <form id="unlock-form" novalidate>
      <label for="code">Enter your access code</label>
      <input type="text" id="code" name="code" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false"
        placeholder="For example WALTER-XXXX-XXXX" aria-describedby="code-error">
      <p id="code-error" class="error" role="alert"></p>
      <button class="btn btn--big" type="submit">Unlock</button>
    </form>
    <details class="help-box card">
      <summary>Where do I find my code?</summary>
      <p>Your access code came with your purchase on Payhip. Look in the email from Payhip that was sent right after you bought Walter's Home Check — check your spam or "Promotions" folder too. The code is also shown on the download page you saw after paying.</p>
      <p>You only need to enter it once on each phone or computer.</p>
      <p>Still stuck? Email <a href="mailto:${esc(SUPPORT_EMAIL)}">${esc(SUPPORT_EMAIL)}</a> and we'll help you out.</p>
    </details>
    <p class="disclaimer">${esc(DISCLAIMER)}</p>
  </section>`;

  const form = main.querySelector('#unlock-form');
  const input = main.querySelector('#code');
  const err = main.querySelector('#code-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = WalterHash.normalizeCode(input.value);
    if (!code) {
      err.textContent = 'Please type your access code.';
      input.focus();
      return;
    }
    const hash = await WalterHash.sha256Hex(code);
    const ok = ACCESS_CODE_HASHES.map((h) => String(h).trim().toLowerCase()).includes(hash);
    if (!ok) {
      err.textContent = "That code didn't work. Please check it and try again — dashes count, but upper or lower case doesn't matter.";
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }
    await db.setMeta('unlocked', { at: new Date().toISOString() });
    unlocked = true;
    requestPersistentStorage();
    toast('Welcome! You are all set.');
    if (location.hash && location.hash !== '#/') location.hash = '#/';
    else route();
  });
  afterRender();
}

// ====================================================================
//  2. Home
// ====================================================================

async function installBannerHtml() {
  if (install.isStandalone()) return '';
  if (await db.getMeta('installBannerDismissed')) return '';
  const plat = install.platform();
  let body = '';
  let title = 'Install this app';
  if (plat === 'ios') {
    title = 'Install this app on your iPhone';
    body = install.IPHONE_STEPS + install.IPHONE_DATA_NOTE;
  } else if (plat === 'android') {
    title = 'Install this app on your phone';
    body = install.canPromptInstall()
      ? `<p>Put Walter's Home Check on your Home screen so it opens like a regular app — even with no internet.</p>
         <p><button type="button" class="btn" data-action="install-now">${icon('phone')} Install app</button></p>`
      : `<p>Put Walter's Home Check on your Home screen so it opens like a regular app — even with no internet.</p>${install.ANDROID_STEPS}`;
  } else {
    body = `<p>You can install Walter's Home Check so it opens in its own window and works without internet.</p>
      ${install.canPromptInstall() ? `<p><button type="button" class="btn" data-action="install-now">Install app</button></p>` : install.DESKTOP_STEPS}
      <p class="small muted">It works best on your phone, so you can carry it around the house.</p>`;
  }
  return `<section class="banner" id="install-banner" aria-labelledby="install-title">
    <h2 id="install-title">${title}</h2>
    ${body}
    <div class="row"><button type="button" class="btn btn--secondary btn--small" data-action="dismiss-install">Got it, hide this</button></div>
  </section>`;
}

async function renderHome() {
  setChrome({ title: '' });
  const [list, lastBackup] = await Promise.all([db.listInspections(), db.getMeta('lastBackup')]);
  list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  let backupNotice = '';
  if (list.length) {
    const days = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
    if (days > BACKUP_REMINDER_DAYS) {
      backupNotice = `<div class="notice">
        <p><strong>Last backup: ${lastBackup ? esc(formatDate(lastBackup)) : 'never'}.</strong> Your checks are saved only on this device. A backup file keeps them safe if you lose or replace it.</p>
        <p><a href="#/settings" class="btn btn--secondary btn--small">${icon('download')} Make a backup</a></p>
      </div>`;
    }
  }

  const cards = list.map((insp) => {
    const p = progressFor(insp);
    return `<li><a class="check-card" href="#/check/${encodeURIComponent(insp.id)}">
      <p class="check-card__name">${esc(displayName(insp))}</p>
      <div class="check-card__meta">${esc(MODES[insp.mode].label)} · Started ${esc(formatDate(insp.createdAt))}</div>
      ${progressBar(p.pct, `${p.pct}% done`)}
    </a></li>`;
  }).join('');

  main.innerHTML = `
    <h1 class="page-title">Your home checks</h1>
    <p><a class="btn btn--big" href="#/new">${icon('plus')} Start a new check</a></p>
    <div id="install-slot">${await installBannerHtml()}</div>
    ${backupNotice}
    <section class="section" aria-labelledby="saved-title">
      <h2 id="saved-title">Saved checks</h2>
      ${list.length ? `<ul class="check-list">${cards}</ul>` : `<p class="empty">No checks yet. Tap <strong>Start a new check</strong> to begin your first walk-through.</p>`}
    </section>
    <p class="section"><a href="#/settings" class="btn btn--secondary btn--block">${icon('gear')} Settings, backup &amp; help</a></p>
  `;

  const onClick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'dismiss-install') {
      await db.setMeta('installBannerDismissed', true);
      const b = document.getElementById('install-banner');
      if (b) b.remove();
    } else if (btn.dataset.action === 'install-now') {
      const accepted = await install.promptInstall();
      if (accepted) {
        await db.setMeta('installBannerDismissed', true);
        const b = document.getElementById('install-banner');
        if (b) b.remove();
      }
    }
  };
  const onInstallAvailable = async () => {
    const slot = document.getElementById('install-slot');
    if (slot) slot.innerHTML = await installBannerHtml();
  };
  main.addEventListener('click', onClick);
  document.addEventListener('whc-install-available', onInstallAvailable);
  view.cleanup.push(() => {
    main.removeEventListener('click', onClick);
    document.removeEventListener('whc-install-available', onInstallAvailable);
  });
  afterRender();
}

// ====================================================================
//  3. New check
// ====================================================================

async function renderNew() {
  setChrome({ title: 'Start a new check', back: '#/' });
  const options = Object.entries(MODES).map(([key, m], i) => `
    <label class="mode-option">
      <input type="radio" name="mode" value="${key}" ${i === 0 ? 'checked' : ''}>
      <span class="mode-option__box">
        <span class="mode-option__radio" aria-hidden="true"></span>
        <span>
          <span class="mode-option__title">${esc(m.label)}</span>
          <span class="mode-option__desc">${esc(m.desc)} <strong>${itemsForMode(key).length} items.</strong></span>
        </span>
      </span>
    </label>`).join('');

  main.innerHTML = `
    <h1 class="page-title">Start a new check</h1>
    <form id="new-form">
      <div class="field">
        <label for="name">Name or address <span class="muted">(optional)</span></label>
        <p class="hint" id="name-hint">For example "12 Oak Street" or "Mom's house". You can change it later.</p>
        <input type="text" id="name" name="name" autocomplete="street-address" aria-describedby="name-hint">
      </div>
      <fieldset class="mode-list">
        <legend>What kind of check is this?</legend>
        ${options}
      </fieldset>
      <button class="btn btn--big" type="submit">Start checking ${icon('next')}</button>
    </form>`;

  main.querySelector('#new-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const now = new Date().toISOString();
    const insp = {
      id: uid('check'),
      name: String(fd.get('name') || '').trim(),
      mode: String(fd.get('mode') || 'B'),
      createdAt: now,
      updatedAt: now,
      answers: {},
    };
    await saveInspection(insp);
    location.replace(`#/check/${encodeURIComponent(insp.id)}`);
  });
  afterRender();
}

// ====================================================================
//  4. Areas list
// ====================================================================

function renderAreas(insp) {
  setChrome({ title: displayName(insp), back: '#/' });
  const areas = areasForMode(insp.mode);
  const prog = progressFor(insp);
  const base = `#/check/${encodeURIComponent(insp.id)}`;

  const nextArea = areas.find((a) => progressFor(insp, a.items).done < a.items.length);

  const cards = areas.map((a, i) => {
    const p = progressFor(insp, a.items);
    const done = p.done === p.total;
    return `<li><a class="area-card" href="${base}/area/${a.id}">
      <span class="area-card__icon">${icon(a.icon)}</span>
      <span class="area-card__body">
        <span class="area-card__step">Step ${i + 1}</span>
        <span class="area-card__name">${esc(a.name)}</span>
        <span class="area-card__count">${done ? `<span class="area-card__done">${icon('check')} All ${p.total} checked</span>` : `${p.done} of ${p.total} checked`}
          ${p.counts.problem ? `<span class="badge badge--problem">${icon('alert')} ${p.counts.problem} problem${p.counts.problem > 1 ? 's' : ''}</span>` : ''}
          ${p.counts.watch ? `<span class="badge badge--watch">${icon('eye')} ${p.counts.watch} to watch</span>` : ''}
        </span>
        ${progressBar(p.pct)}
      </span>
    </a></li>`;
  }).join('');

  main.innerHTML = `
    <div class="check-head">
      <span class="mode-pill">${esc(MODES[insp.mode].label)}</span>
      <h1 class="page-title" id="check-title" style="margin-top:10px">${esc(displayName(insp))}</h1>
      <div class="name-field">
        <label for="check-name">Name or address</label>
        <input type="text" id="check-name" value="${esc(insp.name)}" placeholder="For example 12 Oak Street" autocomplete="off">
      </div>
      <p class="muted small">Started ${esc(formatDate(insp.createdAt))} · Everything saves automatically.</p>
      <div aria-label="Overall progress">${progressBar(prog.pct, `${prog.done} of ${prog.total}`)}</div>
      <div class="actions">
        <a class="btn btn--secondary" href="${base}/summary">${icon('list')} Summary</a>
        <a class="btn btn--secondary" href="${base}/report">${icon('doc')} PDF report</a>
      </div>
    </div>
    ${nextArea ? `<p><a class="btn btn--big" href="${base}/area/${nextArea.id}">${prog.done ? 'Continue' : 'Begin'}: ${esc(nextArea.name)} ${icon('next')}</a></p>` : `<div class="notice"><p><strong>All done — nice work!</strong> Have a look at the summary, then make your PDF report.</p></div>`}
    <h2 class="walk-hint">Suggested walking order: start outside, then go inside from the top of the house down. You can do the areas in any order you like.</h2>
    <ul class="area-grid">${cards}</ul>
  `;

  const nameInput = main.querySelector('#check-name');
  const title = main.querySelector('#check-title');
  const saveName = debounce(() => saveInspection(insp), 400);
  nameInput.addEventListener('input', () => {
    insp.name = nameInput.value;
    title.textContent = displayName(insp);
    document.title = `${displayName(insp)} — Walter's Home Check`;
    saveName();
  });
  nameInput.addEventListener('blur', () => saveName.flush());
  pendingFlushes.add(saveName.flush);
  view.cleanup.push(() => pendingFlushes.delete(saveName.flush));
  afterRender();
}

// ====================================================================
//  5. Area detail
// ====================================================================

async function renderArea(insp, areaId, focusItemId) {
  const areas = areasForMode(insp.mode);
  const idx = areas.findIndex((a) => a.id === areaId);
  const base = `#/check/${encodeURIComponent(insp.id)}`;
  if (idx === -1) {
    location.replace(base);
    return;
  }
  const area = areas[idx];
  setChrome({ title: area.name, back: base });

  const tipsSeen = new Set((await db.getMeta('tipsSeen')) || []);

  const itemHtml = (it, n) => {
    const a = answerFor(insp, it.id);
    const tipOpen = !tipsSeen.has(it.id);
    const buttons = STATUS_ORDER.map((s) => `
      <button type="button" class="status-btn status-btn--${s}" data-status="${s}" aria-pressed="${a.status === s}">${statusLabelHtml(s)}</button>`).join('');
    return `<li class="item" id="item-${it.id}" data-item="${it.id}" data-status="${a.status || ''}" tabindex="-1">
      <div class="item__num">Item ${n} of ${area.items.length}</div>
      <h2 class="item__text" id="text-${it.id}">${esc(it.text)}</h2>
      <details class="tip" ${tipOpen ? 'open' : ''}>
        <summary>Walter's tip</summary>
        <p>${esc(it.tip)}</p>
      </details>
      <fieldset class="status-group" aria-labelledby="text-${it.id}">
        <legend class="visually-hidden">How does it look?</legend>
        ${buttons}
      </fieldset>
      <div class="pro-slot" aria-live="polite">${a.status === 'problem' ? proBox(it) : ''}</div>
      <label class="note-label" for="note-${it.id}">Note</label>
      <textarea id="note-${it.id}" data-note="${it.id}" rows="2" placeholder="What did you see? Where exactly?">${esc(a.note)}</textarea>
      <div class="photo-row">
        <div class="photo-buttons">
          <label class="btn btn--secondary btn--small" for="cam-${it.id}">${icon('camera')} Take photo</label>
          <input type="file" id="cam-${it.id}" data-photo="${it.id}" accept="image/*" capture="environment">
          <label class="btn btn--secondary btn--small" for="gal-${it.id}">${icon('image')} Choose photo</label>
          <input type="file" id="gal-${it.id}" data-photo="${it.id}" accept="image/*" multiple>
        </div>
        <span class="busy" data-busy="${it.id}" role="status"></span>
      </div>
      <ul class="thumbs" data-thumbs="${it.id}" aria-label="Photos"></ul>
    </li>`;
  };

  const prev = areas[idx - 1];
  const next = areas[idx + 1];
  const p = progressFor(insp, area.items);

  main.innerHTML = `
    <div class="area-head">
      <span class="area-card__icon">${icon(area.icon)}</span>
      <div>
        <div class="area-card__step">Step ${idx + 1} of ${areas.length}</div>
        <h1 tabindex="-1" id="area-title">${esc(area.name)}</h1>
      </div>
    </div>
    <div id="area-progress">${progressBar(p.pct, `${p.done} of ${p.total}`)}</div>
    <p class="saved-note" id="saved-note">${icon('check')} <span>Everything you do saves automatically.</span></p>
    <ol class="items">${area.items.map((it, i) => itemHtml(it, i + 1)).join('')}</ol>
    <nav class="area-nav" aria-label="Areas">
      ${prev ? `<a class="btn btn--secondary" href="${base}/area/${prev.id}">${icon('back')} ${esc(prev.name)}</a>` : `<a class="btn btn--secondary" href="${base}">${icon('back')} All areas</a>`}
      ${next ? `<a class="btn" href="${base}/area/${next.id}">Next: ${esc(next.name)} ${icon('next')}</a>` : `<a class="btn" href="${base}/summary">See the summary ${icon('next')}</a>`}
    </nav>
    <p class="center" style="margin-top:12px"><a class="btn btn--ghost" href="${base}">Back to all areas</a></p>
  `;

  // Remember which tips have been shown, so next time they start folded.
  area.items.forEach((it) => tipsSeen.add(it.id));
  db.setMeta('tipsSeen', [...tipsSeen]);

  // Load existing photos
  for (const it of area.items) {
    const ids = answerFor(insp, it.id).photoIds || [];
    for (const pid of ids) {
      const ph = await db.getPhoto(pid);
      if (view.insp !== insp) return;
      if (ph) addThumb(it.id, ph);
    }
  }

  function proBox(it) {
    return `<div class="pro-box">${icon('alert')}<div><strong>${esc(it.priority)} priority.</strong> Suggested pro to call: <strong>${esc(it.pro)}</strong></div></div>`;
  }

  function addThumb(itemId, photo) {
    const list = main.querySelector(`[data-thumbs="${itemId}"]`);
    if (!list) return;
    const li = document.createElement('li');
    li.className = 'thumb';
    li.dataset.photoId = photo.id;
    li.innerHTML = `<button type="button" class="thumb__open" aria-label="View photo larger"><img alt=""></button>
      <button type="button" class="thumb__del" aria-label="Delete photo">${icon('trash')}</button>`;
    li.querySelector('img').src = photo.dataUrl;
    list.appendChild(li);
  }

  function refreshProgress() {
    const pr = progressFor(insp, area.items);
    main.querySelector('#area-progress').innerHTML = progressBar(pr.pct, `${pr.done} of ${pr.total}`);
  }

  const savedNote = main.querySelector('#saved-note span');
  function flashSaved() {
    savedNote.textContent = 'Saved.';
    clearTimeout(flashSaved.t);
    flashSaved.t = setTimeout(() => { savedNote.textContent = 'Everything you do saves automatically.'; }, 1500);
  }

  const onClick = async (e) => {
    const statusBtn = e.target.closest('.status-btn');
    if (statusBtn) {
      const li = statusBtn.closest('.item');
      const itemId = li.dataset.item;
      const it = area.items.find((x) => x.id === itemId);
      const a = ensureAnswer(insp, itemId);
      const chosen = statusBtn.dataset.status;
      a.status = a.status === chosen ? null : chosen; // tap again to clear
      li.dataset.status = a.status || '';
      li.querySelectorAll('.status-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === a.status)));
      li.querySelector('.pro-slot').innerHTML = a.status === 'problem' ? proBox(it) : '';
      refreshProgress();
      await saveInspection(insp);
      flashSaved();
      return;
    }
    const del = e.target.closest('.thumb__del');
    if (del) {
      const li = del.closest('.thumb');
      const itemId = del.closest('.item').dataset.item;
      if (!confirm('Delete this photo? This cannot be undone.')) return;
      const a = ensureAnswer(insp, itemId);
      a.photoIds = a.photoIds.filter((id) => id !== li.dataset.photoId);
      await saveInspection(insp);
      await db.deletePhoto(li.dataset.photoId);
      li.remove();
      toast('Photo deleted.');
      return;
    }
    const open = e.target.closest('.thumb__open');
    if (open) {
      const itemId = open.closest('.item').dataset.item;
      const it = area.items.find((x) => x.id === itemId);
      openViewer(open.querySelector('img').src, `Photo for: ${it.text}`);
    }
  };

  const noteSavers = new Map();
  const onInput = (e) => {
    const ta = e.target.closest('textarea[data-note]');
    if (!ta) return;
    const itemId = ta.dataset.note;
    ensureAnswer(insp, itemId).note = ta.value;
    if (!noteSavers.has(itemId)) {
      const d = debounce(async () => { await saveInspection(insp); flashSaved(); }, 400);
      noteSavers.set(itemId, d);
    }
    noteSavers.get(itemId)();
  };
  const flushNotes = async () => {
    for (const d of noteSavers.values()) await d.flush();
  };
  const onFocusOut = (e) => {
    if (e.target.matches('textarea[data-note]')) flushNotes();
  };

  const onChange = async (e) => {
    const input = e.target.closest('input[data-photo]');
    if (!input || !input.files || !input.files.length) return;
    const itemId = input.dataset.photo;
    const files = [...input.files];
    input.value = '';
    const busy = main.querySelector(`[data-busy="${itemId}"]`);
    const a = ensureAnswer(insp, itemId);
    let added = 0;
    for (const [i, file] of files.entries()) {
      busy.textContent = files.length > 1 ? `Adding photo ${i + 1} of ${files.length}…` : 'Adding photo…';
      try {
        const { dataUrl, width, height } = await compressPhoto(file);
        const photo = { id: uid('photo'), inspectionId: insp.id, itemId, dataUrl, width, height, createdAt: new Date().toISOString() };
        await db.putPhoto(photo);
        a.photoIds.push(photo.id);
        await saveInspection(insp);
        if (view.insp === insp) addThumb(itemId, photo);
        added++;
      } catch (err) {
        console.error(err);
        toast(err.message || "That photo couldn't be added.", 4000);
      }
    }
    busy.textContent = '';
    if (added) toast(added > 1 ? `${added} photos added.` : 'Photo added.');
  };

  main.addEventListener('click', onClick);
  main.addEventListener('input', onInput);
  main.addEventListener('focusout', onFocusOut);
  main.addEventListener('change', onChange);
  pendingFlushes.add(flushNotes);
  view.cleanup.push(() => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('input', onInput);
    main.removeEventListener('focusout', onFocusOut);
    main.removeEventListener('change', onChange);
    pendingFlushes.delete(flushNotes);
  });

  afterRender(focusItemId ? `#item-${CSS.escape(focusItemId)}` : '#area-title');
}

// ====================================================================
//  6. Summary
// ====================================================================

async function thumbsHtml(answer) {
  const ids = answer.photoIds || [];
  if (!ids.length) return '';
  const photos = (await Promise.all(ids.map((id) => db.getPhoto(id)))).filter(Boolean);
  if (!photos.length) return '';
  return `<ul class="thumbs thumbs--small" aria-label="Photos">${photos.map((p) =>
    `<li class="thumb"><button type="button" class="thumb__open" data-src-id="${esc(p.id)}" aria-label="View photo larger"><img alt="" src="${p.dataUrl}"></button></li>`).join('')}</ul>`;
}

async function renderSummary(insp) {
  const base = `#/check/${encodeURIComponent(insp.id)}`;
  setChrome({ title: 'Summary', back: base });
  const prog = progressFor(insp);
  const { problems, watch } = findings(insp);
  const notChecked = prog.total - prog.done;

  const findingHtml = async (it, kind) => `
    <li class="finding finding--${kind}">
      <div class="finding__area">${kind === 'problem' ? `<span class="prio prio--${it.priority}">${esc(it.priority)}</span> ` : ''}${esc(it.area.name)}</div>
      <p class="finding__text"><a href="${base}/area/${it.area.id}/${it.id}">${esc(it.text)}</a></p>
      ${it.answer.note ? `<p class="finding__note">${esc(it.answer.note)}</p>` : ''}
      ${kind === 'problem' ? `<p class="small"><strong>Suggested pro to call:</strong> ${esc(it.pro)}</p>` : ''}
      ${await thumbsHtml(it.answer)}
    </li>`;

  const problemsHtml = (await Promise.all(problems.map((it) => findingHtml(it, 'problem')))).join('');
  const watchHtml = (await Promise.all(watch.map((it) => findingHtml(it, 'watch')))).join('');

  main.innerHTML = `
    <span class="mode-pill">${esc(MODES[insp.mode].label)}</span>
    <h1 class="page-title" style="margin-top:10px">Summary</h1>
    <p class="lede">${esc(displayName(insp))}</p>
    ${progressBar(prog.pct, `${prog.pct}%`)}
    <p class="muted small">${prog.done} of ${prog.total} items checked${notChecked ? ` · ${notChecked} not checked yet` : ''}.</p>
    <div class="counts">
      ${STATUS_ORDER.map((s) => `<div class="count count--${s}"><span class="count__num">${prog.counts[s]}</span><span class="count__label">${statusLabelHtml(s)}</span></div>`).join('')}
    </div>
    <p><a class="btn btn--big" href="${base}/report">${icon('doc')} Make the PDF report</a></p>

    <section class="section" aria-labelledby="problems-title">
      <h2 id="problems-title">Problems (${problems.length})</h2>
      <p class="muted small">Most important first: High, then Medium, then Low priority.</p>
      ${problems.length ? `<ol class="finding-list">${problemsHtml}</ol>` : '<p class="empty">No problems marked.</p>'}
    </section>

    <section class="section" aria-labelledby="watch-title">
      <h2 id="watch-title">Keep an eye on (${watch.length})</h2>
      ${watch.length ? `<ol class="finding-list">${watchHtml}</ol>` : '<p class="empty">Nothing marked "Keep an eye on".</p>'}
    </section>

    <p class="section"><a class="btn btn--secondary btn--block" href="${base}">${icon('back')} Back to all areas</a></p>
  `;

  const onClick = (e) => {
    const open = e.target.closest('.thumb__open');
    if (open) openViewer(open.querySelector('img').src, 'Photo');
  };
  main.addEventListener('click', onClick);
  view.cleanup.push(() => main.removeEventListener('click', onClick));
  afterRender();
}

// ====================================================================
//  7. PDF report
// ====================================================================

const onPhone = () => isIOS() || isAndroid();

function renderReport(insp) {
  const base = `#/check/${encodeURIComponent(insp.id)}`;
  setChrome({ title: 'PDF report', back: `${base}/summary` });
  main.innerHTML = `
    <h1 class="page-title">PDF report</h1>
    <p class="lede">${esc(displayName(insp))} · ${esc(MODES[insp.mode].label)}</p>
    <div class="card report-box">
      <p>Your report has a cover page with a summary, the problems (most important first), the things to keep an eye on, and the full checklist${insp.mode === 'B' ? ', plus a page of questions to ask the seller' : ''}.</p>
      <p class="report-status" id="report-status" role="status">Making your report…</p>
      <div id="report-actions" hidden>
        ${onPhone() ? `<p><button type="button" class="btn btn--big" data-action="share">${icon('share')} Save or share the PDF</button></p>` : ''}
        <p><button type="button" class="btn ${onPhone() ? 'btn--secondary' : 'btn--big'} btn--block" data-action="download">${icon('download')} Download the PDF</button></p>
        <p><button type="button" class="btn btn--secondary btn--block" data-action="open">${icon('doc')} Open the PDF</button></p>
        <p class="small muted">${onPhone() && isIOS() ? 'Tip: in the share menu, choose "Save to Files" to keep it, or "Print" to print it.' : 'You can print it, email it, or keep it with your house papers.'}</p>
      </div>
      <p id="report-retry" hidden><button type="button" class="btn" data-action="retry">Try again</button></p>
    </div>
    <p class="section"><a class="btn btn--secondary btn--block" href="${base}/summary">${icon('back')} Back to the summary</a></p>
  `;

  const statusEl = main.querySelector('#report-status');
  const actions = main.querySelector('#report-actions');
  const retry = main.querySelector('#report-retry');
  const filename = `home-check-${slugify(insp.name)}-${isoDay()}.pdf`;
  let blob = null;
  let objectUrl = null;
  let alive = true;
  view.cleanup.push(() => {
    alive = false;
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  });

  async function build() {
    actions.hidden = true;
    retry.hidden = true;
    statusEl.textContent = 'Making your report…';
    try {
      const { buildReport } = await import('./pdf.js');
      blob = await buildReport(insp, (msg) => { if (alive) statusEl.textContent = msg; });
      if (!alive) return;
      statusEl.innerHTML = `<strong>Your report is ready.</strong><br><span class="small muted">${esc(filename)}</span>`;
      actions.hidden = false;
    } catch (e) {
      console.error(e);
      if (!alive) return;
      statusEl.innerHTML = `<span class="error">Sorry, the report couldn't be made. ${esc(e.message || '')}</span>`;
      retry.hidden = false;
    }
  }

  const onClick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'retry') return build();
    if (!blob) return;
    if (action === 'share') {
      const r = await shareFile(blob, filename, 'Home Check Report');
      if (r === 'downloaded') toast('Your PDF was downloaded.');
    } else if (action === 'download') {
      downloadBlob(blob, filename);
      toast('Your PDF was downloaded.');
    } else if (action === 'open') {
      if (!objectUrl) objectUrl = URL.createObjectURL(blob);
      const w = window.open(objectUrl, '_blank');
      if (!w) location.href = objectUrl;
    }
  };
  main.addEventListener('click', onClick);
  view.cleanup.push(() => main.removeEventListener('click', onClick));
  afterRender();
  build();
}

// ====================================================================
//  8. Settings
// ====================================================================

function getTheme() {
  try { return localStorage.getItem('whc-theme') || 'auto'; } catch (e) { return 'auto'; }
}
function setTheme(t) {
  try {
    if (t === 'auto') localStorage.removeItem('whc-theme');
    else localStorage.setItem('whc-theme', t);
  } catch (e) { /* storage blocked — still applies for this visit */ }
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

async function renderSettings() {
  setChrome({ title: 'Settings' });
  const [list, lastBackup, homes] = await Promise.all([db.listInspections(), db.getMeta('lastBackup'), db.listHomes()]);
  list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const hasData = list.length || homes.length;
  const theme = getTheme();
  const plat = install.platform();

  const deleteRows = list.length
    ? `<ul class="settings-list">${list.map((i) => `
        <li class="settings-row">
          <div class="settings-row__text"><strong>${esc(displayName(i))}</strong><br><span class="small muted">${esc(MODES[i.mode].label)} · ${esc(formatDate(i.createdAt))}</span></div>
          <button type="button" class="btn btn--danger btn--small" data-action="delete" data-id="${esc(i.id)}">${icon('trash')} Delete</button>
        </li>`).join('')}</ul>`
    : '<p class="muted">There are no saved checks on this device.</p>';

  const installOrder = plat === 'android' ? ['android', 'ios', 'desktop'] : plat === 'desktop' ? ['desktop', 'ios', 'android'] : ['ios', 'android', 'desktop'];
  const installBlocks = {
    ios: `<h3>iPhone or iPad</h3>${install.IPHONE_STEPS}<div class="notice">${install.IPHONE_DATA_NOTE}</div>`,
    android: `<h3>Android phone or tablet</h3>${install.canPromptInstall() ? `<p><button type="button" class="btn" data-action="install-now">${icon('phone')} Install app now</button></p><p class="small muted">Or do it by hand:</p>` : ''}${install.ANDROID_STEPS}`,
    desktop: `<h3>Computer</h3>${install.DESKTOP_STEPS}`,
  };

  main.innerHTML = `
    <h1 class="page-title">Settings</h1>

    <section class="section" aria-labelledby="backup-title">
      <h2 id="backup-title">Backup &amp; restore</h2>
      <p>Your checks, notes, photos, home details and logbook are saved only on this device. A backup file holds all of them, so you can keep a copy safe or move to a new phone.</p>
      <p><strong>Last backup:</strong> ${lastBackup ? esc(formatDate(lastBackup)) : 'never'}</p>
      <div class="stack">
        <button type="button" class="btn btn--block" data-action="backup" ${hasData ? '' : 'disabled'}>${icon('download')} ${onPhone() ? 'Save a backup file' : 'Download a backup file'}</button>
        ${onPhone() ? `<button type="button" class="btn btn--ghost btn--block" data-action="backup-download" ${hasData ? '' : 'disabled'}>Download it instead</button>` : ''}
        <label class="btn btn--secondary btn--block" for="restore-file">${icon('upload')} Restore from a backup file</label>
        <input type="file" id="restore-file" class="file-input" accept=".json,application/json">
      </div>
      <p class="small muted" style="margin-top:12px">Tip: email the backup file to yourself or save it to Files, iCloud Drive or Google Drive.</p>
    </section>

    <section class="section" aria-labelledby="delete-title">
      <h2 id="delete-title">Delete a check</h2>
      ${deleteRows}
    </section>

    <section class="section" aria-labelledby="look-title">
      <h2 id="look-title">Light or dark screen</h2>
      <fieldset class="theme-choice">
        <legend class="visually-hidden">Screen colors</legend>
        <label><input type="radio" name="theme" value="auto" ${theme === 'auto' ? 'checked' : ''}> Same as my device</label>
        <label><input type="radio" name="theme" value="light" ${theme === 'light' ? 'checked' : ''}> Light</label>
        <label><input type="radio" name="theme" value="dark" ${theme === 'dark' ? 'checked' : ''}> Dark</label>
      </fieldset>
    </section>

    <section class="section" aria-labelledby="install-help-title" id="install-help">
      <h2 id="install-help-title">How to install on your phone</h2>
      ${install.isStandalone() ? '<p><strong>Good news: the app is already installed on this device.</strong></p>' : ''}
      ${installOrder.map((k) => installBlocks[k]).join('')}
    </section>

    <section class="section" aria-labelledby="about-title">
      <h2 id="about-title">About &amp; disclaimer</h2>
      <p><strong>${esc(APP_NAME)}</strong><br><span class="small muted">Version ${APP_VERSION}</span></p>
      <p>A plain, practical checklist to help you look at a house carefully — area by area — and keep track of what you find.</p>
      <p>No accounts, no ads, no tracking. Everything you enter stays on this device.</p>
      <div class="notice"><p><strong>Disclaimer.</strong> ${esc(DISCLAIMER)}</p></div>
      <ul class="link-list">
        <li><a href="${esc(YOUTUBE_URL)}" target="_blank" rel="noopener">Walter's YouTube channel</a></li>
        <li><a href="${esc(STORE_URL)}" target="_blank" rel="noopener">Walter's store on Payhip</a></li>
        <li><a href="mailto:${esc(SUPPORT_EMAIL)}">Email for help: ${esc(SUPPORT_EMAIL)}</a></li>
      </ul>
    </section>
  `;

  async function makeBackup(forceDownload) {
    try {
      const data = await db.exportAll();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const filename = `walters-home-check-backup-${isoDay()}.json`;
      let result;
      if (onPhone() && !forceDownload) result = await shareFile(blob, filename, "Walter's Home Check backup");
      else {
        downloadBlob(blob, filename);
        result = 'downloaded';
      }
      if (result === 'cancelled') return;
      await db.setMeta('lastBackup', new Date().toISOString());
      toast(result === 'shared' ? 'Backup saved.' : 'Backup file downloaded.');
      refresh();
    } catch (e) {
      console.error(e);
      toast("Sorry, the backup couldn't be made.", 4000);
    }
  }

  const onClick = async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'backup') return makeBackup(false);
    if (action === 'backup-download') return makeBackup(true);
    if (action === 'install-now') return install.promptInstall();
    if (action === 'delete') {
      const insp = list.find((i) => i.id === btn.dataset.id);
      if (!insp) return;
      if (!confirm(`Delete "${displayName(insp)}"?\n\nIts notes and photos will be removed from this device. This cannot be undone.`)) return;
      await db.deleteInspection(insp.id);
      toast('Check deleted.');
      refresh();
    }
  };

  const onChange = async (e) => {
    if (e.target.name === 'theme') {
      setTheme(e.target.value);
      return;
    }
    if (e.target.id === 'restore-file') {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        let data;
        try {
          data = JSON.parse(await file.text());
        } catch (err) {
          throw new Error("This file isn't a Walter's Home Check backup.");
        }
        db.validateBackup(data);
        const n = data.inspections.length;
        const nh = (data.homes || []).length;
        const nl = (data.logs || []).length;
        const existing = new Set(list.map((i) => i.id));
        const replacing = data.inspections.filter((i) => existing.has(i.id)).length;
        const homeIds = new Set(homes.map((h) => h.id));
        const replacingHomes = (data.homes || []).filter((h) => homeIds.has(h.id)).length;
        const when = data.exportedAt ? ` made on ${formatDate(data.exportedAt)}` : '';
        const what = [`${n} check${n === 1 ? '' : 's'}`];
        if (nh) what.push(`${nh} home${nh === 1 ? '' : 's'}`);
        if (nl) what.push(`${nl} logbook entr${nl === 1 ? 'y' : 'ies'}`);
        let msg = `Restore ${what.join(', ')} from the backup${when}?`;
        if (replacing) msg += `\n\n${replacing} of the checks ${replacing === 1 ? 'is' : 'are'} already on this device and will be replaced by the copy in the backup.`;
        if (replacingHomes) msg += `\n\n${replacingHomes} of the homes ${replacingHomes === 1 ? 'is' : 'are'} already on this device and will be replaced by the copy in the backup.`;
        msg += '\n\nOther things on this device will not be changed.';
        if (!confirm(msg)) return;
        await db.importAll(data);
        toast(`Restored ${what.join(', ')}.`);
        refresh();
      } catch (err) {
        console.error(err);
        alert(err.message || "Sorry, that backup couldn't be restored.");
      }
    }
  };

  main.addEventListener('click', onClick);
  main.addEventListener('change', onChange);
  view.cleanup.push(() => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('change', onChange);
  });
  afterRender();
}

// ====================================================================
//  Start
// ====================================================================

async function start() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Offline support not available:', e));
  }
  // An older copy of the app is still open somewhere and holds the storage. The update waits for it.
  document.addEventListener('whc-db-blocked', () => {
    main.innerHTML = `<div class="card"><h1>One moment…</h1><p>Walter's Home Check was just updated. Please close any other tabs or windows where the app is open — this page will continue on its own.</p></div>`;
  });
  try {
    unlocked = !!(await db.getMeta('unlocked'));
  } catch (e) {
    main.innerHTML = `<div class="card"><h1>Storage is turned off</h1><p>This app saves your checks on this device, but your browser is blocking storage. If you are in a Private Browsing window, please open the app in a normal window.</p></div>`;
    return;
  }
  if (unlocked && install.isStandalone()) requestPersistentStorage();

  // Save anything still being typed if the app is closed or put in the background.
  const flushAll = () => { for (const f of pendingFlushes) f(); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAll(); });
  window.addEventListener('pagehide', flushAll);

  window.addEventListener('hashchange', route);
  route();
}

start();
