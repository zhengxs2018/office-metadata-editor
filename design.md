---
version: 2.0.0
name: office-metadata-editor
website: 'https://github.com/zhengxs2018/office-metadata-editor'
description: A compact, refined desktop UI design specification for a native Tauri 2 tool built for enterprise compliance reviewers. Designed for 880x580 window scale on macOS and Windows 10/11 using React 19, Tailwind CSS 4, shadcn/ui, and HugeIcons.

tech_stack:
  framework: 'Tauri 2 (Rust + React 19)'
  styling: 'Tailwind CSS v4 + shadcn/ui (Neutral/Radix)'
  icons: '@hugeicons/react (HugeIcons Pro/Free)'
  theme_base: 'Sky Theme (#0284c7 / oklch sky primary)'

window_spec:
  default_width: 880px
  default_height: 580px
  min_width: 780px
  min_height: 520px
  aspect_ratio: '16:10 / Compact Desktop Tool'

seo:
  title: 'Office Metadata Editor Desktop Design System'
  metaDescription: 'Compact desktop design system spec for Tauri 2 + Tailwind 4 + HugeIcons + Sky Theme. Optimized for macOS and Windows 10/11.'
  highlights:
    - 'Desktop Native Density — Standard body text at 13px, tight vertical padding, compact form controls.'
    - 'Sky Theme Base + Functional Card Accents — Sky Blue primary interactive tone, with Orange (Compare), Purple (Batch), and Teal (Privacy) entry cards.'
    - 'Cross-Platform Window Frame — 32px custom titlebar reserving 72px left on macOS (traffic lights) and 140px right on Windows 10/11.'
    - 'HugeIcons Integration — Clean, consistent vector icon set replacing Lucide.'
    - 'Flex + Sidebar Layout — Optimized 2-pane editor layout (Flex main + 220px fixed summary sidebar).'
  lastUpdated: '2026-08-06'
  author:
    name: 'zhengxs2018'
    url: 'https://github.com/zhengxs2018'

colors:
  primary: '#0284c7' # Sky 600
  primary-hover: '#0369a1' # Sky 700
  primary-light: '#f0f9ff' # Sky 50
  primary-focus: '#38bdf8' # Sky 400
  ink: '#0f172a' # Slate 900
  body: '#334155' # Slate 700
  body-muted: '#64748b' # Slate 500
  divider-soft: '#f1f5f9' # Slate 100
  hairline: '#e2e8f0' # Slate 200
  canvas: '#ffffff'
  canvas-parchment: '#f8fafc' # Slate 50
  surface-pearl: '#f1f5f9' # Slate 100
  # --- Feature Card Accent Palette (Preserved from Home UI) ---
  card-compare-bg: '#fff7ed' # Orange 50
  card-compare-border: '#ffedd5' # Orange 100
  card-compare-accent: '#ea580c' # Orange 600
  card-batch-bg: '#faf5ff' # Purple 50
  card-batch-border: '#f3e8ff' # Purple 100
  card-batch-accent: '#9333ea' # Purple 600
  card-clean-bg: '#f0fdf4' # Teal 50
  card-clean-border: '#dcfce7' # Emerald 100
  card-clean-accent: '#0d9488' # Teal 600
  # --- Semantic States ---
  destructive: '#ef4444' # Red 500
  success: '#10b981' # Emerald 500
  warning: '#f59e0b' # Amber 500

typography:
  display-lg:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.2px
  display-md:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.15px
  body-strong:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.1px
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0
  caption:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption-strong:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0
  fine-print:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0
  code-mono:
    fontFamily: 'JetBrains Mono, monospace'
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    fontVariantNumeric: 'tabular-nums'

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px

components:
  title-bar:
    backgroundColor: '{colors.canvas}'
    textColor: '{colors.ink}'
    height: 32px
    paddingLeftMac: 72px
    paddingRightWin: 140px
  drop-zone:
    backgroundColor: '{colors.primary-light}'
    borderColor: '{colors.primary}/30'
    rounded: '{rounded.lg}'
    padding: 20px
  entry-card:
    rounded: '{rounded.lg}'
    padding: 16px
  sidebar-summary:
    width: 220px
    backgroundColor: '{colors.canvas-parchment}'
    borderColor: '{colors.hairline}'

---

# Office Metadata Editor - Desktop Design System (v2.0)

## 1. Window & Desktop Shell Specification

Unlike web apps or SaaS dashboards that stretch infinitely across browser viewports, **Office Metadata Editor** is a native, lightweight desktop utility built with **Tauri 2**.

### Window Metrics
- **Default Resolution**: `880px × 580px` (Compact, high-density 16:10 ratio)
- **Minimum Resolution**: `780px × 520px` (`min-width: 780px; min-height: 520px`)
- **Target Environments**:
  - **macOS**: Retina Display scaling (~1440×900 logical). Fits ~35% viewport area.
  - **Windows 10/11**: 1080p display with 125%~150% DPI scaling.

