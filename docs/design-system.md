# StudyBuddy Design System v1

**One product. One visual language. Different roles, different content — same system.**
StudyBuddy must feel like a clean operational SaaS platform, not a collection of separate screens.

Design language: **Cyber-Professional / Bento / Glass / RTL-first / Fast / Clean / Operational.** Turquoise-first; roles differ by content, icons, structure and small badges — **never** by the primary product color.

This document is the **single source of truth** for the visual language. The canonical tokens are the `--sb-*` CSS variables (defined once in `apps/frontend/src/styles.css` `:root`) and their TS mirror `sbTokens` (`apps/frontend/src/design/tokens.ts`). Canonical components live in `apps/frontend/src/design-system/`. Visual sandbox: route `/design-system`.

> **Status:** v1 is adopted as canonical and being introduced **additively**. Three legacy token systems still exist and are **deprecated**: the app `:root` color vars (`--bg`, `--cyan`, …), the `.tow` scope + `towTokens`, and the Tailwind/Mantine color palettes. Screens migrate onto `--sb-*` incrementally (see **Migration** below). New code uses `--sb-*` only.

---

## 1. Color tokens (canonical)

```css
/* Canvas & Shell */     --sb-bg-canvas:#0B2B2A;  --sb-bg-depth:#175655;
                         --sb-navbar-bg:rgba(11,43,42,.75);  --sb-navbar-border:#3f7e76;
/* Glass / Bento */      --sb-glass-base:rgba(23,86,85,.40); --sb-glass-soft:rgba(63,126,118,.25);
                         --sb-border-cyber:#24747A; --sb-border-muted:#016c7c; --sb-hover-glow:rgba(0,246,255,.15);
/* Typography */         --sb-text-primary:#FAF9F6; --sb-text-primary-alt:#F5F5F0;
                         --sb-text-secondary:#A3C7C4; --sb-text-muted:#5A8F8A;
/* Actions & States */   --sb-active:#00F6FF; --sb-primary-cta:#4CE7E3; --sb-success:#A3E635;
                         --sb-error:#e22b57; --sb-warning:#fc6d17; --sb-locked:#1F2937;
/* Radius */             --sb-radius-card:16px; --sb-radius-button:8px; --sb-radius-small:8px;
/* Motion */             --sb-motion-fast:150ms; --sb-motion-base:200ms; --sb-motion-slow:300ms;
```

- Titles → `--sb-text-primary`; body → `--sb-text-secondary`; captions/timestamps → `--sb-text-muted`.
- `--sb-active` = active/focus/progress-completed. `--sb-primary-cta` (turquoise) = primary buttons.
- **Orange (`--sb-warning`) is reserved** for final/urgent/destructive-adjacent actions (emergency lesson, timer, final submission). **Never** a normal primary action.

## 2. Typography

- **Rubik** = primary UI font (headings/body/labels). **JetBrains Mono** = prices, counters, dates, match scores. Both loaded in `index.html`; exposed as `--sb-font-ui` / `--sb-font-mono` (and `sbTokens.fontUi` / `.fontMono`).

## 3. Radius

Bento cards & modals/drawers → 16px. Buttons, inputs, badges → 8px (or pill when needed).

## 4. App Shell — `AppShell`

All roles use the same shell: **no sidebar**, a fixed **floating top navbar**, centered max-width (1200px) content, dark cyber canvas, RTL-first.

### Floating Top Navbar — `FloatingTopNavbar`
`position:fixed`, top 1.5rem, width 85%, max-width 1200px, centered, glass (`--sb-navbar-bg` + blur 16px), cyber border, radius 16px. **RTL:** right = StudyBuddy logo (→ role dashboard); center = role tabs **icon-only** (active uses `--sb-active` + thin neon indicator); left = search/command palette, notifications, avatar. Icon-only with tooltips.

