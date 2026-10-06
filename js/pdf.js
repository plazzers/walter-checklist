// Builds the PDF report on the device with jsPDF (vendor/jspdf.umd.min.js). Works offline.
import { SELLER_QUESTIONS } from '../data/checklist.js';
import { MODES, STATUSES, DISCLAIMER, areasForMode, answerFor, progressFor, findings, displayName } from './model.js';
import { getPhoto } from './db.js';
import { formatDate } from './util.js';

let jsPDFLoading = null;
function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPDFLoading) {
    jsPDFLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = new URL('../vendor/jspdf.umd.min.js', import.meta.url).href;
      s.onload = () => resolve(window.jspdf.jsPDF);
      s.onerror = () => {
        jsPDFLoading = null;
        reject(new Error("The PDF maker couldn't be loaded. Please connect to the internet once and try again."));
      };
      document.head.appendChild(s);
    });
  }
  return jsPDFLoading;
}

// The built-in PDF font only knows Western European letters. Swap or drop anything else
// (for example emoji typed into a note) so the report never shows garbled text.
const EXTRA_OK = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
function pdfSafe(s) {
  return Array.from(String(s == null ? '' : s).replace(/\r\n?/g, '\n'))
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || EXTRA_OK.includes(ch)) return ch;
      if (c === 0x2022 || c === 0x2023) return '•';
      if (c > 0xffff || (c >= 0x2600 && c <= 0x27bf) || c === 0xfe0f || c === 0x200d) return ''; // emoji
      return '?';
    })
    .join('');
}

// Shrink a photo for the report so the PDF stays small enough to email.
function smallJpeg(dataUrl, maxSide = 520) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ data: c.toDataURL('image/jpeg', 0.7), w, h });
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function avatarJpeg() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#1b2a41';
      ctx.fillRect(0, 0, 160, 160);
      ctx.drawImage(img, 0, 0, 160, 160);
      resolve(c.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => resolve(null);
    img.src = new URL('../assets/walter-avatar.png', import.meta.url).href;
  });
}

const C = {
  navy: [27, 42, 65],
  cream: [246, 241, 231],
  rust: [158, 65, 39],
  ink: [30, 34, 40],
  muted: [95, 102, 112],
  line: [205, 196, 180],
  ok: [46, 107, 48],
  okBg: [227, 241, 226],
  watch: [138, 90, 0],
  watchBg: [253, 240, 207],
  problem: [161, 38, 32],
  problemBg: [251, 227, 224],
  na: [77, 85, 96],
  naBg: [233, 231, 227],
};
const STATUS_COLORS = {
  ok: [C.ok, C.okBg],
  watch: [C.watch, C.watchBg],
  problem: [C.problem, C.problemBg],
  na: [C.na, C.naBg],
  none: [C.muted, [255, 255, 255]],
};

