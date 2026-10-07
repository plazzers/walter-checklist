# SPEC v2 — "My Home" maintenance calendar (add to the existing app)

Read README.md and the existing code first. This is an ADDITION to the live, paid app (Walter's Home Check, sold on Payhip). Do not break anything that exists: unlock flow, access-code hashes in config.js, inspections, photos, PDF report, backup/restore, offline service worker. Existing users' IndexedDB data must keep working (add a DB version upgrade that only adds stores).

Same tech rules as BUILD_SPEC.md: static, vanilla JS ES modules, no build step, no runtime network calls, offline PWA, relative paths, accessible (18px base, 48px tap targets), light/dark, Walter's tone in all copy (calm, plain, practical; never claims licenses or credentials; educational only).

## 1. New top-level section: "My Home"

Add a bottom/tab navigation (or clear home-screen cards) with: **Checks** (existing) · **My Home** (new) · **Settings**.

### 1.1 Home profile (one or more homes)
Simple form, all optional, saved locally:
- Nickname (e.g. "Our house"), US state (dropdown; used only to pick a climate group), year built
- Climate group auto-picked from state, user can override: Cold winters / Mixed / Hot & humid / Hot & dry
- Systems (each: type + install year or "don't know"): roof (asphalt shingle / metal / tile / other), water heater (tank gas / tank electric / tankless), furnace/boiler (gas / oil / electric / heat pump / none), central AC (yes/no), sump pump (yes/no), well (yes/no), septic (yes/no), fireplace/wood stove (yes/no), deck (yes/no), basement / crawlspace / slab, gutters (yes/no), smoke & CO alarms install year
- Has kids or older adults at home (optional, only affects a couple of safety reminders' wording)

### 1.2 "This month" view (default view of My Home)
- Header: "October — 7 things for your house" (current month, device local time).
- Generated task list for the current month from the rules engine (section 2), each with: task, Walter's one-line why, estimated time ("10 min"), "Do it myself" vs "Call a pro" tag, Done checkbox (saved per home per month/year), Snooze 2 weeks, "Not for my house" (hides that rule for this home).
- Progress ring for the month.
- "Coming up next month" collapsed list.

### 1.3 Year calendar
- 12-month grid; each month shows count of tasks and done count. Tap a month to see its list.

### 1.4 Systems at a glance ("age report")
For each system with a known install year, show age and a simple status bar using typical life ranges (educational, clearly labeled "typical range, not a prediction"):
- Asphalt roof 20–25 yrs, metal 40–70, tile 50+
- Tank water heater 8–12, tankless 15–20
- Gas furnace 15–20, heat pump 10–15, boiler 15–30
- Central AC 12–17
- Sump pump 7–10
- Smoke alarms replace at 10 yrs; CO alarms 5–7 yrs
Status words: "Plenty of life left" / "Getting older — keep an eye on it" / "At or past typical age — start planning". Never show prices. Footer: the existing disclaimer.

### 1.5 Calendar export (reminders on the phone)
- Button "Add reminders to my phone calendar": generates an `.ics` file (RFC 5545) with one all-day event on the 1st of each month for the next 12 months, titled "Walter's Home Check: <Month> house tasks", description listing that month's tasks (plain text, ≤ 1,000 chars, then "Open the app for details"), plus `VALARM` the morning of. Use the Web Share API with the file on phones when available, else download. Stable UIDs so re-importing doesn't duplicate.
- Works offline.

### 1.6 Home record ("house logbook")
- Log entries: date, what was done, who did it (me / company name), cost (optional, plain number), notes, optional photo (reuse existing compression). List newest first, filter by system.
- Included in backup/restore.
- "Export logbook PDF" using the existing vendored jsPDF, same branding as the inspection report (useful when selling the house).

## 2. Rules engine (data/maintenance.js)

Write ~70 maintenance rules as data. Each rule: `id, title, why (Walter voice, one sentence), months: [1..12] or seasonal keys resolved by climate group, condition (function of profile, e.g. p => p.sumpPump), minutes, diy: true/false, pro (string when diy false), safety: bool`.

Cover at least: gutters & downspouts (spring + fall), roof look-over from the ground, attic check after storms, HVAC filter (every 1–3 months), furnace tune-up (early fall), AC tune-up (spring), water heater flush (yearly) and relief valve test, sump pump test (spring + before rainy season), smoke & CO alarm test (monthly) and battery change (twice a year — e.g. clock-change months March & November), fire extinguisher check, dryer vent cleaning (yearly), range hood filter, fridge coils, GFCI test (monthly), outdoor faucets shut off & hoses disconnected (fall, cold/mixed climates), exterior caulk & weatherstripping (fall), grading & drainage check (spring), deck inspection & sealing (late spring, if deck), chimney/fireplace inspection (late summer, if fireplace), garage door reverse test, window & door locks, foundation crack walk-around (spring + fall), basement/crawlspace moisture check after heavy rain, radon test (every 2 years; winter), septic pumping reminder (every 3–5 years, if septic; ask last pumped year in profile — add field), well water test (yearly, if well), pipe insulation before freeze (cold/mixed), hurricane prep (June, hot & humid), wildfire defensible space (spring, hot & dry), snow & ice dam watch (winter, cold), water shut-off valve exercise (yearly), toilet & under-sink leak check (quarterly), caulk around tubs/showers (yearly), trim trees away from roof (late winter), pest check (spring).
Content must be accurate, conservative, and educational; anything electrical/gas/structural beyond looking = "Call a pro".

## 3. Upsell & cross-links (gentle)
- In My Home, a small card at the bottom: "Want the full picture? The Home Check Manual has the room-by-room guide and a seasonal calendar." → https://payhip.com/b/ABaxT (only shown once per month, dismissible).

## 4. Testing & delivery
- Bump service worker VERSION so devices get the update; precache new files.
- Self-tests page `tests/maintenance.html` for: rule filtering by profile & climate, month generation, ics validity (line folding, CRLF, UID stability, escaped commas/semicolons), age status thresholds, DB upgrade from v1 data (create a v1 DB fixture, upgrade, verify inspections intact).
- Playwright (Chromium preinstalled; don't run `playwright install`) at 390x844 and 1280x800: unlock with a TEMPORARY test hash (add, then REMOVE before committing — never commit a plain code), create home profile, see this month, mark done, snooze, hide a rule, export .ics (parse it back and validate), add logbook entry with photo, export logbook PDF, backup → clear → restore, offline reload, and confirm the existing inspection flow still works end to end.
- Update README (plain language) with the new section.
- Commit to main with clear messages.
