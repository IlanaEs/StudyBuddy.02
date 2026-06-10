# StudyBuddy Design Audit v1

**Status:** Audit + proposed system. **No implementation.** Read-only review of the current
code (post the find-tutor / dashboard DS work on `feat/find-tutor-ds-migration`).
**Scope:** student onboarding, teacher onboarding, quick matching wizard, booking, dashboards,
empty/success/error states. **Goal:** name the drift, answer the subject-filtering question,
and propose one enforceable Design System.

> A DS v1 spec already exists (`docs/design-system.md`) and canonical primitives exist in
> `apps/frontend/src/design-system/`. The problem is **adoption is partial and not enforced** —
> three token systems and three wizard shells coexist. This audit is about *finishing and
> enforcing* DS v1, not inventing it.

---

## 0. TL;DR — root causes of the drift

| # | Root cause | Evidence (current) |
|---|---|---|
| 1 | **Three live token systems** | `--sb-*` canonical (24 files) · `.tow`/`towTokens` legacy (**59 files**) · app `:root` `--bg/--cyan/--surface` legacy (13 files). |
| 2 | **Three wizard shells** | `design-system/WizardShell` (quick wizard, booking) · `features/matching/components/WizardShell` (student onboarding — reskinned to DS glass) · `components/onboarding/v2/primitives WizardShell` (teacher onboarding, `.tow`). |
| 3 | **Two progress bars** | DS `SegmentedProgressBar` (modular blocks; onboarding + quick + booking) vs `NeonProgressTracker` (`.tow`, "step X/8"; teacher onboarding). |
| 4 | **Two card systems** | DS `BentoCard` (`.sb-card` glass, `--sb-border-cyber`) vs legacy `BentoTile` (`features/teacher/components/BentoGrid`, `#3f7e76`/`#016c7c`, towTokens; student + teacher dashboards). |
| 5 | **State screens only partly unified** | DS `GlobalStateCard` used by **only 4 pages** (find-tutor, booking, results, confirmation). Every dashboard + teacher onboarding hand-roll their own empty/loading/error markup. |
| 6 | **Mixed navigation** | DS `FloatingTopNavbar` (student dashboard, capsule) · `DashboardTabs` (teacher) · ad-hoc back/`var(--bg)` chrome (parent/admin) · `WizardFooter` (wizards). |

Net: a screen's look depends on **which era it was built in**, not on a system.

---

## 1. Subject / course chip filtering — explicit answer

**Are chips filtered by `account_type` / `education_path` / `institution` / `degree` / `grade_level`,
or is it a generic repository list?**

**Answer: filtered by `grade_level` (level BAND) ONLY — and only client-side. NOT by
`account_type`, `education_path`, `institution`, or `degree` (those play no part; a repo-wide
search for them against subject/chip/catalog logic returns nothing).**

### Exact current logic
- The catalog is a **frontend map**, not a DB query:
  `apps/frontend/src/features/matching/data/subjectsByLevel.ts` →
  `subjectsByLevel = { elementary:[…], middle:[…], high:[…], academic:[…] }` (4 bands).
- **Full student onboarding** (`MatchingWizardPage.tsx:367`):
  `const subjects = subjectsByLevel[intake.gradeLevel ?? 'elementary'] ?? []` then
  `.filter(s => s.includes(subjectSearch))`. → filtered by the **in-wizard selected band**.
- **Quick Matching Wizard** (`features/findTutor/components/SubjectAutocomplete.tsx`):
  `subjectsForLevel(level)` → `bandForLevel(level)` maps a specific grade (e.g. `ח׳`) → its band
  (`middle`) and returns `subjectsByLevel[band]`; falls back to the full union only if no band
  resolves. → filtered by the **effective level band** (from saved `grade_level` or a temporary
  override).
- **Teacher onboarding** uses a parallel map `SUBJECTS_BY_LEVEL` (`content/teacherOnboardingContent.ts`)
  keyed by teaching level.
- **Backend** (`subjects` table) is **level-agnostic**: columns `id, name, category, is_active`
  (no level/band/path/degree). `findSubjectIdByName` resolves a chosen name by `ilike` — no
  filtering. Level lives on `student_intakes.level` / `teacher_subjects.level` (band strings),
  used by matching, **not** by the chip list.

### Consequences for your examples
- **Elementary student → no Full Stack/React/Node/SQL:** ✅ holds *where the band is correct*.
  `subjectsByLevel.elementary` = `[חשבון, עברית, אנגלית, מדעים, הכנה לכיתה א׳, קריאה וכתיבה,
  הבנת הנקרא]` — CS subjects live only in `academic`. The quick wizard maps grade `ח׳`→middle, etc.
