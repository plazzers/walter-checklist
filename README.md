# Walter's Home Check — Home Inspection Checklist

A phone-friendly checklist app that walks a homeowner or home buyer through a house, area by area. People mark each item (OK / Keep an eye on / Problem / N/A), add notes and photos, and make a PDF report.

It also has **My Home**: a monthly maintenance calendar for the house people live in (see section 9).

- Works on iPhone, Android and computers. Can be installed to the Home Screen like a regular app.
- Works **without internet** after the first visit.
- No accounts, no tracking, no server. Everything people enter stays on **their own** device.
- Opens with an access code that buyers get from Payhip.

This guide is written for non-programmers. You can do everything below in your web browser on github.com — you don't need to install anything.

---

## 1. Put the app online (GitHub Pages)

You only do this once.

1. Open your repository on github.com (`walter-checklist`).
2. Click **Settings** (the gear tab along the top of the repository, not your account settings).
3. In the left-hand menu, click **Pages**.
4. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
5. Under **Branch**, choose **main** and the folder **/ (root)**. Click **Save**.
6. Wait 1–2 minutes and refresh the page. A box at the top shows **"Your site is live at …"** with a link like
   `https://YOUR-USER-NAME.github.io/walter-checklist/`
7. Open that link. You should see "Enter your access code". Type one of your access codes to try it.

