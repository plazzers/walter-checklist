/*
 * Turns CHECKLIST_CONTENT.md into the structured data used by the app.
 * Used by tools/build-checklist.html (in the browser) and
 * tools/build-checklist.mjs (with Node). You don't need to edit this file.
 */
(function (root) {
  function parseChecklist(md) {
    const areas = [];
    const sellerQuestions = [];
    let area = null;
    let inQuestions = false;
    const errors = [];

    md.split(/\r?\n/).forEach((raw, i) => {
      const line = raw.trim();
      const heading = line.match(/^##\s+(\d+)\.\s+(.+?)\s*\(icon:\s*([\w-]+)\s*\)\s*$/);
      if (heading) {
        inQuestions = false;
        area = { id: 'a' + heading[1], num: Number(heading[1]), name: heading[2], icon: heading[3], items: [] };
        areas.push(area);
        return;
      }
      if (/^##\s+Questions to ask the seller/i.test(line)) {
        inQuestions = true;
        area = null;
        return;
      }
      if (/^##\s/.test(line)) {
        inQuestions = false;
        area = null;
        return;
      }
      if (!line.startsWith('- ')) return;
      const body = line.slice(2).trim();

      if (inQuestions) {
        sellerQuestions.push(body);
        return;
      }
      if (!area) return;

      const parts = body.split('|').map((p) => p.trim());
      if (parts.length !== 5) {
        errors.push('Line ' + (i + 1) + ': expected 5 parts separated by "|", found ' + parts.length);
        return;
      }
      const [text, tip, priority, pro, modes] = parts;
      if (!/^(High|Medium|Low)$/.test(priority)) {
        errors.push('Line ' + (i + 1) + ': priority must be High, Medium or Low (found "' + priority + '")');
      }
      const modeList = modes.split(/\s+/).filter(Boolean);
      if (!modeList.length || modeList.some((m) => !/^[BAW]$/.test(m))) {
        errors.push('Line ' + (i + 1) + ': modes must be letters B, A and/or W (found "' + modes + '")');
      }
      const n = area.items.length + 1;
      area.items.push({
        id: area.id + '-' + String(n).padStart(2, '0'),
        text,
        tip,
        priority,
        pro,
        modes: modeList,
      });
    });

    return { areas, sellerQuestions, errors };
  }

  function toModuleSource(data) {
    const areasJson = JSON.stringify(data.areas, null, 2).replace(
      /"modes": \[([^\]]*)\]/g,
      (m, inner) => '"modes": [' + inner.split(',').map((s) => s.trim()).join(', ') + ']'
    );
    return (
      '// Walter\'s Home Check — checklist data.\n' +
      '// Generated from CHECKLIST_CONTENT.md. You can edit the text here directly,\n' +
      '// or edit CHECKLIST_CONTENT.md and rebuild this file (see README).\n' +
      '// Keep the quotes and commas exactly as they are.\n\n' +
      'export const AREAS = ' + areasJson + ';\n\n' +
      'export const SELLER_QUESTIONS = ' + JSON.stringify(data.sellerQuestions, null, 2) + ';\n'
    );
  }

  const api = { parseChecklist, toModuleSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChecklistParser = api;
})(this);