## 5. Bento cards — `BentoCard` / `DashboardGrid`
`.sb-card`: `--sb-glass-base` + `blur(12px)` + `1px solid --sb-border-cyber` + radius 16px. Hover (`.sb-card--hover`): `translateY(-1px)` + `0 0 12px --sb-hover-glow`. No heavy shadows, no flat white cards, no random per-page gradients, no per-role card systems. Cards change size/content, not visual DNA.

## 6. Buttons — `PrimaryButton` / `SecondaryButton` / `GhostButton` / `UrgentButton`
- **Primary:** `--sb-primary-cta` bg, `--sb-on-primary` (#0F1720) text, radius 8px. Hover: subtle glow + slight lift, no color jump.
- **Secondary:** text-only, no border/bg, muted; hover → off-white text + thin underline. (Back / previous step.)
- **Ghost:** transparent + `1px rgba(255,255,255,.1)` border; hover bg `rgba(255,255,255,.05)`. (Cancel / Reset / dismiss.)
- **Urgent:** `--sb-warning` — reserved per §1.

## 7. Wizard system — `WizardShell` + `SegmentedProgressBar` + `WizardFooter`
**One** unified container for every step flow (teacher onboarding, student matching, find-tutor, booking, any future flow). Fixed outer dims (`max-width:1200; min-height:650; max-height:850; padding:32; margin:0 auto`), centered, RTL, **no layout jump** — only the inner body changes. Skeleton: `[Header] [SegmentedProgressBar] [Body/Bento] [Footer: Back | Primary]`. Footer RTL: Back/Secondary on the right, Primary on the left.

### Progress bar — segments only
`SegmentedProgressBar`: width 100%, height 6px, gap 4px, segments = step count. Completed → `--sb-active`; current → `--sb-primary-cta` + neon glow; future → `rgba(15,23,32,.8)`. Fill 200ms, RTL-native. **No "Step X of Y" text — ever.**

## 8. Dashboards
All dashboards share shell, navbar, cards, typography, states, motion. **Only content hierarchy differs.** Core cards per role: **Student** — next lesson, quick chat, my teachers, pending requests, AI matches, tasks, activity. **Teacher** — next lesson, weekly calendar, wallet/ledger, new requests, students CRM, settings. **Parent** — child selector, pending action, child schedule, teacher updates, homework, find-teacher. **Admin** — KPIs, verification queue, disputes, user management, system alerts.

## 9. Global states — `GlobalStateCard`
One centered structure `[icon][title][description][CTA]`, inside a card or full-page. Variants: **loading** (turquoise spinner, no CTA), **success** (`--sb-success`), **empty** (CTA required when the user can act), **error** (`--sb-error`, retry CTA; 401 → "התחברי מחדש", 403 → "השלימי תהליך", 500 → "נסי שוב"), **locked** (`--sb-locked` charcoal overlay + muted turquoise + lock; CTA → the unlock action).

## 10. Motion
Medium. Allowed: hover lift, fade, RTL slide, segmented fill, drawer slide-from-right, card morph in a fixed container, button press. Avoid: playful/bouncing, long transitions, heavy page animations, inconsistent easing. Timings: `--sb-motion-fast/base/slow` = 150/200/300ms. Wizard transition: old `opacity:0; translateX(-15px)` → new `opacity:1; translateX(0)` (new enters from the right in RTL).

## 11. Drawers / Modals / Panels — `SideDrawer` / `DetailPanel`
- **SideDrawer:** opens from the right, keeps dashboard context, does not replace the page (quick approval, notification/message preview, light edits).
- **DetailPanel:** master–detail inside the dashboard workspace (CRM student, booking/lesson/admin details) — avoids page navigation.
- **Modal:** confirmations / destructive / small focused tasks only. **Never** for full workflows.

## 12. Role badges — `RoleBadge`
Small badge near the avatar/name; **secondary, micro-accent only — must not redefine the palette.** Student = turquoise + cap; Teacher = muted indigo + board; Parent = olive/green + shield; Admin = warning + control.

## 13. Component registry (`apps/frontend/src/design-system/`)
`AppShell` · `FloatingTopNavbar` · `BentoCard` · `DashboardGrid` · `WizardShell` · `SegmentedProgressBar` · `WizardFooter` · `PrimaryButton` · `SecondaryButton` · `GhostButton` · `UrgentButton` · `GlobalStateCard` · `RoleBadge` · `SideDrawer` · `DetailPanel`.

## 14. Do / Don't
**Do:** tokens only; Rubik + JetBrains Mono; RTL default; consistent cards/buttons; one navbar, one wizard, one state system. **Don't:** role-specific primary colors; sidebar navigation; mixed card styles; random gradients; different progress bars; per-role button logic; "Step X of Y"; heavy shadows; playful animations; **raw hex in components** (use `--sb-*`).

## 15. Navigation decision (resolved)
**v1 wins:** the product uses **one floating top navbar for all roles — no sidebar.** The previously-built student-dashboard sidebar (`features/studentDashboard/components/StudentDashboardLayout.tsx` + `StudentSidebar.tsx`) and the teacher top-tabs are **superseded** and replaced by `FloatingTopNavbar` in migration phase **P2**. They keep working until then.

## 16. Migration map (old → `--sb-*`)

| Legacy | → Canonical |
|---|---|
| `towTokens.bg` `#175655` / `--tow-bg` | `--sb-bg-depth` (canvas → `--sb-bg-canvas` `#0B2B2A`) |
| `towTokens.card` `#3f7e76` | `--sb-glass-base` / `--sb-navbar-border` |
| `towTokens.ink` `#016c7c` | `--sb-border-muted` |
| `towTokens.neon` `#00f6ff` / `--tow-neon` | `--sb-active` |
| `towTokens.orange` `#fc6d17` (current primary CTA) | **primary CTA → `--sb-primary-cta` (turquoise)**; orange kept only as `--sb-warning` |
| `towTokens.success` `#bbe341` / `--tow-success` | `--sb-success` `#A3E635` |
| `towTokens.alert` `#e22b57` | `--sb-error` |
| app `:root` `--bg`/`--surface`/`--cyan`/`--text*` | `--sb-bg-canvas`/`--sb-glass-base`/`--sb-active`/`--sb-text-*` |
| Tailwind `studybuddy.*` / Mantine colors | `--sb-*` |
| `WizardProgress`, `NeonProgressTracker` (step text) | `SegmentedProgressBar` (no step text) |
| matching `WizardShell` + onboarding-v2 `WizardShell` | one `WizardShell` |

## 17. Phased migration (foundation ships first; screens later)
- **P0 (done):** tokens + components + fonts + this doc + CLAUDE.md + color guard. Additive — no screen changed.
- **P1 — Wizards first** (core complaint; Find Tutor is next): matching wizard + teacher onboarding + find-tutor → `WizardShell` + `SegmentedProgressBar` + `WizardFooter` + `--sb`. Retire the 2nd `WizardShell` + both step-text bars.
- **P2 — Shell + navbar:** `AppShell` + `FloatingTopNavbar` across roles; remove the student sidebar + teacher tabs.
- **P3 — Dashboards:** onto `BentoCard`/`DashboardGrid`/`GlobalStateCard`/`RoleBadge`.
- **P4 — Booking/results/state screens; delete the legacy token systems** and drive the raw-hex baseline toward zero.

## 18. Enforcement
`scripts/check-no-raw-hex.mjs` (npm `lint:colors`, in CI) is a **ratchet**: the existing raw-hex count may only **decrease**, and `src/design-system/` must stay at **zero** raw hex. Token/theme-definition files (`styles.css`, `design/tokens.ts`, `tailwind.config.ts`, `theme/mantineTheme.ts`) are exempt — that's where colors are defined.
