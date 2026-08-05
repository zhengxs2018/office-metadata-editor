---
version: alpha
name: office-metadata-editor
website: 'https://github.com/zhengxs2018/office-metadata-editor'
description: A design specification for a LOCAL desktop tool built for a specific audience — enterprise compliance reviewers who inspect, compare, batch-process, and privacy-clean metadata in Office documents on their own machines. Not a SaaS, not a website; a native Tauri 2 app running offline on macOS and Windows 10/11. The interface follows Apple's restraint — single Action Blue accent, chrome that recedes so the document speaks — adapted to a desktop shell where the title bar must behave on both platforms (traffic-lights left on macOS, close button right on Windows).

seo:
  title: 'Office Metadata Editor Design System — Action Blue, Inter, and desktop components'
  metaDescription: "office-metadata-editor design system as a DESIGN.md file. Single Action Blue #0066cc accent, Inter type, Tauri 2 desktop chrome, cross-platform title bar rules. For React, Tauri, and AI tools."
  highlights:
    - 'Single interactive color — Action Blue #0066cc is every link, every primary CTA, every focus signal; no secondary brand accent by default'
    - 'Desktop chrome first — Tauri 2 shell with macOS traffic-lights (left) and Windows control buttons (right); title bar never overlaps system controls'
    - 'Tailwind 4 + OKLCH tokens — all colors flow from @theme variables; no hardcoded hex in components'
    - 'Body at 17px — Inter carries Apple-tight negative letter-spacing on display sizes for the signature cadence'
    - 'Exactly one drop-shadow — reserved for product/imagery previews; chrome stays flat'
  tags:
    - 'Desktop Application'
    - 'Compliance Tooling'
  lastUpdated: '2026-08-05'
  author:
    name: 'zhengxs2018'
    url: 'https://github.com/zhengxs2018'
  opening: |
    office-metadata-editor is a desktop tool for inspecting, comparing, batch-processing, and privacy-cleaning metadata in enterprise Office documents (.docx/.xlsx/.pptx and legacy formats). It is built on Tauri 2 with a React 19 + Tailwind 4 + shadcn/ui (neutral · radix-nova) frontend. The design language borrows Apple's discipline — a single quiet Action Blue accent, edge-to-edge section rhythm, chrome that recedes so the document can speak, and exactly one drop-shadow reserved for imagery — but re-expresses it for a desktop compliance workflow that runs on both macOS and Windows 10/11.

    This DESIGN.md captures that adapted system: 24+ color tokens covering the one signature blue, the neutral surface ladder, and the three semantic accents (destructive / success / warning) needed for compliance states; typography entirely on Inter with negative letter-spacing at display sizes; radius tokens that split between zero (full-bleed surfaces) and pill (every interactive element); and component definitions for the title bar, KPI strip, drop zone, entry cards, and the comparison panes.

    Drop the file into Claude, Cursor, GitHub Copilot, or any AI assistant that reads structured design tokens. The agent will produce React components and Tailwind classes that match the tool's restrained, single-accent voice — not a generic SaaS template.
  related:
    - href: 'https://github.com/google-labs-code/design.md'
      title: 'The DESIGN.md specification'
      description: "Google Labs' open spec for machine-readable design system files — the format this page is built on."
    - href: 'https://ui.shadcn.com'
      title: 'shadcn/ui'
      description: 'The base UI primitives (neutral · radix-nova) used by this project.'
  questions:
    - id: 'primary-color'
      title: "What is office-metadata-editor's primary brand color?"
      answer: 'Action Blue #0066cc — the single interactive color across the system. Every link, every primary CTA, every focus signal uses it. On dark surfaces it shifts to a brighter sibling at #2997ff (Sky Link Blue) because standard Action Blue would disappear against the near-black tile. The focus-ring variant nudges to #0071e3.'
    - id: 'typography'
      title: "What typography does the project use, and what is the fallback?"
      answer: "Inter (Google Fonts, variable) is the primary UI face, replacing SF Pro for cross-platform consistency. JetBrains Mono carries code, version numbers, and hashes. For display sizes, nudge letter-spacing down by -0.01em to re-create the Apple-tight headline feel."
    - id: 'body-17px'
      title: 'Why does the project use 17px body text instead of 16px?'
      answer: "Inherited from Apple's reading pace: SF Pro Text / Inter at 17px / 400 / 1.47 line-height with -0.374px letter-spacing reads as 'a document, not a SaaS marketing page.' It is small enough to feel professional, large enough to feel slowed-down."
    - id: 'cross-platform-titlebar'
      title: 'How does the title bar behave across macOS and Windows?'
      answer: 'macOS keeps system traffic-lights on the LEFT — the app reserves pl-[72px] on the left. Windows 10/11 keeps control buttons (min/max/close, close at far right) on the RIGHT — the app reserves pr-[140px] on the right. App UI never enters either reserved zone; only the middle region is used. Title bar height is a uniform 32px.'
    - id: 'shadow-philosophy'
      title: "What's the shadow philosophy?"
      answer: 'Exactly one shadow exists: rgba(0,0,0,0.22) 3px 5px 30px, applied only to document/image previews resting on a surface. No shadow on cards, buttons, or text. Elevation comes from surface-color change (light ↔ dark) and border-color shifts on hover.'
    - id: 'use-in-project'
      title: 'Can I use this DESIGN.md to build the app UI?'
      answer: "Yes — feed it to Claude, Cursor, or GitHub Copilot. The agent will reproduce the restraint (single accent, chrome receding, museum-grade whitespace) rather than a generic theme. Every color, type style, radius, and spacing value is a quoted token ready to paste into Tailwind @theme, CSS variables, or the component library."

