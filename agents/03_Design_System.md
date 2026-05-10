# Design_System.md

## StudyBuddy.02 Design System

### Cyber Memphis Brutalism

StudyBuddy uses a hybrid design language combining:

* Modern Memphis energy
* Neo-Brutalist structure
* Cyber-professional operational UX
* Bento-based system architecture

The system should feel:

```text id="7f5m5e"
Fast, intelligent, tactile, operational, playful, structured, and confidently non-corporate.
```

This is NOT:

* generic SaaS UI
* educational pastel UI
* enterprise dashboard UI
* minimal Apple-style UI

This is:

```text id="5l7r8u"
An operational workspace for private education.
```

Based on the official design principles defined in the StudyBuddy design language 

---

# 1. Core Design Philosophy

## Product Identity

StudyBuddy is:

* not a tutor directory
* not a school ERP
* not a cold CRM

It is:

```text id="t6dy63"
An Operating System for private education.
```

The interface must reflect:

* operational flow
* fast actions
* low friction
* intelligent structure
* emotional energy

---

# 2. Experience Principles

| Principle            | Meaning                                              |
| -------------------- | ---------------------------------------------------- |
| Structured Chaos     | Organized layouts with controlled playful disruption |
| Friendly Efficiency  | Fast UX without emotional coldness                   |
| Brutal Clarity       | Obvious hierarchy and obvious actions                |
| Playful Intelligence | Smart but human                                      |
| Tactile Interfaces   | Interfaces should feel physical                      |
| Anti-Corporate       | Personality over sterile perfection                  |
| Operational Focus    | Productivity over decoration                         |

---

# 3. Global UX Philosophy

## Primary UX Rule

```text id="w8h0e5"
Never make the user search.
```

The system should:

* surface actions immediately
* reduce cognitive load
* minimize clicks
* eliminate dead screens
* prioritize operational continuity

---

## Anti-Hunting Principle

The user should never:

* browse endlessly
* search for hidden actions
* navigate deep trees
* decode unclear states

The system should proactively:

* suggest
* highlight
* surface
* prioritize

---

# 4. Layout Architecture

## Core Structure

The system uses:

* Bento architecture
* modular cards
* operational widgets
* layered dashboards
* asymmetric balance

---

## Layout Principles

Layouts must feel:

* alive
* modular
* fast
* operational
* intentional

Never:

* empty enterprise whitespace
* giant unused gaps
* spreadsheet UI
* sterile admin panels

---

## Grid System

### Desktop

* 12-column grid

### Tablet

* 8-column grid

### Mobile

* 4-column grid

---

# 5. Visual Language

## Structural Layer

Always maintain:

* clear hierarchy
* predictable spacing
* stable alignment
* readable density

---

## Decorative Layer

Allowed:

* circles
* triangles
* arrows
* stars
* stickers
* Memphis squiggles
* abstract geometry
* rotated shapes

Purpose:

* create rhythm
* guide the eye
* soften brutalism
* inject energy

---

## Decorative Rules

Decorations must NEVER:

* block readability
* compete with CTAs
* reduce accessibility
* create visual noise

---

# 6. Style Fusion

## Memphis Influence

Characteristics:

* optimistic
* colorful
* geometric
* layered
* youthful

---

## Neo-Brutalist Influence

Characteristics:

* thick borders
* hard shadows
* heavy typography
* tactile interactions
* raw UI surfaces
* asymmetrical balance

---

## Cyber-Professional Influence

Characteristics:

* operational dashboards
* command-center feeling
* high information clarity
* structured workflows
* modular systems

---

# 7. Color System

## Primary Brand Colors

| Token         | Value     |
| ------------- | --------- |
| SB Orange     | `#F26610` |
| SB Blue       | `#577DFF` |
| SB Light Blue | `#8BB7F4` |

---

## Accent Colors

| Token         | Value     |
| ------------- | --------- |
| Hot Red       | `#FF4D4D` |
| Vivid Yellow  | `#FFD93D` |
| Mint          | `#63E6BE` |
| Electric Cyan | `#3BC9DB` |
| Soft Violet   | `#B197FC` |

---

## Neutral Palette

| Token            | Value     |
| ---------------- | --------- |
| Background Cream | `#F8F5EF` |
| Pure Black       | `#111111` |
| Soft Black       | `#222222` |
| Border Gray      | `#D9D9D9` |
| White Surface    | `#FFFFFF` |

---

## Dark Mode

| Token            | Value     |
| ---------------- | --------- |
| Background       | `#111111` |
| Surface          | `#1A1A1A` |
| Elevated Surface | `#242424` |
| Primary Text     | `#FFFFFF` |
| Secondary Text   | `#B5B5B5` |

---

# 8. Typography System

## Primary Typeface

### Space Grotesk

Used for:

* headings
* buttons
* cards
* navigation
* dashboards
* labels

---

# Typography Rules

| Element        | Weight  |
| -------------- | ------- |
| Hero Titles    | 700-800 |
| Section Titles | 700     |
| Card Titles    | 600     |
| Body Text      | 400-500 |
| Labels         | 500-600 |

---

## Typography Philosophy

