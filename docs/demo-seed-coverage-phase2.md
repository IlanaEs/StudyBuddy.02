# Demo Seed Coverage — Phase 2 Gap Analysis

**Date:** 2026-06-09 · **Branch:** feat/demo-seed-alignment · **Status:** analysis only (no seed changes yet)

## Why this report
Phase 1 confirmed the demo seed *executes* and produces valid, approved, matchable teachers. But 3 teachers / 7 distinct subjects / 9 slots is far short of QA coverage for the matching flow. This maps every onboarding path to its match count and recommends a seed plan that guarantees we can exercise zero / single / multi-match outcomes across the whole catalog.

## How coverage is determined (verified against code)
- **Onboarding paths = `subjectsByLevel`** (`apps/frontend/src/features/matching/data/subjectsByLevel.ts`) — the level→subjects catalog the student wizard exposes. 4 levels × their subjects = **54 (level, subject) paths**, **43 distinct subjects**.
- **Teacher level is `null`** for every seeded subject → `findBestLevelMatch` (`matching.filters.ts:129`) falls back to `level === null` for *any* requested level, so a teacher covers **all 4 bands** of a subject they teach. Coverage is therefore **subject-driven**: a path's match count = number of seeded teachers carrying that subject, *if* the subject is exposed at that level.
- **Subject resolution is exact** (`.in` / `ilike` on name) → a teacher carrying `כימיה` does **not** cover the distinct catalog subject `מדעים`.
- **Location**: intakes are online-only (017); matched teachers must be `online`/`both` — all current teachers qualify, so location doesn't reduce structural coverage (caveat: a `frontal`-only teacher would).
- **Soft gates** (not structural): budget (`hourly_rate` 95–140 today), availability overlap ≥30 min with the student's chosen days/times, weekly saturation, 30-day recency. Match cap = **3** (`MAX_MATCH_RESULTS`).

---

## 1. Learner levels supported (4 bands)
| Band | Grades | # subjects exposed |
|---|---|---|
| `elementary` | א׳–ו׳ | 7 |
| `middle` | ז׳–ט׳ | 12 |
| `high` | י׳–י״ב | 15 |
| `academic` | שנה א׳–ד׳ | 20 |

## 2. Subjects exposed in onboarding/matching
43 distinct (union of `subjectsByLevel`). The canonical taxonomy seeded in the DB is 48 subjects — so **5 canonical subjects aren't exposed in the student wizard at all** (not QA-relevant for onboarding paths).

## 3. Current seeded coverage

**Seeded teachers & subjects (all `level=null`):**
| Teacher | location | subjects |
|---|---|---|
| math (`devseed.teacher.math`) | online | מתמטיקה, פיזיקה |
| english (`devseed.teacher.english`) | both | אנגלית, לשון, מתמטיקה |
| science (`devseed.teacher.science`) | online | כימיה, ביולוגיה, מדעי המחשב, מתמטיקה |

**Per-subject teacher count (only the 7 covered subjects):**
| Subject | #teachers | Bands exposed |
|---|---|---|
| מתמטיקה | **3** | middle, high |
| אנגלית | 1 | elementary, middle, high |
| לשון | 1 | middle, high |
| פיזיקה | 1 | high, academic |
| כימיה | 1 | high |
| ביולוגיה | 1 | high |
| מדעי המחשב | 1 | middle, high |

### Coverage matrix by band (match count per exposed path)
- **elementary (7):** אנגלית=1 · חשבון, עברית, מדעים, הכנה לכיתה א׳, קריאה וכתיבה, הבנת הנקרא = **0**  → 6/7 zero
- **middle (12):** מתמטיקה=**3** · אנגלית=1 · לשון=1 · מדעי המחשב=1 · מדעים, היסטוריה, ספרות, תנ״ך, גיאוגרפיה, אזרחות, תכנות בסיסי, רובוטיקה = **0** → 8/12 zero
- **high (15):** מתמטיקה=**3** · אנגלית, פיזיקה, כימיה, ביולוגיה, מדעי המחשב, לשון = 1 (×6) · ספרות, היסטוריה, תנ״ך, אזרחות, סייבר, פסיכולוגיה, כלכלה, תקשורת = **0** → 8/15 zero
- **academic (20):** פיזיקה=1 · the other 19 (מבני נתונים, אלגוריתמים, OOP, Java, Python, בסיסי נתונים, מערכות הפעלה, רשתות, Full Stack, React, Node.js, הסתברות, סטטיסטיקה, חקר ביצועים, SQL, Data Analysis, מעגלים, חדו״א, לינארית) = **0** → 19/20 zero

### Tally across all 54 paths
| Outcome | Count | Where |
|---|---|---|
| **2+ matches** (caps at 3) | **2** | מתמטיקה @ middle, מתמטיקה @ high (3 each) |
| **exactly 1 match** | **11** | elem: אנגלית · middle: אנגלית/לשון/מדעי המחשב · high: אנגלית/פיזיקה/כימיה/ביולוגיה/מדעי המחשב/לשון · academic: פיזיקה |
| **zero matches** | **41** | everything else |

**Subject coverage: 7 / 43 (16%). 36 exposed subjects have no teacher at any level.**

---

## 4. Gap analysis — onboarding paths that misbehave today