colors:
  primary: '#0066cc'
  primary-focus: '#0071e3'
  primary-on-dark: '#2997ff'
  ink: '#1d1d1f'
  body: '#1d1d1f'
  body-on-dark: '#ffffff'
  body-muted: '#cccccc'
  ink-muted-80: '#333333'
  ink-muted-48: '#7a7a7a'
  divider-soft: '#f0f0f0'
  hairline: '#e0e0e0'
  canvas: '#ffffff'
  canvas-parchment: '#f5f5f7'
  surface-pearl: '#fafafc'
  surface-tile-1: '#272729'
  surface-tile-2: '#2a2a2c'
  surface-tile-3: '#252527'
  surface-black: '#000000'
  surface-chip-translucent: '#d2d2d7'
  on-primary: '#ffffff'
  on-dark: '#ffffff'
  # --- Desktop compliance extensions (Apple single-accent + semantic states) ---
  destructive: '#d70015'
  destructive-on-dark: '#ff453a'
  success: '#248a3d'
  success-on-dark: '#30d158'
  warning: '#b25000'
  warning-on-dark: '#ff9f0a'

typography:
  hero-display:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: -0.28px
  display-lg:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  display-md:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.47
    letterSpacing: -0.374px
  lead:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: 0.196px
  lead-airy:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.5
    letterSpacing: 0
  tagline:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.19
    letterSpacing: 0.231px
  body-strong:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: -0.374px
  body:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: -0.374px
  dense-link:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 17px
    fontWeight: 400
    lineHeight: 2.41
    letterSpacing: 0
  caption:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.224px
  caption-strong:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: -0.224px
  button-large:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.0
    letterSpacing: 0
  button-utility:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: -0.224px
  fine-print:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.12px
  micro-legal:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.08px
  nav-link:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.12px
  kpi-value:
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.374px
    fontVariantNumeric: 'tabular-nums'

rounded:
  none: 0px
  xs: 5px
  sm: 8px
  md: 11px
  lg: 18px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 17px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  title-bar:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.nav-link}'
    height: 32px
    paddingLeft: 72px
    paddingRight: 140px
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: 11px 22px
  button-primary-focus:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
  button-primary-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    rounded: '{rounded.pill}'
  button-secondary-pill:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.primary}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: 11px 22px
  button-destructive:
    backgroundColor: '{colors.destructive}'
    textColor: '{colors.on-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: 11px 22px
  button-dark-utility:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.on-dark}'
    typography: '{typography.button-utility}'
    rounded: '{rounded.sm}'
    padding: 8px 15px
  button-pearl-capsule:
    backgroundColor: '{colors.surface-pearl}'
    textColor: '{colors.ink-muted-80}'
    typography: '{typography.caption}'
    rounded: '{rounded.md}'
    padding: 8px 14px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.ink}'
    typography: '{typography.button-utility}'
    rounded: '{rounded.sm}'
    padding: 8px 12px
  text-link:
    backgroundColor: transparent
    textColor: '{colors.primary}'
    typography: '{typography.body}'
  text-link-on-dark:
    backgroundColor: transparent
    textColor: '{colors.primary-on-dark}'
    typography: '{typography.body}'
  kpi-card:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.kpi-value}'
    rounded: '{rounded.lg}'
    padding: 24px
  entry-card:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body-strong}'
    rounded: '{rounded.lg}'
    padding: 24px
  drop-zone:
    backgroundColor: '{colors.surface-pearl}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 40px
  surface-panel:
    backgroundColor: '{colors.canvas-parchment}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.lg}'
    padding: 24px
  global-nav:
    backgroundColor: '{colors.surface-black}'
    textColor: '{colors.on-dark}'
    typography: '{typography.nav-link}'
    height: 44px
  search-input:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    typography: '{typography.body}'
    rounded: '{rounded.pill}'
    padding: 12px 20px
    height: 44px
  status-bar:
    backgroundColor: '{colors.canvas-parchment}'
    textColor: '{colors.ink-muted-80}'
    typography: '{typography.fine-print}'
    height: 28px
    padding: 4px 16px
