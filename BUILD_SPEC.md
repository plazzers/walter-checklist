# BUILD SPEC — Walter's Home Check: Home Inspection Checklist App

## 1. Product overview

A paid, installable web app (PWA) sold on Payhip under the "Walter's Home Check" brand.
It walks a homeowner or home buyer through a house area by area, lets them mark each item, add notes and photos, and export a clean PDF report.

- Audience: US homeowners and home buyers, many aged 50+. Not technical. Often using a phone while walking around a house.
- Tone: warm, plain-spoken, practical. Short tips "in Walter's style" next to each item.
- It is an educational checklist. It never claims to be a professional inspection and never claims that a licensed inspector reviewed the user's house.

## 2. Tech requirements

- Static site, no backend, no accounts, no database server, no external API calls at runtime.
- Plain HTML + CSS + vanilla JavaScript (ES modules). No build step, so it can be hosted directly on GitHub Pages.
- Any third-party library (for example jsPDF for PDF export) must be vendored into the repo (no CDN at runtime) so the app works fully offline.
- PWA: `manifest.webmanifest` + service worker that caches all app files. App must work offline after first load.
- Storage: IndexedDB for inspections, notes and photos. Compress photos on the device to max 1200px on the long side, JPEG quality ~0.7.
- No analytics, no tracking, no cookies.
- Must work on: iPhone Safari (latest 2 iOS versions), Android Chrome, desktop Chrome/Safari/Edge.
- Accessibility: base font 18px, tap targets at least 48px, high contrast, works with system text size increase.

## 3. Access code (soft paywall)

- First screen: "Enter your access code" (code comes with the Payhip purchase).
- Validate against a list of SHA-256 hashes stored in `config.js` (never store plain codes in the repo).
- On success, remember unlock in IndexedDB so the user never sees it again on that device.
- Include a small script `tools/make-code-hash.html` (opens in browser, type a code, get its hash) so the owner can add new codes without coding.
- This is intentionally a soft lock. Keep it simple.

## 4. Screens

1. **Unlock** — logo/avatar placeholder, short welcome line, code field, "Where do I find my code?" help text.
2. **Home** — list of saved inspections (name, address, date, progress %), big "Start a new check" button, link to Settings.
3. **New check** — name/address field (optional), choose a mode:
   - **Buying a home** — all areas and items (tag B)
   - **Yearly home check** — items tagged A
   - **Get ready for winter** — items tagged W
4. **Areas list** — each area as a card with an icon, item count and progress bar. Suggest a walking order (outside first, then inside, top to bottom).
5. **Area detail** — items one below another. For each item:
   - Item text (bold)
   - "Walter's tip" (collapsible, open by default the first time)
   - Status buttons: **OK** / **Keep an eye on** / **Problem** / **N/A**
   - Note field
   - Add photo (camera or gallery), thumbnails, delete photo
   - When status = Problem, show the suggested pro to call
6. **Summary** — counts per status, then all "Problem" items sorted by priority (High → Medium → Low), then "Keep an eye on" items. Each shows area, note and photo thumbnail.
7. **PDF report** (see section 6).
8. **Settings** — backup (export all data as a JSON file including photos), restore from file, delete an inspection, "How to install on your phone" (iPhone and Android steps), About & disclaimer, links to the YouTube channel and the Payhip store (placeholders in `config.js`).

Auto-save everything instantly. No "save" buttons.

## 5. Design

- Feel: trustworthy, warm, like a well-made workshop notebook. Not flashy, not "tech startup".
- Palette suggestion: deep navy, warm off-white background, brick/rust accent, green/amber/red only for status.
- Status colors must also have icons/labels (never color only).
- Header shows "Walter's Home Check" and a small round avatar image (`assets/walter-avatar.png`, placeholder for now).
- Light and dark mode.
- Show a one-time "Install this app" banner with platform-specific instructions (iPhone: Share → Add to Home Screen; Android: Install app).
- On iPhone, explain that installing to the Home Screen keeps data safe, and remind users to make a backup.

## 6. PDF report

- Cover: "Home Check Report", property name/address, date, mode, Walter's Home Check branding.
- Summary box: number of OK / Keep an eye on / Problem / N/A, and overall completion %.
- Section 1: Problems by priority (area, item, note, suggested pro, photos at small size).
- Section 2: Keep an eye on.
- Section 3: Full checklist by area with status.
- In "Buying a home" mode only: a page "Questions to ask the seller" (from the content file), plus any Problem items turned into questions.
- Footer on every page: disclaimer (section 8) and page numbers.
- File name: `home-check-[name]-[date].pdf`. Must work offline and on iPhone (use share sheet/download).

## 7. Content

All checklist content is in `CHECKLIST_CONTENT.md` in this repo. Convert it into `data/checklist.js` (structured data: areas → items with id, text, tip, priority, pro, modes). Do not rewrite the wording. Keep the content file as the single source so the owner can edit text later; add a short note in README on how to regenerate the data file (or simply edit `data/checklist.js` directly).

## 8. Disclaimer (show on Unlock screen footer, About, and PDF footer)

"This checklist is an educational guide to help you look at a home more carefully. It is not a professional home inspection and does not replace a licensed home inspector, engineer, electrician, plumber or other qualified professional. Always hire a qualified professional before making repair or purchase decisions."

## 9. Config placeholders (`config.js`)

- `APP_NAME`: "Walter's Home Check — Home Inspection Checklist"
- `YOUTUBE_URL`: "https://youtube.com/@PLACEHOLDER"
- `STORE_URL`: "https://payhip.com/PLACEHOLDER"
- `SUPPORT_EMAIL`: "PLACEHOLDER@example.com"
- `ACCESS_CODE_HASHES`: [ hash of "WALTER-DEMO-2026" for testing ]

## 10. Deliverables

- Working app in the repo root, ready for GitHub Pages.
- `README.md` written for a non-programmer: how to turn on GitHub Pages, how to add access codes, how to change links and the avatar image, how to edit checklist text, how to test offline.
- Before finishing: test the full flow (unlock → new check in each mode → mark items → add photo → summary → PDF → backup → restore) at phone width and desktop width, and confirm the app loads offline.
