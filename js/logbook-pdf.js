// "House logbook" PDF for My Home — same look as the inspection report. Made on the device; works offline.
import { loadJsPDF, pdfSafe, smallJpeg, avatarJpeg, C } from './pdf.js';
import { DISCLAIMER } from './model.js';
import { getLogPhoto } from './db.js';
import { formatDate } from './util.js';
import { SYSTEMS, STATES, CLIMATES } from '../data/maintenance.js';
import { homeName, systemsReport, climateFor, rangeLabel } from './homeplan.js';

export function formatCost(n) {
  if (n === null || n === undefined || n === '' || !Number.isFinite(Number(n))) return '';
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function whoDid(log) {
  return log.who === 'company' && String(log.company || '').trim() ? String(log.company).trim() : 'Me (homeowner)';
}

// "2026-10-07" → "Oct 7, 2026" without time-zone surprises.
export function formatLogDate(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!m) return '';
  return formatDate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toISOString());
}

export function sortLogs(logs) {
  return [...logs].sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function buildLogbook(home, logs, onProgress = () => {}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({ title: 'House Logbook — ' + pdfSafe(homeName(home)), creator: "Walter's Home Check" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 50;
  const TOP = 54;
  const BOTTOM = 92;
  const CW = W - M * 2;
  let y = TOP;

  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  const setFill = (rgb) => doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  const setDraw = (rgb) => doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  const font = (style = 'normal', size = 11) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
  };
  const lh = (size) => size * 1.32;
  const newPage = () => {
    doc.addPage();
    y = TOP;
  };
  const ensure = (h) => {
    if (y + h > H - BOTTOM) newPage();
  };
  const para = (text, { size = 11, style = 'normal', color = C.ink, x = M, width = CW, gap = 4 } = {}) => {
    font(style, size);
    const lines = doc.splitTextToSize(pdfSafe(text), width);
    setColor(color);
    for (const line of lines) {
      ensure(lh(size));
      font(style, size);
      doc.text(line, x, y + size);
      y += lh(size);
    }
    y += gap;
  };
  const sectionTitle = (text) => {
    ensure(60);
    font('bold', 17);
    setColor(C.navy);
    doc.text(pdfSafe(text), M, y + 17);
    y += 26;
    setDraw(C.rust);
    doc.setLineWidth(1.5);
    doc.line(M, y, W - M, y);
    y += 14;
  };

  // ---------- Cover ----------
  onProgress('Making the cover page…');
  setFill(C.navy);
  doc.rect(0, 0, W, 150, 'F');
  const avatar = await avatarJpeg();
  if (avatar) doc.addImage(avatar, 'JPEG', W - M - 72, 39, 72, 72, 'avatar');
  font('bold', 13);
  setColor(C.cream);
  doc.text("WALTER'S HOME CHECK", M, 66);
  font('normal', 11);
  doc.text('My Home — House Logbook', M, 84);
  setFill(C.rust);
  doc.rect(0, 150, W, 6, 'F');

  y = 200;
  font('bold', 32);
  setColor(C.navy);
  doc.text('House Logbook', M, y);
  y += 36;
  font('bold', 18);
  const nameLines = doc.splitTextToSize(pdfSafe(homeName(home)), CW);
  setColor(C.ink);
  doc.text(nameLines, M, y);
  y += nameLines.length * lh(18) + 10;

  const state = STATES.find((s) => s[0] === home.state);
  const costs = logs.filter((l) => l.cost !== null && l.cost !== '').map((l) => Number(l.cost)).filter((n) => Number.isFinite(n) && n > 0);
  const facts = [
    ['Logbook date', formatDate(new Date().toISOString())],
    ['State', state ? state[1] : '—'],
    ['Climate', CLIMATES[climateFor(home)]],
    ['Year built', home.yearBuilt ? String(home.yearBuilt) : '—'],
    ['Entries', String(logs.length)],
  ];
  if (costs.length) facts.push(['Total recorded', formatCost(costs.reduce((a, b) => a + b, 0))]);
  for (const [k, v] of facts) {
    font('bold', 12);
    setColor(C.muted);
    doc.text(k, M, y);
    font('normal', 12);
    setColor(C.ink);
    doc.text(pdfSafe(v), M + 120, y);
    y += 20;
  }

  // Systems at a glance (install years the owner entered)
  const year = new Date().getFullYear();
  const rows = systemsReport(home, year).filter((r) => r.year || r.type);
  y += 14;
  sectionTitle('Systems at a glance');
  if (!rows.length) {
    para('No system details entered yet.', { color: C.muted });
  } else {
    const cols = [M, M + 130, M + 290, M + 370];
    font('bold', 10);
    setColor(C.muted);
    ['System', 'Type', 'Installed', 'Typical range'].forEach((h, i) => doc.text(h, cols[i], y + 10));
    y += 18;
    for (const r of rows) {
      ensure(20);
      font('bold', 10.5);
      setColor(C.ink);
      doc.text(pdfSafe(r.name), cols[0], y + 10);
      font('normal', 10.5);
      doc.text(pdfSafe(r.type || '—'), cols[1], y + 10);
      doc.text(r.year ? `${r.year}${r.result ? ` (${r.result.age} yrs)` : ''}` : "Don't know", cols[2], y + 10);
      doc.text(r.range ? pdfSafe(rangeLabel(r.range)) : '—', cols[3], y + 10);
      y += 18;
      setDraw(C.line);
      doc.setLineWidth(0.4);
      doc.line(M, y, W - M, y);
      y += 4;
    }
    para('Typical ranges are general averages, not a prediction for your house.', { size: 9, color: C.muted, gap: 0 });
  }

  // ---------- Entries ----------
  onProgress('Adding the logbook entries…');
  newPage();
  sectionTitle('What was done, newest first');
  if (!logs.length) para('No logbook entries yet.', { color: C.muted });
  for (const log of sortLogs(logs)) {
    ensure(70);
    font('bold', 9.5);
    setColor(C.muted);
    doc.text(pdfSafe(`${formatLogDate(log.date)}  ·  ${SYSTEMS[log.system] || SYSTEMS.other}`), M, y + 10);
    y += 16;
    para(log.what || 'Logbook entry', { size: 12, style: 'bold', gap: 2 });
    para(`Done by: ${whoDid(log)}${formatCost(log.cost) ? `   ·   Cost: ${formatCost(log.cost)}` : ''}`, { size: 10.5, x: M + 14, width: CW - 14, gap: 2 });
    if (log.notes) para('Notes: ' + log.notes, { size: 10.5, x: M + 14, width: CW - 14, gap: 4 });
    // Photos
    const photos = [];
    for (const id of log.photoIds || []) {
      const p = await getLogPhoto(id);
      const small = p ? await smallJpeg(p.dataUrl) : null;
      if (small) photos.push({ id, ...small });
    }
    if (photos.length) {
      const box = 112;
      const gap = 10;
      let x = M + 14;
      ensure(box + 6);
      let rowTop = y;
      let rowH = 0;
      for (const ph of photos) {
        const scale = Math.min(box / ph.w, box / ph.h);
        const w = ph.w * scale;
        const h = ph.h * scale;
        if (x + w > W - M) {
          x = M + 14;
          y = rowTop + rowH + gap;
          ensure(box + 6);
          rowTop = y;
          rowH = 0;
        }
        doc.addImage(ph.data, 'JPEG', x, rowTop, w, h, ph.id, 'FAST');
        setDraw(C.line);
        doc.setLineWidth(0.5);
        doc.rect(x, rowTop, w, h);
        x += w + gap;
        rowH = Math.max(rowH, h);
      }
      y = rowTop + rowH + 8;
    }
    setDraw(C.line);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, W - M, y + 2);
    y += 14;
  }

  // ---------- Footer on every page ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const top = H - BOTTOM + 18;
    setDraw(C.line);
    doc.setLineWidth(0.6);
    doc.line(M, top, W - M, top);
    font('normal', 7.5);
    setColor(C.muted);
    doc.text(doc.splitTextToSize(DISCLAIMER, CW), M, top + 12);
    font('bold', 8.5);
    setColor(C.navy);
    const fy = H - 24;
    doc.text("Walter's Home Check — House Logbook", M, fy);
    doc.text(`Page ${p} of ${pages}`, W - M, fy, { align: 'right' });
  }

  onProgress('Almost done…');
  return doc.output('blob');
}