**Zero-match (41 paths) — high-impact clusters:**
1. **`מדעים` (generic science) — 0**, despite being exposed at elementary **and** middle (very common path). The science teacher has כימיה/ביולוגיה/מדעי המחשב, not the distinct `מדעים`. *Most likely first thing a QA tester hits.*
2. **`academic` band is effectively dead** — 19/20 zero. Note `מתמטיקה` isn't even in the academic catalog; academic math is חדו״א/לינארית/הסתברות/סטטיסטיקה — all uncovered. Any university-track learner → near-certain zero.
3. **`elementary` near-dead** — 6/7 zero. `חשבון` (elementary math, a distinct subject from מתמטיקה) is uncovered.
4. **Humanities entirely uncovered** — היסטוריה, ספרות, תנ״ך, גיאוגרפיה, אזרחות, פסיכולוגיה, כלכלה, תקשורת, עברית, קריאה וכתיבה, הבנת הנקרא.
5. **CS/tech beyond `מדעי המחשב` uncovered** — תכנות בסיסי, רובוטיקה, סייבר, and *all* academic CS (Java, Python, React, SQL, מבני נתונים, …).

**Single-match-only (11 paths):** these can't exercise the ranked / "choose among multiple" UI — the wizard returns exactly one card.

**Multi-match (2 paths):** the ranked-results flow (and the 3-result cap) can **only** be QA'd through `מתמטיקה` at middle/high. No band other than middle/high can show >1 match; **elementary and academic can never show more than one match today.**

---

## 5. Recommended Phase 2 seed plan

**Coverage guarantees to target:**
- **Per band:** ≥1 subject hitting the **3-result cap**, ≥1 with **exactly 2**, ≥1 with **exactly 1** — so every band can exercise zero/single/multi independently.
- **Fix the `מדעים` gap** (exposed + common) and give `elementary`/`academic` real density (today they max out at 1).
- **Keep zero-match deterministic** via the **off-catalog manual-subject path** (migration 022): a student typing a non-catalog subject always yields zero matches + a manual-match lead. This is cleaner than leaving catalog holes — so we can fully cover the catalog and still test "no matches".
- Spread `hourly_rate` (e.g. 80–180) and keep all teachers `online`/`both` so **budget filtering** is testable without accidental location zeros. Give wide availability across all 7 days, with one or two deliberately narrow windows to test the **availability-overlap** gate.

**Proposed roster — keep the 3 existing, add 7 (10 total).** All `level=null`, `is_verified`/`approved`/`is_active`, demo-flagged.

| # | Teacher (role) | loc | subjects (drives the anchors below) |
|---|---|---|---|
| 1 | math *(existing)* | online | מתמטיקה, פיזיקה |
| 2 | english *(existing)* | both | אנגלית, לשון, מתמטיקה |
| 3 | science *(existing, + add פיזיקה)* | online | כימיה, ביולוגיה, מדעי המחשב, מתמטיקה, **פיזיקה** |
| 4 | elementary-core | online | חשבון, מדעים, עברית, קריאה וכתיבה, הבנת הנקרא, הכנה לכיתה א׳ |
| 5 | elementary-lang | both | חשבון, מדעים, אנגלית |
| 6 | elementary-plus | online | חשבון, מדעים, עברית |
| 7 | humanities | online | היסטוריה, ספרות, תנ״ך, אזרחות, גיאוגרפיה, לשון |
| 8 | social-studies | online | היסטוריה, אזרחות, פסיכולוגיה, כלכלה, תקשורת |
| 9 | cs-school+academic | online | מדעי המחשב, תכנות בסיסי, רובוטיקה, סייבר, Python, Java, מבני נתונים, אלגוריתמים, OOP |
| 10 | academic-stem | both | Python, React, Node.js, Full Stack, SQL, בסיסי נתונים, Data Analysis, מערכות הפעלה, רשתות, חדו״א, לינארית, הסתברות, סטטיסטיקה, חקר ביצועים, מעגלים, פיזיקה |

**Resulting anchors (each band gets a 3-cap + a 2 + 1s):**
| Band | 3-result anchor | exactly-2 | covered? |
|---|---|---|---|
| elementary | חשבון (T4,5,6), מדעים (T4,5,6) | אנגלית (T2,5), עברית (T4,6) | 7/7 |
| middle | מתמטיקה (T1,2,3), מדעים (T4,5,6) | מדעי המחשב (T3,9), לשון (T2,7), היסטוריה (T7,8), אזרחות (T7,8) | 12/12 |
| high | מתמטיקה (T1,2,3), פיזיקה (T1,3,10) | מדעי המחשב, לשון, היסטוריה, אזרחות | 15/15 |
| academic | פיזיקה (T1,3,10) | Python (T9,10), חדו״א/הסתברות/… via T10 (1 each) | 20/20 |

This makes **all 54 paths ≥1 match**, every band capable of **2+ (and a 3-cap)**, plenty of **exactly-1** paths retained, and **zero-match** exercised deterministically through the off-catalog manual-subject path.

**Decisions (approved 2026-06-09):**
1. **Roster size** — ✅ **Full coverage (~10 teachers)**; the roster above. All 54 paths reach ≥1 match.
2. **Zero-match strategy** — ✅ **Off-catalog manual-subject path** (migration 022). Catalog is fully covered; zero-match is exercised by typing a non-catalog subject (→ manual-match lead).
3. **Students/intakes** — ✅ **Teachers + sample intakes**. Seed demo students with intakes per band so zero/single/multi paths are one-click reproducible.
4. **Determinism** — fixed `@studybuddy.local` emails + idempotent upsert so re-seeding is stable.