- **University CS student → no elementary curricula:** ✅ `academic` band excludes elementary items.
- ⚠️ **Gaps / drift:**
  1. **No `account_type`/`education_path`/`institution`/`degree` dimension exists.** "Academic" is a
     single flat band — a university CS student and a university humanities student see the **same**
     ~20 CS-heavy `academic` chips. There is no institution/degree/year scoping (those fields aren't
     in the student schema at all).
  2. **Two source-of-truth maps** (`subjectsByLevel` for students, `SUBJECTS_BY_LEVEL` for teachers)
     kept in sync only by a test (`taxonomySync.test.ts`).
  3. **Catalog is hardcoded in the frontend**, not a queryable DB taxonomy → can't be governed/admin-edited.
  4. **Off-band fallback:** if `grade_level` is null and there's no prior intake, the quick wizard
     shows the **full union** (all bands) — i.e., an elementary user with no saved band could see CS.

---

## 2. Per-flow audit

Legend for each dimension: **DS** = on canonical `--sb-*`/design-system; **tow** = legacy `.tow`;
**app** = legacy `--bg/--cyan`.

### A. Student onboarding — `features/matching/pages/MatchingWizardPage.tsx` (10 steps)
- **Layout/shell:** matching `WizardShell` reskinned to DS glass (narrow 480 card, grid bg). ✅ chrome
- **Progress:** DS `SegmentedProgressBar` (via `WizardProgress` delegating). ✅
- **CTA:** **mixed** — footer uses inline `ctaPrimary`/`ctaBack` (legacy `--cyan`), NOT DS `WizardFooter`/`PrimaryButton`.
- **Cards/content:** `WizardOptionCard`/`WizardStepHeader`/`WizardSummaryCard` still legacy `--cyan/--surface`. ❌
- **Typography:** legacy `--font-display` (Space Grotesk) in places vs DS Rubik elsewhere.
- **Empty/error:** inline; loading = `MatchingLoadingScreen` (bespoke), not `GlobalStateCard`.
- **Verdict:** DS chrome, **legacy innards + CTAs** → looks ~DS but inconsistent up close.

### B. Teacher onboarding — `pages/TeacherOnboardingPage.tsx` (8 screens) — **biggest outlier**
- **Shell:** its own `components/onboarding/v2/primitives WizardShell` (`.tow`).
- **Progress:** `NeonProgressTracker` (`.tow`, neon, explicit step counter) — **violates "segmented only / no Step X of Y".**
- **CTA/inputs:** `TowNavButtons`, `TowChipSelect`, `BrutalistSlider`, `FloatingLabelInput` — all `.tow`.
- **Cards:** onboarding-v2 `BentoCard` (`.tow`), `CardSelect`, `SquareCheckbox`.
- **Tokens/type:** towTokens + Space Grotesk; neon palette differs from the canonical turquoise.
- **Verdict:** **entirely separate visual language.** Single largest source of "wizards look different."

### C. Quick Matching Wizard — `features/findTutor/pages/FindTutorWizardPage.tsx` (4 steps)
- Full DS: `WizardShell`(DS) + `SegmentedProgressBar` + `WizardFooter` + `BentoCard` + `sbTokens`;
  glass `.sb-input`; `GlobalStateCard` for loading/error/manual-success. ✅ **the reference**
- Minor: `FloatingLabelInput` (one field) still `.tow`-scoped (wrapped seam).

### D. Booking flow — `features/matching/pages/BookingRequestPage.tsx` + grid/results/confirmation
- DS `WizardShell` (`wide` variant), `BentoCard`, `UrgentButton` (final action), `.data-mono`,
  `GlobalStateCard` states. ✅ Results/Confirmation on DS + `GlobalStateCard`. ✅
- Seam: `BookingAvailabilityGrid` re-skinned to `--sb`, but `AttachmentDropzone`/`FloatingLabelInput` `.tow`.

### E. Dashboard flows
- **Student** (`features/studentDashboard`): legacy `BentoTile`/`BentoGrid` + **towTokens**, now with a
  DS `FloatingTopNavbar` (capsule) + a student-scoped 3-col responsive grid. → **DS nav on tow cards** (mix).
- **Teacher** (`features/teacher/pages/TeacherDashboard.tsx`): towTokens + `DashboardTabs` + `BentoTile`. Legacy.
- **Parent/Admin** (`pages/ParentDashboardPage.tsx`, `AdminDashboardPage.tsx`): app legacy `var(--bg)`/`--cyan`,
  bespoke layout, no shared grid/nav. Legacy.
- **Verdict:** 4 dashboards, ~3 different visual bases; only the student nav is DS.

### F. Empty states
- DS `GlobalStateCard` variant=`empty` — find-tutor results only. Everywhere else hand-rolled:
  student tiles ("אין בקשות פתוחות" via teacher `EmptyState`), `LessonsListView` empty text,
  dashboard inline `<p>`s. **No single empty-state structure.**

### G. Success screens
- Booking confirmation + find-tutor manual-match: DS `GlobalStateCard` variant=`success` (lime check). ✅
- Teacher onboarding success: bespoke `.tow` screen. Inconsistent.

### H. Error screens
- DS `GlobalStateCard` variant=`error` (find-tutor/booking/results no-match). Elsewhere: inline red text
  (`color: sb.error` or `var(--alert)`/`--coral`), 422/500 handled ad-hoc per page. **No unified error surface.**