### Title Bar & Chrome (32px Height)
- **macOS Traffic Lights**: System window buttons sit at top-left. App titlebar reserves `pl-[72px]`.
- **Windows Control Buttons**: System Min/Max/Close sit at top-right. App titlebar reserves `pr-[140px]`.
- **Drag Region**: Window frame has `data-tauri-drag-region`. Interactive controls (theme toggle, action links) are exempt (`data-tauri-drag-region="false"`).

---

## 2. Desktop Density & Typography

Web-oriented typography (e.g., 56px hero text or 17px body) creates oversized, clunky interfaces on desktop windows. We adopt a **compact desktop scale** (13px default body text) similar to Xcode, VS Code, and Apple native utilities.

| Role | Font Size | Weight | Line Height | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Window Title / Nav** | 12px | 500 | 1.0 | Top custom titlebar, breadcrumbs |
| **Page Display Title** | 20px | 600 | 1.25 | Main page heading ("欢迎使用 Office 元数据编辑器") |
| **Section Heading** | 15px–16px | 600 | 1.3 | Panel sub-headers, card primary titles |
| **Body Strong** | 13px | 600 | 1.4 | Form labels, table headers, key metadata keys |
| **Body (Default)** | 13px | 400 | 1.45 | Default inputs, descriptions, list items |
| **Caption / Badge** | 12px | 400/600 | 1.3 | Secondary text, status badges, format tags |
| **Fine Print / Mono** | 11px | 400 | 1.2 | Status bar, file paths, hashes, file size (`JetBrains Mono`) |

---

## 3. Color Tokens & Theme Architecture

The system uses **Tailwind v4 CSS variables / OKLCH tokens** with a **Sky Theme** core, combined with functional feature color cards.

### Core Theme Tokens (Sky Base)
- **Primary Interactive (`--color-primary`)**: Sky 600 (`#0284c7`). Primary buttons, active tabs, focus rings.
- **Primary Hover (`--color-primary-hover`)**: Sky 700 (`#0369a1`).
- **Surface Canvas (`--color-canvas`)**: Pure White (`#ffffff`) for main input cards.
- **Surface Parchment (`--color-parchment`)**: Slate 50 (`#f8fafc`) for window background and sidebars.

### Feature Card Palette (Preserving Custom Accents)
1. **Contrast/Compare View (`对比视图`)**:
   - Background: `#fff7ed` (Orange 50) | Border: `#ffedd5` | Icon/Badge: `#ea580c` (Orange 600)
   - Badge Text: "核心"
2. **Batch Processing (`批量处理`)**:
   - Background: `#faf5ff` (Purple 50) | Border: `#f3e8ff` | Icon/Badge: `#9333ea` (Purple 600)
   - Badge Text: "高效"
3. **Privacy Cleaning (`隐私清洗`)**:
   - Background: `#f0fdf4` (Teal 50) | Border: `#dcfce7` | Icon/Badge: `#0d9488` (Teal 600)
   - Badge Text: "安全"

---

## 4. Component Layout Guidelines

### Icon System: HugeIcons (`@hugeicons/react`)
Replaces `lucide-react`. Use `strokeWidth={1.8}` and `size={16}` or `size={18}` for a delicate, precise look.

### Home Page Layout (`880 × 580`)
- **Top Header Area**: Compact title + subtitle + Theme Toggle (Day / Dark / System). Margin bottom: `12px`.
- **Drop Zone (`DropZone`)**:
  - Compact padding (`py-5 px-6`).
  - Centered icon stack (Word / Excel / PDF HugeIcons).
  - Main button: `size="sm"` (`h-8 px-4 text-xs`).
  - Format badges: `.docx`, `.doc`, `.xlsx`, `.pdf` in `text-[11px]` rounded capsules.
- **Bottom Entry Cards Grid**:
  - `grid-cols-2` or `grid-cols-3` depending on window width.
  - Reduced card padding (`p-3.5` or `p-4`).
  - Description text limited to 1–2 lines in `text-xs text-muted-foreground`.

### Editor Detail Page (`Flex + Fixed Sidebar`)
- **Left Main View (`flex-1`)**:
  - Displays editable metadata form fields.
  - Compact 2-column grid (`gap-3`).
  - Field labels placed above or inline with `12px` font size (`gap-1`).
- **Right Summary Sidebar (`w-[220px]`)**:
  - Fixed-width panel attached to the right edge (`border-l border-border bg-slate-50/50`).
  - Replaces nested floating cards to save horizontal whitespace.
  - Displays file summary (Created time, modified time, page count, PDF version) in compact tabular format.

---

## 5. UI Refinement Do's and Don'ts

### Do
- Use `13px` for default body UI text and `12px` for captions/helper text.
- Use `@hugeicons/react` with consistent `16px/18px` size for toolbar and button icons.
- Keep card padding between `12px` and `16px`.
- Ensure native Tauri window drag region works while exempting interactive controls.
- Use explicit minimum window bounds (`780px × 520px`).

### Don't
- Don't use large web marketing typography (e.g., 24px+ body or 40px+ hero headers).
- Don't add heavy drop shadows; use subtle `1px border` (`border-slate-200`) and subtle background contrast.
- Don't place UI elements within system control safe zones (`72px` left on Mac, `140px` right on Win).
- Don't create nested floating cards on dark/gray backgrounds in detail views; use standard flex sidebars.