export async function buildReport(insp, onProgress = () => {}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'letter', compress: true });
  doc.setProperties({ title: 'Home Check Report — ' + pdfSafe(displayName(insp)), creator: "Walter's Home Check" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 50; // side margin
  const TOP = 54;
  const BOTTOM = 92; // room for the footer
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
  const wrap = (text, width, size, style = 'normal') => {
    font(style, size);
    return doc.splitTextToSize(pdfSafe(text), width);
  };
  // Write wrapped text at the cursor, moving to a new page between lines if needed.
  const para = (text, { size = 11, style = 'normal', color = C.ink, x = M, width = CW, gap = 4 } = {}) => {
    const lines = wrap(text, width, size, style);
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
  const chip = (label, x, top, rgbPair, { width = null, size = 8.5, outline = false } = {}) => {
    font('bold', size);
    const tw = doc.getTextWidth(label);
    const w = width || tw + 14;
    const h = size + 8;
    setFill(rgbPair[1]);
    setDraw(rgbPair[0]);
    doc.setLineWidth(outline ? 0.8 : 0.6);
    doc.roundedRect(x, top, w, h, 4, 4, 'FD');
    setColor(rgbPair[0]);
    doc.text(label, x + w / 2, top + size + 2.5, { align: 'center' });
    return { w, h };
  };

  const photoCache = new Map();
  async function photosFor(answer) {
    const out = [];
    for (const id of answer.photoIds || []) {
      if (!photoCache.has(id)) {
        const p = await getPhoto(id);
        photoCache.set(id, p ? await smallJpeg(p.dataUrl) : null);
      }
      const ph = photoCache.get(id);
      if (ph) out.push({ id, ...ph });
    }
    return out;
  }
  async function photoRow(answer) {
    const photos = await photosFor(answer);
    if (!photos.length) return;
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

  const items = areasForMode(insp.mode);
  const prog = progressFor(insp);
  const { problems, watch } = findings(insp);
  const mode = MODES[insp.mode];

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
  doc.text('Home Inspection Checklist', M, 84);
  setFill(C.rust);
  doc.rect(0, 150, W, 6, 'F');

  y = 200;
  font('bold', 32);
  setColor(C.navy);
  doc.text('Home Check Report', M, y);
  y += 36;
  const nameLines = wrap(displayName(insp), CW, 18, 'bold');
  setColor(C.ink);
  font('bold', 18);
  doc.text(nameLines, M, y);
  y += nameLines.length * lh(18) + 10;

  const facts = [
    ['Report date', formatDate(new Date().toISOString())],
    ['Check started', formatDate(insp.createdAt)],
    ['Type of check', mode.label],
  ];
  for (const [k, v] of facts) {
    font('bold', 12);
    setColor(C.muted);
    doc.text(k, M, y);
    font('normal', 12);
    setColor(C.ink);
    doc.text(pdfSafe(v), M + 110, y);
    y += 20;
  }

  // Summary box
  y += 16;
  const boxTop = y;
  const boxH = 178;
  setFill([251, 248, 242]);
  setDraw(C.line);
  doc.setLineWidth(1);
  doc.roundedRect(M, boxTop, CW, boxH, 8, 8, 'FD');
  font('bold', 14);
  setColor(C.navy);
  doc.text('Summary', M + 18, boxTop + 28);
  const cells = ['ok', 'watch', 'problem', 'na'];
  const cellGap = 10;
  const cellW = (CW - 36 - cellGap * 3) / 4;
  cells.forEach((s, i) => {
    const x = M + 18 + i * (cellW + cellGap);
    const top = boxTop + 42;
    const [fg, bg] = STATUS_COLORS[s];
    setFill(bg);
    setDraw(fg);
    doc.setLineWidth(1.2);
    doc.roundedRect(x, top, cellW, 64, 6, 6, 'FD');
    setColor(fg);
    font('bold', 24);
    doc.text(String(prog.counts[s]), x + cellW / 2, top + 32, { align: 'center' });
    font('bold', 10);
    doc.text(STATUSES[s].label, x + cellW / 2, top + 51, { align: 'center' });
  });
  const barTop = boxTop + 130;
  font('bold', 11);
  setColor(C.ink);
  doc.text(`Overall completion: ${prog.pct}%  (${prog.done} of ${prog.total} items checked)`, M + 18, barTop - 6);
  setFill([236, 231, 222]);
  doc.roundedRect(M + 18, barTop + 2, CW - 36, 12, 6, 6, 'F');
  if (prog.pct > 0) {
    setFill(C.ok);
    doc.roundedRect(M + 18, barTop + 2, Math.max(12, ((CW - 36) * prog.pct) / 100), 12, 6, 6, 'F');
  }
  y = boxTop + boxH + 28;

  font('bold', 12);
  setColor(C.navy);
  doc.text("What's in this report", M, y);
  y += 18;
  const contents = [
    '1. Problems, most important first',
    '2. Things to keep an eye on',
    '3. The full checklist, area by area',
  ];
  if (insp.mode === 'B') contents.push('4. Questions to ask the seller');
  for (const c of contents) {
    font('normal', 11);
    setColor(C.ink);
    doc.text(c, M + 10, y);
    y += 16;
  }

  // ---------- Section 1: Problems ----------
  onProgress('Adding the problems…');
  newPage();
  sectionTitle('1. Problems — most important first');
  if (!problems.length) {
    para('No items were marked as a problem.', { color: C.muted });
  }
  for (const it of problems) {
    ensure(70);
    const prioColors = it.priority === 'High' ? [C.problem, C.problemBg] : it.priority === 'Medium' ? [C.watch, C.watchBg] : [C.na, C.naBg];
    chip(`${it.priority.toUpperCase()} PRIORITY`, M, y, prioColors);
    font('bold', 9.5);
    setColor(C.muted);
    doc.text(pdfSafe(it.area.name), M + 108, y + 11);
    y += 24;
    para(it.text, { size: 12, style: 'bold', gap: 2 });
    if (it.answer.note) para('Note: ' + it.answer.note, { size: 10.5, x: M + 14, width: CW - 14, gap: 2 });
    para('Suggested pro to call: ' + it.pro, { size: 10.5, style: 'bold', color: C.rust, x: M + 14, width: CW - 14, gap: 4 });
    await photoRow(it.answer);
    setDraw(C.line);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, W - M, y + 2);
    y += 14;
  }

  // ---------- Section 2: Keep an eye on ----------
  onProgress('Adding the "keep an eye on" items…');
  y += 10;
  sectionTitle('2. Keep an eye on');
  if (!watch.length) {
    para('No items were marked "Keep an eye on".', { color: C.muted });
  }
  for (const it of watch) {
    ensure(54);
    font('bold', 9.5);
    setColor(C.muted);
    doc.text(pdfSafe(it.area.name), M, y + 10);
    y += 16;
    para(it.text, { size: 12, style: 'bold', gap: 2 });
    if (it.answer.note) para('Note: ' + it.answer.note, { size: 10.5, x: M + 14, width: CW - 14, gap: 4 });
    await photoRow(it.answer);
    setDraw(C.line);
    doc.setLineWidth(0.5);
    doc.line(M, y + 2, W - M, y + 2);
    y += 14;
  }

  // ---------- Section 3: Full checklist ----------
  onProgress('Adding the full checklist…');
  newPage();
  sectionTitle('3. Full checklist by area');
  const chipW = 92;
  for (const area of items) {
    const ap = progressFor(insp, area.items);
    ensure(60);
    setFill([241, 235, 223]);
    doc.rect(M, y, CW, 24, 'F');
    font('bold', 12.5);
    setColor(C.navy);
    doc.text(pdfSafe(area.name), M + 8, y + 16);
    font('normal', 10);
    setColor(C.muted);
    doc.text(`${ap.done} of ${ap.total} checked`, W - M - 8, y + 16, { align: 'right' });
    y += 32;
    for (const it of area.items) {
      const a = answerFor(insp, it.id);
      const textLines = wrap(it.text, CW - chipW - 12, 10.5);
      const noteLines = a.note ? wrap('Note: ' + a.note, CW - chipW - 12, 9.5, 'italic') : [];
      const rowH = Math.max(18, textLines.length * lh(10.5) + noteLines.length * lh(9.5)) + 8;
      ensure(Math.min(rowH, 120));
      const s = a.status || 'none';
      chip(a.status ? STATUSES[a.status].label : 'Not checked', M, y - 1, STATUS_COLORS[s], { width: chipW, size: 8.5 });
      let ty = y;
      setColor(C.ink);
      for (const line of textLines) {
        font('normal', 10.5);
        doc.text(line, M + chipW + 12, ty + 10.5);
        ty += lh(10.5);
      }
      for (const line of noteLines) {
        if (ty + lh(9.5) > H - BOTTOM) {
          newPage();
          ty = y;
        }
        font('italic', 9.5);
        setColor(C.muted);
        doc.text(line, M + chipW + 12, ty + 9.5);
        ty += lh(9.5);
      }
      y = Math.max(ty, y + 18) + 8;
    }
    y += 10;
  }

  // ---------- Questions for the seller (Buying a home only) ----------
  if (insp.mode === 'B') {
    onProgress('Adding questions for the seller…');
    newPage();
    sectionTitle('4. Questions to ask the seller');
    SELLER_QUESTIONS.forEach((q, i) => {
      para(`${i + 1}.  ${q}`, { size: 11.5, gap: 6 });
    });
    if (problems.length) {
      y += 8;
      ensure(50);
      font('bold', 13);
      setColor(C.navy);
      doc.text('About the problems you found', M, y + 13);
      y += 24;
      problems.forEach((it, i) => {
        let q = `${i + 1}.  ${it.area.name} — "${it.text}": I noticed a problem here. Do you know about it, and has it been looked at or repaired? Do you have any paperwork or receipts?`;
        if (it.answer.note) q += ` (My note: ${it.answer.note})`;
        para(q, { size: 11, gap: 6 });
      });
    }
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
    const lines = doc.splitTextToSize(DISCLAIMER, CW);
    doc.text(lines, M, top + 12);
    font('bold', 8.5);
    setColor(C.navy);
    const fy = H - 24;
    doc.text("Walter's Home Check — Home Check Report", M, fy);
    doc.text(`Page ${p} of ${pages}`, W - M, fy, { align: 'right' });
  }

  onProgress('Almost done…');
  return doc.output('blob');
}