That link is what you give your buyers (for example in the Payhip product's download/thank-you text, together with their access code).

> **Note:** on a free GitHub account, Pages only works when the repository is **Public**. That's fine — the access codes are stored scrambled (see below), and this is meant as a simple "soft lock", not bank-level security.

---

## 2. Access codes

The first screen asks for an access code. Codes are **not** stored in plain text — only a scrambled version called a "hash". Upper/lower case and extra spaces don't matter.

### Add a new code

1. Open the hash tool in your browser:
   `https://YOUR-USER-NAME.github.io/walter-checklist/tools/make-code-hash.html`
2. Type the new code (for example `WALTER-2026-OAK7`). A line appears underneath. Click **Copy line**.
3. On github.com, open the file **`config.js`** and click the **pencil icon** (Edit).
4. Find `ACCESS_CODE_HASHES = [`. Paste the line on a new line inside the square brackets, under the other codes. Every line must end with a comma.
5. Click **Commit changes…** → **Commit changes**.
6. Put the code itself (not the hash) into your Payhip product so buyers receive it.

It can look like this:

```js
export const ACCESS_CODE_HASHES = [
  "5d6807a3…your existing hash…", // code #1
  "4b1c…your new hash…", // 2026-10-06
];
```

You can use one code for everyone, or a few different ones.

**Good to know:** once someone unlocks the app on a device, it stays unlocked on that device — removing a code later doesn't lock people out.

---

## 3. Change the links, email and app name

Open **`config.js`** → pencil icon, and change the text between the quotes:

| Setting | What it is |
|---|---|
| `APP_NAME` | Full name shown under Settings → About |
| `YOUTUBE_URL` | Link to your YouTube channel |
| `STORE_URL` | Link to your Payhip store |
| `SUPPORT_EMAIL` | Email address shown for help |
| `WALK_ORDER` | Suggested order of the areas (by their number in `CHECKLIST_CONTENT.md`) |
| `MANUAL_URL` | Link in the small "Home Check Manual" card on the My Home tab |

Keep the quotes `" "` and the semicolons. Then **Commit changes**.

---

## 4. Change Walter's picture (avatar)

The round picture in the header, on the welcome screen and on the PDF cover is `assets/walter-avatar.png`.

1. Make a **square** picture (about 256 × 256 pixels or bigger), saved as **PNG**. A round crop looks best — anything outside the circle can be transparent.
2. Name it exactly **`walter-avatar.png`**.
3. On github.com open the **`assets`** folder → **Add file** → **Upload files** → drop in your file → **Commit changes**. It replaces the old one.

The Home Screen app icons are in `assets/icons/` (`icon-192.png`, `icon-512.png`, `maskable-512.png` with extra empty space around the picture, `apple-touch-icon.png` at 180 × 180, `favicon-32.png`). Replace them the same way, keeping the same names and sizes.

---

## 5. Edit the checklist text

All the wording comes from **`CHECKLIST_CONTENT.md`**. The app reads a copy of it in **`data/checklist.js`**. You have two ways to make changes:

### Option A — quick fix: edit `data/checklist.js` directly

Good for fixing a typo or rewording a tip.

1. Open `data/checklist.js` → pencil icon.
2. Find the text (use your browser's Find, Ctrl+F / Cmd+F) and change the words **between the quotes**.
3. Don't remove quotes, commas or brackets. If you need a double quote inside the text, write `\"`.
4. **Commit changes.**

(If you do this, also make the same change in `CHECKLIST_CONTENT.md` so the two stay the same.)

### Option B — edit `CHECKLIST_CONTENT.md` and rebuild

Good for bigger changes, like adding items.

1. Edit `CHECKLIST_CONTENT.md` on github.com and commit. Each item is one line:
   `- Item text | Tip | Priority (High, Medium or Low) | Who to call | Modes (B A W)`
2. Download the file (open it → **Download raw file** button).
3. Open the rebuild tool: `https://YOUR-USER-NAME.github.io/walter-checklist/tools/build-checklist.html`
4. Choose the downloaded file. If something is wrong, it tells you which line to fix. Otherwise click **Download checklist.js**.
5. On github.com open the **`data`** folder → **Add file** → **Upload files** → drop in `checklist.js` → **Commit changes**.

(Programmers can instead run `node tools/build-checklist.mjs` in the repository folder.)

### Important: add new items at the end of an area

Each item's saved answer is linked to its position in its area (the 1st item of Roof, the 2nd item of Roof, …). Changing words is always safe. But if you **insert, delete or reorder** items in the middle of an area, people's saved answers for that area would shift to the wrong items. So add new items at the **end** of an area, and don't delete items from the middle (you can reword them instead).

Modes: **B** = Buying a home, **A** = Yearly home check, **W** = Get ready for winter. The "Questions to ask the seller" list at the bottom of the file goes on its own page in the PDF for "Buying a home" checks.

---

## 6. How updates reach people's phones

After you commit a change, GitHub Pages publishes it within a few minutes. The app keeps a saved copy so it works offline; it quietly downloads the new version in the background, and people see it the **next time** they open the app (sometimes the time after).

If you ever want to force everyone to get a fresh copy, open **`sw.js`**, raise the number in `const VERSION = '4';` by one (`'5'`, then `'6'` next time, and so on) and commit.

If you ever add a **new file** to the app, also add its name to the `FILES` list in `sw.js`, or it won't work offline.

---

## 7. Test it

### Try the whole thing

1. Open your app link and enter one of your access codes.
2. Start a check in each of the three modes, mark a few items, write a note, add a photo.
3. Open **Summary**, then **PDF report**, and download/share the PDF.
4. Go to **Settings** → make a backup → delete a check → restore from the backup file.
5. Open the **My Home** tab → set up a home → tick a job as done, snooze one, hide one → add a logbook entry with a photo → **Export logbook PDF** → **Add reminders to my phone calendar**.

### Self-tests for My Home

Open `https://YOUR-USER-NAME.github.io/walter-checklist/tests/maintenance.html`. It checks the maintenance rules, the monthly lists, the calendar file, the age report and the storage upgrade, and should say **"All … tests passed"** in green. It uses its own test storage and doesn't touch anyone's data. Run it after you change `data/maintenance.js`.

To start over as a brand-new user (see the access-code screen again): in Chrome, open the app, click the icon left of the address → **Site settings** → **Delete data**. On iPhone: Settings → Safari → Advanced → Website Data → find `github.io` → Delete.

### Test offline

**On a phone:** open the app once with internet (wait a few seconds), install it to the Home Screen, then turn on **Airplane Mode** and open it from the Home Screen icon. Everything — including the PDF — should still work.

**On a computer (Chrome):** open the app, wait a few seconds, then press F12 → **Network** tab → change "No throttling" to **Offline** → reload the page. The app should still load.

---

## 8. Where people's data lives

Checks, notes, photos, homes and logbook entries are stored in the browser on each person's own device. Nothing is uploaded — not to you, not to GitHub. That's why the app has **Settings → Backup**: it saves one file with everything (including photos) that people can keep in Files, iCloud Drive, Google Drive or email to themselves, and restore later or on a new phone.

On iPhone, Safari may clear website data if the site isn't used for a while. Installing the app to the Home Screen prevents that, and the app explains this to iPhone users.

---

## 9. My Home (maintenance calendar)

The **My Home** tab (bottom of the screen: **Checks · My Home · Settings**) helps people look after the house they live in.

- **Home details** — a short form, all optional: nickname, US state, year built, and the house's systems (roof, water heater, heating, AC, sump pump, well, septic, fireplace, deck, basement/crawlspace/slab, gutters, smoke & CO alarms) with install years if known. The state picks a climate group (Cold winters / Mixed / Hot & humid / Hot & dry); people can change it. People can add more than one home.
- **This month** — e.g. "October — 7 things for your house". Each job shows Walter's one-line reason, about how long it takes, and **Do it myself** or **Call a pro**. People can tick **Done**, **Snooze 2 weeks**, or say **Not for my house** (hides that job for that home; it can be brought back at the bottom of the page). A ring shows progress, and "Coming up next month" lists what's next.
- **Year** — all 12 months with how many jobs and how many are done. Tap a month to see its list.
- **Systems** — how old the roof, water heater, furnace etc. are next to their *typical* lifespan, with plain words ("Plenty of life left" / "Getting older — keep an eye on it" / "At or past typical age — start planning"). No prices.
- **Reminders on the phone** — makes a calendar file with one reminder on the 1st of each month for the next 12 months. Adding it again updates the reminders instead of making copies in most calendar apps. Works offline.
- **Logbook** — what was done, when, by whom, the cost and a photo. People can filter by part of the house and export a **logbook PDF** (handy when selling the house).
- A small card at the bottom points to the Home Check Manual (`MANUAL_URL` in `config.js`). It shows up once a month and can be dismissed.

Everything is included in **Settings → Backup**. Older backup files still restore fine.

### Change the maintenance jobs

All jobs are in **`data/maintenance.js`** (about 80 of them). Each one looks like this:

```js
{
  id: 'gutters-spring', system: 'roof', title: 'Clean the gutters and check the downspouts',
  why: 'Clogged gutters spill water right next to the foundation — and that is how basements get wet.',
  months: ['spring'], condition: (p) => notNo(p.gutters), minutes: 60, diy: true, safety: true,
  pro: 'Gutter cleaning service (if you would rather stay off the ladder)',
},
```

- You can safely change the words in `title`, `why`, `whyFamily` (used when kids or older adults live at home) and `pro`, and the number in `minutes`.
- `months` can be month numbers (`[3, 11]` = March and November) or season names like `'spring'` or `'early-fall'`. The `SEASONS` table near the top of the file says which month each season means in each climate.
- **Never change an `id`** — people's "Done" ticks and hidden jobs are saved by it. To retire a job, it's safest to leave it in and change its months instead. To add a job, copy one and give it a new, unique id.
- After a change, open the self-tests page (section 7) to make sure everything still passes.

The typical lifespans for the Systems page are at the bottom of the same file (`LIFESPANS`).

---

## What's in this repository

| File / folder | What it does |
|---|---|
| `index.html`, `styles.css` | The app's page and its look (colors, sizes, light/dark mode) |
| `config.js` | **Your settings:** access codes, links, email, walking order |
| `CHECKLIST_CONTENT.md` | **The checklist wording** (the master copy) |
| `data/checklist.js` | The checklist in the form the app reads |
| `data/maintenance.js` | **The My Home maintenance jobs**, climate groups and typical lifespans |
| `js/` | The app's code (`myhome.js`, `homeplan.js`, `ics.js` and `logbook-pdf.js` are the My Home part) |
| `tests/maintenance.html` | Self-tests for My Home (open it in the browser) |
| `assets/` | Avatar picture and app icons |
| `tools/make-code-hash.html` | Turns a new access code into a hash for `config.js` |
| `tools/build-checklist.html` | Rebuilds `data/checklist.js` from `CHECKLIST_CONTENT.md` |
| `vendor/jspdf.umd.min.js` | PDF maker (jsPDF, MIT license — see `vendor/jspdf-LICENSE.txt`) |
| `sw.js`, `manifest.webmanifest` | Make the app installable and work offline |
| `BUILD_SPEC.md` | The original build specification |
| `SPEC_V2_HOME_MANUAL.md` | The specification for My Home |

---

*This checklist is an educational guide to help you look at a home more carefully. It is not a professional home inspection and does not replace a licensed home inspector, engineer, electrician, plumber or other qualified professional. Always hire a qualified professional before making repair or purchase decisions.*