Typography must prioritize:

* readability
* hierarchy
* operational clarity
* density efficiency

Avoid:

* ultra-thin fonts
* luxury typography
* elegant editorial layouts
* oversized empty spacing

---

# 9. Borders & Shadows

## Border Rules

### Standard Border

```css id="9jndx6"
border: 4px solid #111111;
```

### Exceptions

| Component  | Border |
| ---------- | ------ |
| Inputs     | 3px    |
| Pills      | 2px    |
| Micro Tags | 2px    |

---

## Shadow Rules

### Standard Shadow

```css id="qztdhm"
box-shadow: 6px 6px 0px #111111;
```

Rules:

* no blur
* no opacity
* no soft glow
* hard offsets only

---

# 10. Radius System

| Token | Value |
| ----- | ----- |
| sm    | 12px  |
| md    | 20px  |
| lg    | 28px  |
| xl    | 36px  |

---

# 11. Spacing System

| Token | Value |
| ----- | ----- |
| xs    | 4px   |
| sm    | 8px   |
| md    | 16px  |
| lg    | 24px  |
| xl    | 32px  |
| 2xl   | 48px  |

---

# 12. Component Language

## Cards

Cards are the primary organizational structure.

Cards should feel:

* tactile
* layered
* operational
* modular

---

## Standard Card

```css id="3x9vte"
background: white;
border: 4px solid black;
border-radius: 24px;
box-shadow: 6px 6px 0 black;
```

---

# Buttons

## Primary Buttons

Characteristics:

* vibrant fill
* strong contrast
* thick borders
* heavy typography
* tactile feedback

---

## Hover State

```css id="nwd8ta"
transform: translate(-2px,-2px);
```

---

## Active State

```css id="boq3hp"
transform: translate(4px,4px);
box-shadow: 0px 0px 0px black;
```

---

# Inputs

Inputs must:

* feel large
* feel touch-friendly
* remain highly readable
* have clear active states

Avoid:

* tiny fields
* ghost inputs
* low-contrast placeholders

---

# Pills & Tags

Used for:

* lesson status
* availability
* urgency
* subjects
* online/offline
* payment states

Characteristics:

* compact
* bold
* high contrast
* readable at small scale

---

# 13. Motion System

## Motion Philosophy

Motion should feel:

* reactive
* physical
* fast
* tactile
* operational

Avoid:

* luxury transitions
* floating motion
* slow animations
* cinematic UI

---

# Motion Rules

## Hover

* slight translate
* subtle rotation
* tiny scale increase

---

## Card Entry

* spring motion
* slight bounce

---

## Notifications

* slide + pop

---

# 14. Dashboard Language

## Teacher Dashboard

Must feel:

* operational
* productive
* high-control
* financially aware
* system-oriented

Inspired by:

* command centers
* modular workstations
* productivity tools

---

## Parent Dashboard

Must feel:

* safe
* trustworthy
* organized
* transparent

---

## Student Dashboard

Must feel:

* lighter
* motivating
* optimistic
* focused

---

# 15. Interaction Design

## System Feedback Rules

Every action must feel:

* immediate
* visible
* responsive
* deterministic

---

# Examples

## Booking Flow

* instant feedback
* visible confirmation
* no ambiguous loading states

---

## Match Results

* energetic reveal
* strong visual hierarchy

---

## File Upload

* tactile drag/drop behavior
* immediate success state

---

# 16. Iconography

Icons should:

* use thick strokes
* have rounded geometry
* remain readable at small sizes
* feel modern and operational

Avoid:

* thin icons
* luxury icon packs
* over-detailed illustrations

---

# 17. Dashboard Architecture

Dashboards are composed of:

* hero cards
* operational blocks
* financial widgets
* quick actions
* alerts
* micro-panels

---

# Hero Card Rules

The primary operational card must:

* dominate hierarchy
* appear above the fold
* communicate immediate action state

---

# 18. Design Anti-Patterns

## Forbidden UI Patterns

Do NOT use:

* generic SaaS UI
* excessive glassmorphism
* blurry shadows
* ultra-minimal layouts
* tiny typography
* sterile whitespace
* corporate enterprise aesthetics
* over-soft interfaces

---

# 19. Frontend Implementation Rules

Recommended stack:

* Next.js
* React
* TailwindCSS
* Framer Motion
* Zustand
* CSS Variables

Aligned with StudyBuddy architecture and system requirements. 

---

# 20. Operational UI Rules

Operational information always overrides decoration.

If decoration conflicts with:

* clarity
* readability
* hierarchy
* speed

the decoration is removed.

---

# 21. Accessibility Rules

The system must maintain:

* high contrast
* readable font sizes
* keyboard navigation support
* touch-friendly targets
* visible focus states

Playfulness must NEVER reduce usability.

---

# 22. Final Design Principle

```text id="qfjgyd"
Organized Energy.
```

StudyBuddy should feel like:

* a smart operational workspace
* a modern educational OS
* structured chaos with purpose
* a system that moves fast without losing clarity

Not:

* a school management portal
* a boring CRM
* a cold enterprise dashboard
* a tutor listing website