---

## Overview

office-metadata-editor is a **desktop-first compliance & metadata tool** for enterprise Office documents. Every surface is a stack of edge-to-edge panels — alternating white / parchment ↔ near-black, each centered on a clear headline, a one-line tagline, a single blue pill action, and the document itself. Nothing competes with the data. Typography is confident but quiet; interaction is a single, quiet blue. Density is moderate — desktop tooling needs more information per viewport than a marketing page, but the restraint stays.

The shell is **Tauri 2 + React 19 + Tailwind 4 + shadcn/ui (neutral · radix-nova)**. The design language follows Apple's discipline (single accent, chrome receding, exactly one drop-shadow for imagery) but is re-expressed for a desktop compliance workflow that must behave identically on **macOS (traffic-lights left)** and **Windows 10/11 (close button right)**.

**Key Characteristics:**

- Single blue accent (`{colors.primary}` — #0066cc) carries every interactive element. No secondary brand accent by default.
- Three semantic extensions for compliance states: `destructive` (red, delete / danger), `success` (green, passed / cleaned), `warning` (orange, risk / comparison pane). These are **state colors, not brand accents** — they never replace Action Blue for navigation/primary actions.
- Desktop chrome first: the `title-bar` reserves system control zones on both platforms; app UI never enters them.
- Tailwind 4 + OKLCH tokens: all colors flow from `@theme` variables; no hardcoded hex in components.
- Two button grammars: blue pill primary CTAs (`{rounded.pill}`) and compact utility rects (`{rounded.sm}`).
- Inter carries negative letter-spacing at display sizes for the signature "Apple tight" headline feel. Body runs at 17px.
- Whisper-soft elevation used only when a document/image preview needs to breathe — exactly one drop-shadow in the system.
- Single-column desktop layout (`max-w-7xl`) by default; comparison page splits into two panes.

## Colors

> **Surfaces analyzed:** home page, compare page, editor page, batch page, history, preferences. The color system is identical across all surfaces; the light/dark surface mix changes per theme.

### Brand & Accent

- **Action Blue** (`{colors.primary}` — #0066cc): The single brand-level interactive color. All text links, all blue pill CTAs ("开始对比", "选择文件"), and the focus ring root. This is the quiet but universal "click me" signal. Press state shifts to a slightly darker variant via the active scale transform rather than a hex change.
- **Focus Blue** (`{colors.primary-focus}` — #0071e3): A marginally brighter sibling of Action Blue, reserved for the keyboard focus ring on buttons (`outline: 2px solid`).
- **Sky Link Blue** (`{colors.primary-on-dark}` — #2997ff): A brighter blue used on dark surfaces (comparison pane, dark theme) for in-copy links and inline callouts, where Action Blue would disappear against the tile background.

### Semantic State (Compliance Extensions)

- **Destructive** (`{colors.destructive}` — #d70015): Delete, clear, dangerous operations. Maps to shadcn `destructive`. On dark surfaces use `{colors.destructive-on-dark}` (#ff453a).
- **Success** (`{colors.success}` — #248a3d): Passed checks, cleaned documents, "今日处理 / 清洗文档" KPI. On dark surfaces use `{colors.success-on-dark}` (#30d158).
- **Warning** (`{colors.warning}` — #b25000): Risk counts, the comparison (对比方) pane theme. On dark surfaces use `{colors.warning-on-dark}` (#ff9f0a).

> These three are **state semantics**, not a second brand palette. Primary navigation and primary CTAs stay Action Blue. Never introduce additional brand hues.

### Surface

- **Pure White** (`{colors.canvas}` — #ffffff): The dominant canvas. Content, cards, drop zones, editor panels.
- **Parchment** (`{colors.canvas-parchment}` — #f5f5f7): The signature off-white. Used for alternating light panels, status bar, sidebar regions. Just different enough from white to create rhythm.
- **Pearl** (`{colors.surface-pearl}` — #fafafc): A near-white used as the fill for drop zones and secondary "ghost" surfaces — lighter than parchment so it reads as a distinct zone.
- **Near-Black Tile 1** (`{colors.surface-tile-1}` — #272729): The primary dark surface (comparison pane, dark theme chrome).
- **Near-Black Tile 2** (`{colors.surface-tile-2}` — #2a2a2c): A micro-step lighter — used where a dark tile sits directly above or below Tile 1.
- **Near-Black Tile 3** (`{colors.surface-tile-3}` — #252527): A micro-step darker — used at the bottom of a stack or embedded frames.
- **Pure Black** (`{colors.surface-black}` — #000000): Reserved for true void — global nav bar background, edge-to-edge overlays.
- **Translucent Chip Gray** (`{colors.surface-chip-translucent}` — #d2d2d7): The base hex of circular control buttons over surfaces. In production, applied at ~64% alpha as `rgba(210, 210, 215, 0.64)`.

### Text

- **Near-Black Ink** (`{colors.ink}` — #1d1d1f): The voice of every headline, every body paragraph, and the dark utility button's fill.
- **Body** (`{colors.body}` — #1d1d1f): Same hex as ink — one near-black tone for all text on light surfaces.
- **Body On Dark** (`{colors.body-on-dark}` — #ffffff): All text on dark tiles and on the global nav bar.
- **Body Muted** (`{colors.body-muted}` — #cccccc): Secondary copy on dark tiles where pure white would be too loud.
- **Ink Muted 80** (`{colors.ink-muted-80}` — #333333): Body text on the white Pearl surface — slightly softer than pure black.
- **Ink Muted 48** (`{colors.ink-muted-48}` — #7a7a7a): Disabled button text and legal fine-print.

### Hairlines & Borders

- **Divider Soft** (`{colors.divider-soft}` — #f0f0f0): The "border" tone on secondary buttons — functions as a ring shadow rather than a hard line. In production, often applied as `rgba(0, 0, 0, 0.04)`.
- **Hairline** (`{colors.hairline}` — #e0e0e0): The 1px hairline border on cards and panels.

### Brand Gradient

**No decorative gradients.** Atmosphere comes from surface-color change, not CSS gradients. The exception is the home DropZone, which uses a low-alpha OKLCH wash (`bg-linear-to-br from-primary/8 via-primary/3 to-transparent`) for a subtle "drop here" affordance — this is the only gradient token in the system and it is purely functional.

## Typography

### Font Family

- **Primary UI**: `Inter, system-ui, -apple-system, sans-serif` — the open-source substitute for SF Pro, giving cross-platform consistency. Used for all display and body text.
- **Mono**: `JetBrains Mono, ui-monospace, monospace` — version numbers (`v2.4.0`), hashes, file paths, metadata values.
- **OpenType features**: `font-variant-numeric: tabular-nums` is enabled on all KPI values and counts to prevent width jitter.

### Hierarchy

| Token                         | Size | Weight | Line Height | Letter Spacing | Use                                                    |
| ----------------------------- | ---- | ------ | ----------- | -------------- | ------------------------------------------------------ |
| `{typography.hero-display}`   | 56px | 600    | 1.07        | -0.28px        | Hero headline; the signature "Apple tight" tracking    |
| `{typography.display-lg}`     | 40px | 600    | 1.10        | 0              | Page headlines                                        |
| `{typography.display-md}`     | 34px | 600    | 1.47        | -0.374px       | Section heads                                         |
| `{typography.lead}`           | 28px | 400    | 1.14        | 0.196px        | Page subcopy                                          |
| `{typography.lead-airy}`      | 24px | 300    | 1.5         | 0              | Airy moments (rare)                                   |
| `{typography.tagline}`        | 21px | 600    | 1.19        | 0.231px        | Sub-section tagline                                   |
| `{typography.body-strong}`    | 17px | 600    | 1.24        | -0.374px       | Inline strong emphasis                                |
| `{typography.body}`           | 17px | 400    | 1.47        | -0.374px       | Default paragraph                                     |
| `{typography.kpi-value}`      | 30px | 600    | 1.2         | -0.374px       | KPI metric numbers (tabular-nums)                     |
| `{typography.dense-link}`     | 17px | 400    | 2.41        | 0              | Footer / dense link lists                             |
| `{typography.caption}`        | 14px | 400    | 1.43        | -0.224px       | Secondary captions, button text                       |
| `{typography.caption-strong}` | 14px | 600    | 1.29        | -0.224px       | Emphasized captions                                   |
| `{typography.button-large}`   | 18px | 300    | 1.0         | 0              | Store/large hero CTAs (rare weight 300)               |
| `{typography.button-utility}` | 14px | 400    | 1.29        | -0.224px       | Utility/nav button labels                             |
| `{typography.fine-print}`     | 12px | 400    | 1.0         | -0.12px        | Fine-print, status bar                                |
| `{typography.micro-legal}`    | 10px | 400    | 1.3         | -0.08px        | Micro legal disclaimers                               |
| `{typography.nav-link}`       | 12px | 400    | 1.0         | -0.12px        | Title bar / global nav menu items                     |

### Principles

- **Negative letter-spacing at display sizes.** Every headline at 17px and up carries a slight tracking tighten (`-0.12 → -0.374px`). Never used at 12px or below.
- **Body copy at 17px, not 16px.** The extra pixel gives the "reading, not scanning" pace.
- **Weight 300 is real and rare.** Used deliberately on a handful of large-size reads (`{typography.button-large}` at 18px/300, `{typography.lead-airy}` at 24px/300).
- **Weight 600, not 700, for headlines.** Mid-weight readings always use 600.
- **Line-height is context-specific.** Display sizes use 1.07–1.19 (tight). Body uses 1.47.
- **Weight 500 is deliberately absent.** The ladder is 300 / 400 / 600 / 700. Apple's discipline; do not add 500.
- **Mono for data.** Versions, hashes, paths, and metadata values use JetBrains Mono with `tabular-nums`.

### Note on Font Substitutes

Inter is already the project's primary face. For display sizes, nudge `letter-spacing` down by `-0.01em` to re-create the Apple-tight feel; Inter's default tracking runs slightly wider than SF Pro. For body text, tighten line-height by `0.03` (from 1.47 → 1.44) only if Inter's taller x-height feels loose.

## Layout

### Spacing System

- **Base unit:** 8px. Structural layout snaps to 8/12/16/20/24.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 17px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section vertical padding:** `{spacing.xl}` (32px) inside desktop panels; full pages use `py-10`.
- **Card padding:** `{spacing.lg}` (24px) inside cards and panels.
- **Button padding:** 8–11px vertical, 15–22px horizontal.

### Grid & Container

- **Max content width:** `max-w-7xl` (~1280px) on single-column pages; full-bleed for the title bar and status bar.
- **Column patterns:** 3-column KPI strip and entry-card grid on home; 2-column side-by-side panes on the compare page; single-column centered stack on editor/batch/history/preferences.
- **Gutters:** 16–24px between cards in a grid (`gap-4` / `gap-6`).

### Whitespace Philosophy

Whitespace is the data's pedestal. Each panel begins with at least 24–32px of air above its headline and 24px below. Document previews are never crowded; the nearest content to a preview is at least 24px away. Density is higher than a marketing page (this is a tool) but restraint stays — no decorative chrome.

### Cross-Platform Title Bar (Hard Rule)

> **macOS + Windows 10/11 + Linux.** System window controls sit in different corners; the app must never overlap them.

- **macOS**: system traffic-lights fixed at **top-left**. The `title-bar` reserves `pl-[72px]` (≈ 3 buttons + spacing) so the app logo/breadcrumb never collides with the red-yellow-green cluster.
- **Windows / Linux**: control buttons fixed at **top-right** (Windows 10: `min` / `max` / `close`, close at far right; Linux varies). The `title-bar` reserves `pr-[140px]` so `ThemeSwitch` / action buttons never sit under the system close button.
- **Middle-only rule**: app UI (logo, breadcrumb, controls, ThemeSwitch) lives only in the middle region between the two reserved zones. The title bar uses `flex justify-between` with `flex-1` absorbing the middle gap.
- **Height**: uniform `32px` (`WINDOW_CHROME_HEIGHT`), neutral gray in both light/dark — never pure black, never following the system button chrome style.
- **Drag**: root node carries `data-tauri-drag-region`; all buttons/dropdowns must be exempted so clicks don't trigger window drag.
- **Prohibited**: placing any app UI inside `pl-[72px]` (macOS) or `pr-[140px]` (Windows); assuming "all platforms put buttons on the left"; using `position: fixed` over the system control zone.

## Elevation & Depth

| Level          | Treatment                                   | Use                                                                         |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| Flat           | No shadow, no border                        | Title bar, status bar, body sections, full-bleed panels                    |
| Soft hairline  | 1px `rgba(0, 0, 0, 0.08)` border            | Cards, panels, drop zone frame                                              |
| Backdrop blur  | `backdrop-filter: blur(N)` on Parchment 80% | Sidebar / sticky bars (future)                                              |
| Product shadow | `rgba(0, 0, 0, 0.22) 3px 5px 30px 0`        | Document/image previews resting on a surface (the only true "shadow")       |

**Shadow philosophy.** Exactly one drop-shadow, applied only to document/image previews — never to cards, buttons, or text. Hover elevation comes from **border-color change** (e.g., `border-primary/35` → `border-primary/60`), not shadow lift.

### Decorative Depth

- **Surface alternation** (white ↔ parchment ↔ near-black) creates rhythm without borders or shadows — the color change itself is the divider.
- **Backdrop-filter blur** on sidebar / sticky bars creates a "floating over content" effect that's functional, not decorative.
- **OKLCH drop-zone wash** is the only gradient, purely functional for the "drop here" affordance.

## Shapes

### Border Radius Scale

| Token            | Value        | Use                                                                      |
| ---------------- | ------------ | ------------------------------------------------------------------------ |
| `{rounded.none}` | 0px          | Full-bleed panels, title bar (no corner rounding)                        |
| `{rounded.xs}`   | 5px          | Inline links when styled as subtle chips (rare)                          |
| `{rounded.sm}`   | 8px          | Dark utility buttons, drop zone inner imagery, compact controls          |
| `{rounded.md}`   | 11px         | Pearl capsule buttons                                                    |
| `{rounded.lg}`   | 18px         | Cards, panels, drop zone, entry cards                                   |
| `{rounded.pill}` | 9999px       | Primary blue pill CTAs, search input, the signature Apple pill           |
| `{rounded.full}` | 9999px / 50% | Circular control chips, status dots                                      |

### Photography Geometry

- **Document previews**: rectangular, rest on a surface panel and pick up the system product-shadow. Lazy-loaded.
- **No rounded imagery in full-bleed panels** — panels are rectangular and edge-to-edge; rounding appears only on inline card imagery.

## Components

### Title Bar & Chrome

**`title-bar`** — Persistent, thin application bar pinned to the top of every window. Background `{colors.canvas}`, height 32px, text `{colors.ink}` in `{typography.nav-link}` (12px / 400 / -0.12px). Left: app logo + breadcrumb (starts at `pl-[72px]` on macOS). Right: platform controls + `{component.button-ghost}` ThemeSwitch (ends before `pr-[140px]` on Windows). Root carries `data-tauri-drag-region`.

**`global-nav`** — Optional top nav (future sidebar). Background `{colors.surface-black}`, height 44px, text `{colors.on-dark}` in `{typography.nav-link}`.

**`status-bar`** — Bottom bar. Background `{colors.canvas-parchment}`, height 28px, text `{colors.ink-muted-80}` in `{typography.fine-print}`. Left: sync/connection state; right: version number (`v2.4.0`) + check-for-updates.

### Buttons

**`button-primary`** — The signature action. Background `{colors.primary}` (Action Blue #0066cc), text `{colors.on-primary}` in `{typography.body}` (17px / 400), rounded `{rounded.pill}`, padding 11px × 22px. The full-pill radius IS the brand action signal.

- Active state: `transform: scale(0.95)` (system-wide micro-interaction).
- Focus state: 2px solid `{colors.primary-focus}` outline.

**`button-secondary-pill`** — Second CTA when two pills appear together. Transparent bg, text `{colors.primary}`, 1px solid `{colors.primary}` border, rounded `{rounded.pill}`, padding 11px × 22px.

**`button-destructive`** — Delete / clear / danger. Background `{colors.destructive}` (#d70015), text `{colors.on-primary}`, rounded `{rounded.pill}`, padding 11px × 22px.

**`button-dark-utility`** — Title-bar / nav actions. Background `{colors.ink}` (#1d1d1f), text `{colors.on-dark}` in `{typography.button-utility}` (14px), rounded `{rounded.sm}` (8px), padding 8px × 15px.

**`button-pearl-capsule`** — Secondary surface button. Background `{colors.surface-pearl}` (#fafafc), text `{colors.ink-muted-80}`, 3px solid `{colors.divider-soft}` border, rounded `{rounded.md}` (11px), padding 8px × 14px.

**`button-ghost`** — Toolbar icon buttons. Transparent bg, text `{colors.ink}`, rounded `{rounded.sm}`, padding 8px × 12px. Used for ThemeSwitch and pane toggles.

**`text-link`** — Inline body links in `{colors.primary}` (Action Blue).

**`text-link-on-dark`** — Inline links on dark tiles in `{colors.primary-on-dark}` (Sky Link Blue #2997ff).

### Cards & Containers

**`kpi-card`** — Home KPI metric. Background `{colors.canvas}`, 1px solid `{colors.hairline}`, rounded `{rounded.lg}` (18px), padding `{spacing.lg}` (24px). Label in `{typography.caption}` (muted) above value in `{typography.kpi-value}` (30px / 600 / tabular-nums). Tone variants: `default` (ink), `danger` (destructive), `success` (success).

**`entry-card`** — Home function entry (对比视图 / 批量提取 / 隐私清洗). Background `{colors.canvas}`, 1px solid `{colors.hairline}`, rounded `{rounded.lg}` (18px), padding `{spacing.lg}` (24px). Structure: left color tile (lucide icon) + title + description + corner badge (核心 / 高效 / 安全) + primary action link. Tone variants: `orange` / `purple` / `teal` (decorative only, not brand accents). Hover: border-color deepens one step, **no shadow lift**.

**`drop-zone`** — Primary file drop area. Background `{colors.surface-pearl}` with OKLCH wash (`bg-linear-to-br from-primary/8 via-primary/3 to-transparent`), 1px dashed `{colors.primary}/35` border (hover → `/60`), rounded `{rounded.lg}` (18px), padding 40px. Center: Word/Excel/PowerPoint lucide icon stack + "拖拽文件或文件夹到此处" + format line + `{component.button-primary}` "选择文件…". Dashed border is the only "frame" — no shadow.

**`surface-panel`** — Generic content panel. Background `{colors.canvas-parchment}`, rounded `{rounded.lg}`, padding `{spacing.lg}`. Used for comparison panes and editor sections.

**`search-input`** — Pane / sidebar search. Background `{colors.canvas}`, text `{colors.ink}` in `{typography.body}` (17px), 1px solid `rgba(0,0,0,0.08)`, rounded `{rounded.pill}`, padding 12px × 20px, height 44px. Leading search glyph at 14px, muted.

### Comparison Panes (待实现 / To Implement)

**`baseline-pane`** — Left comparison column. Theme `{colors.primary}` (blue). DropZone border `border-primary/40`, button `{component.button-primary}` "选择文件夹", secondary link "从 iCloud 云盘导入". Footer note: "提示：基准方通常为招标方或历史中标标方文件".

**`comparison-pane`** — Right comparison column. Theme `{colors.warning}` (orange). DropZone border `border-warning/40`, button `{component.button-secondary-pill}` with warning text, secondary link "从最近项目选择". Footer note: "提示：对比方为本次参与投标的拟建企业文件".

**Bridge** — A circular icon button (`{rounded.full}`, lucide `ArrowLeftRight`) centered between the two panes as the "对比" primary action. Absolute-positioned on desktop, falls back to a bar button on narrow screens.

## Do's and Don'ts

### Do

- Use `{colors.primary}` (Action Blue #0066cc) for every primary interactive element — links, pill CTAs, focus signals — and nothing else by default.
- Set headlines in `{typography.hero-display}` or `{typography.display-lg}` with negative letter-spacing (`-0.28 → -0.374px`) for the "Apple tight" cadence.
- Run body copy at `{typography.body}` (17px / 400 / 1.47 / -0.374px) — not 16px.
- Use `destructive` / `success` / `warning` **only** for state semantics (delete / pass / risk), never as navigation accents.
- Reserve `{rounded.pill}` for the primary blue CTA and any element that should read as an "action" (search input, sticky CTA).
- Apply the single product-shadow (`rgba(0, 0, 0, 0.22) 3px 5px 30px`) only to document/image previews resting on a surface.
- Use `transform: scale(0.95)` as the active/press state on every button.
- Keep the title bar at 32px and respect the platform reserved zones (`pl-[72px]` macOS / `pr-[140px]` Windows).
- Route all colors through Tailwind `@theme` OKLCH variables; never hardcode hex in components.

### Don't

- Don't introduce a second brand accent color; every "click me" signal is `{colors.primary}` (Action Blue).
- Don't add shadows to cards, buttons, or text — shadow is reserved for document imagery. Hover uses border-color change.
- Don't use gradients as decorative backgrounds; the only gradient is the functional drop-zone wash.
- Don't set body copy at weight 500 — the ladder is 300 / 400 / 600 / 700.
- Don't round full-bleed panels — panels are rectangular; the color change is the divider.
- Don't tighten body line-height below 1.47.
- Don't mix radii grammars — `{rounded.sm}` for compact utility, `{rounded.lg}` for cards/panels, `{rounded.pill}` for pills, nothing in between (except the rare `{rounded.md}` Pearl Button).
- Don't place app UI inside the title-bar reserved zones (`pl-[72px]` macOS / `pr-[140px]` Windows).
- Don't modify shadcn-generated `src/components/ui/*` files; extensions go in `src/components/om/*`.
- Don't inline `<svg>` in React components — all icons come from `lucide-react`.

## Responsive Behavior

### Breakpoints

| Name             | Width       | Key Changes                                                                          |
| ---------------- | ----------- | ------------------------------------------------------------------------------------ |
| Small phone      | ≤ 419px     | Single-column; hero typography drops to 28px                                         |
| Phone            | 420–640px   | Single-column stack; hero h1 drops to 34px                                           |
| Tablet portrait  | 641–833px   | Comparison panes stack to 1-column; bridge becomes bar button                        |
| Tablet landscape | 834–1023px  | Comparison panes 2-column; KPI strip 3-column                                        |
| Small desktop    | 1024–1280px | Full layout; `max-w-7xl` content lock                                                |
| Desktop          | 1281–1440px | Full layout; 4–5 column grids where applicable                                       |
| Wide desktop     | ≥ 1441px    | Content locks at 1280px, margins absorb extra width                                  |

The structural breakpoints that matter: 1280px (content lock), 1024px (small-desktop), 833px (tablet landscape / pane split), 640px (phone), 480px (small phone).

### Touch Targets

- Minimum 44 × 44px for interactive controls. `{component.button-primary}` lands at ~44 × 100px with the full-pill radius.
- Circular control chips are exactly 44 × 44px.
- Title-bar utility links are smaller (~32 × 80px) — precision desktop actions; they sit at a tighter target by design.

### Collapsing Strategy

- **Comparison panes**: 2-column → 1-column at 834px; vertical padding tightens.
- **KPI strip**: 3-column → 1-column at 640px.
- **Entry cards**: 3-column → 1-column at 640px.
- **Hero typography**: `{typography.hero-display}` (56px) → `{typography.display-lg}` (40px) at 1024px → 34px at 640px → 28px at 419px.

### Image Behavior

- All document/image previews use lazy-loading; the active preview loads eagerly.
- Previews maintain their aspect ratio across breakpoints; only scale changes.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key directly (`{component.drop-zone}`, `{component.kpi-card}`).
2. Variants of an existing component (`-active`, `-focus`, `-2`, `-3`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay Inter 600 with negative letter-spacing. Body stays Inter 400 at 17px. The boundary is unbreakable.
6. The single drop-shadow (`rgba(0, 0, 0, 0.22) 3px 5px 30px`) is reserved for document/image previews only.
7. When in doubt about emphasis: alternate surface (light → dark) before adding chrome.

## Known Gaps

- The `SidebarLayout` (compare-page left/right sidebar with user avatar) is designed but **not yet implemented** — currently the app uses `BlankLayout` (title bar + single-column outlet + status bar).
- The compare page (`BaselinePane` / `ComparisonPane` / `CompareToolbar`) is specified but **not yet implemented**.
- Windows/Linux title-bar control buttons (`chrome-window-toolbar.tsx`) are currently an empty drag-region placeholder (32px) — must decide `decorations: false` self-draw vs. native decorations retained.
- The four-segment `StatusBar` (current status / rule / last review / engine) is specified but **not yet implemented**.
- Dark-mode counterparts for light-dominant surfaces were not separately surfaced; the system documented is the light-dominant variant with dark-tile extensions.
- Form validation and error states beyond the neutral search input are not yet documented — use shadcn `Toast` / `Sonner` and `om-common-dialogs` for now.