---

## 3. Consolidated inconsistency matrix

| Dimension | Canonical (DS) | Drift seen |
|---|---|---|
| Layout/shell | `WizardShell` / `AppShell` | + matching shell + onboarding-v2 shell + bespoke dashboard shells |
| Progress | `SegmentedProgressBar` (blocks, no text) | `NeonProgressTracker` (step X/8); `WizardProgress` (now delegates ✅) |
| CTA | `PrimaryButton`(turquoise)/`UrgentButton`(orange)/`Secondary`/`Ghost` | inline `ctaPrimary` (cyan); tow orange buttons; `var(--cyan)` buttons |
| Cards | `BentoCard` (`.sb-card`) | `BentoTile` (tow); onboarding-v2 `BentoCard` (tow) |
| Spacing/padding | DS card 18–32, grid gap 16 | per-page inline paddings; tow radii (12/8) vs sb (16/8) |
| Typography | Rubik UI + JetBrains Mono numerics | Space Grotesk (`--font-display`) across onboarding/dashboards |
| Empty state | `GlobalStateCard` | 4+ bespoke patterns |
| Navigation | `FloatingTopNavbar` (one bar, no sidebar) | `DashboardTabs`, parent/admin bespoke, ex-`FlowNav` remnants |

---

## 4. Proposed **StudyBuddy Design System v1** (to enforce)

The system already specced in `docs/design-system.md` is correct; the proposal is to **finish
adoption and make it the only system**, plus close the taxonomy gap.

### 4.1 Tokens — one source
- Keep `--sb-*` (CSS) + `sbTokens` (TS) as the **only** palette. **Retire** `.tow`/`towTokens` and
  the app `--bg/--cyan/--surface` by migrating consumers onto `--sb-*`; drive the `lint:colors`
  ratchet to 0 raw hex and eventually delete the legacy token blocks.
- Typography: **Rubik** (UI) + **JetBrains Mono** (`.data-mono` for numbers/dates/prices/scores).
  Retire Space Grotesk (`--font-display`).

### 4.2 Components — one each (in `design-system/`)
- **One wizard:** `WizardShell` + `SegmentedProgressBar` (blocks, **never** "Step X/Y") + `WizardFooter`
  (Back=Secondary right, Primary left; UrgentButton only for final/destructive). Retire the matching
  and onboarding-v2 shells + `NeonProgressTracker`.
- **One card:** `BentoCard` + `DashboardGrid` for every dashboard; retire `BentoTile`/legacy `BentoGrid`.
- **One state system:** `GlobalStateCard` for **all** loading/empty/error/success/locked (replace every
  bespoke empty/loading/error block, incl. `MatchingLoadingScreen` and dashboard inline states).
- **One nav:** `FloatingTopNavbar` (icon-only, tooltips, capsule) across all roles; retire `DashboardTabs`
  + parent/admin bespoke nav.
- **Buttons:** `PrimaryButton`/`SecondaryButton`/`GhostButton`/`UrgentButton` only.

### 4.3 Subject taxonomy + filtering contract (closes §1 gaps)
- Promote the catalog to a **governed, level-tagged DB taxonomy** (subject ↔ band), or at minimum a
  **single shared map** (one source for student + teacher; delete the duplicate).
- Define the filtering contract by **effective context**, resolved before the subject step:
  `account_type` (student/parent-child) → `education_path` (school vs academic) → for school:
  `grade_level` band; for academic: `institution → degree → year`. **Today only the band exists** —
  to satisfy "university CS ≠ humanities," academic context (institution/degree) must be added to the
  student model (currently absent) — flagged as a **schema decision**, not built here.
- Never fall back to the full union for a known band; off-band = empty + "choose level".

### 4.4 Adoption plan (phased; no new features)
1. **P-A Tokens:** migrate `.tow` (59) + app-legacy (13) consumers → `--sb-*`; baseline→0; delete legacy blocks.
2. **P-B Wizards:** teacher onboarding + student-onboarding innards/CTAs onto the one wizard + `WizardFooter`/buttons; retire 2 shells + `NeonProgressTracker`.
3. **P-C Dashboards:** all 4 onto `AppShell` + `FloatingTopNavbar` + `BentoCard`/`DashboardGrid`.
4. **P-D States:** route every empty/loading/error/success through `GlobalStateCard`.
5. **P-E Taxonomy:** single governed catalog + the effective-context filtering contract (+ schema decision for academic context).
- **Enforcement:** keep `lint:colors` (ratchet to 0); add a lightweight check/PR rule that screens import
  from `design-system/` (no `tow`/`--bg` in new code); keep `taxonomySync` until the catalog is unified.

---

## 5. Notes
- **No code changed.** Dev servers stopped; ports 3001/4000 released.
- Parent flow intentionally **not** audited for build here (next session), but Parent dashboard is
  included above as a drift data point (it's on app-legacy tokens with no shared grid/nav).
