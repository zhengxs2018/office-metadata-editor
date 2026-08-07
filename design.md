---
version: 1.0.0
name: office-metadata-editor
website: 'https://github.com/zhengxs2018/office-metadata-editor'
description: A compact, refined desktop UI design specification for a native Tauri 2 tool built for enterprise compliance reviewers. Designed for 880x580 window scale on macOS and Windows 10/11 using React 19, Tailwind CSS 4, shadcn/ui, and HugeIcons.

tech_stack:
  framework: 'Tauri 2 (Rust + React 19)'
  styling: 'Tailwind CSS v4 + shadcn/ui (Neutral/Radix)'
  icons: '@hugeicons/core-free-icons (HugeIcons Free)'
  theme_base: 'Sky Theme (oklch sky primary)'
  font_sans: 'Roboto Variable'
  font_mono: 'JetBrains Mono Variable'

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
    - 'Sky Theme Base + Functional Card Accents — Sky Blue primary interactive tone, with Orange (Compare), Violet (Batch), and Emerald (Hidden Info) entry cards.'
    - 'Cross-Platform Window Frame — 44px custom titlebar reserving 78px left on macOS (traffic lights).'
    - 'HugeIcons Integration — Clean, consistent vector icon set replacing Lucide.'
    - 'Page Layouts — Compare (company cards grid + workbench), Editor (flex+sidebar), Batch (table+export). Home layout pending redesign (not specified here).'
  lastUpdated: '2026-08-07'
  author:
    name: 'zhengxs2018'
    url: 'https://github.com/zhengxs2018'

colors:
  # --- Core Sky Primary (oklch, resolved in base.css) ---
  primary: 'oklch(0.5 0.134 242.749)' # Sky — primary buttons, active tabs, focus rings
  primary-hover: 'oklch(0.443 0.11 240.79)' # Darker sky — hover state
  primary-light: 'oklch(0.974 0.003 106)' # Warm-tinted canvas — drop zone backgrounds, subtle fills
  # --- Neutral Ink Scale (oklch) ---
  ink: '#0f172a' # Slate 900 — headings, strong text
  body: '#334155' # Slate 700 — default body text
  body-muted: '#64748b' # Slate 500 — secondary / muted text
  # --- Surface Ladder (oklch, warm-tinted) ---
  divider-soft: 'oklch(0.941 0.003 106)' # Soft dividers between sections
  hairline: 'oklch(0.906 0.004 106)' # Hairline separators (inset box-shadow)
  canvas: 'oklch(0.974 0.003 106)' # Main content background (warm white)
  canvas-parchment: 'oklch(0.988 0.002 106)' # Slightly warmer — sidebar backgrounds
  surface-pearl: 'oklch(1 0 0)' # Pure white — cards, elevated surfaces
  # --- Feature Card Accent Palette (verified from home-page source) ---
  card-compare-bg: 'from-orange-500/15 to-orange-500/0' # Orange gradient
  card-compare-border: 'border-orange-500/20'
  card-compare-icon: 'bg-orange-500/10 text-orange-600 dark:text-orange-300'
  card-compare-badge: 'bg-red-500 text-white' # "核心" badge
  card-batch-bg: 'from-violet-500/15 to-violet-500/0' # Violet gradient
  card-batch-border: 'border-violet-500/20'
  card-batch-icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-300'
  card-batch-badge: 'bg-blue-500 text-white' # "高效" badge
  card-hidden-bg: 'from-emerald-500/15 to-emerald-500/0' # Emerald gradient
  card-hidden-border: 'border-emerald-500/20'
  card-hidden-icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
  card-hidden-badge: 'bg-emerald-600 text-white' # "检视" badge
  # --- Semantic States (oklch) ---
  destructive: 'oklch(0.577 0.245 27.325)' # Red — errors, destructive actions
  success: 'oklch(0.68 0.146 152)' # Green — success states
  warning: 'oklch(0.79 0.148 76)' # Amber — warnings

typography:
  display-lg:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.2px
  display-md:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.15px
  tagline:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 21px # 1.3125rem — home page main title (text-2xl ≈ 24px is too large; prefer 20–21px)
    fontWeight: 600 # font-semibold
    lineHeight: 1.19 # tracking-tight
    letterSpacing: 0.231px
  body-strong:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 13px # 1.0625rem — text-body scale
    fontWeight: 600
    lineHeight: 1.47
    letterSpacing: -0.374px
  body:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 13px # 1.0625rem — text-body scale
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: -0.374px
  caption:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 12px # 0.875rem — text-caption scale
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.224px
  caption-strong:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: -0.224px
  fine-print:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 11px # 0.75rem — text-fine-print scale
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.12px
  micro-legal:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 10px # 0.625rem — badges, micro labels
    fontWeight: 600 # font-semibold for badges
    lineHeight: 1.3
    letterSpacing: -0.08px
  code-mono:
    fontFamily: 'JetBrains Mono Variable, monospace'
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    fontVariantNumeric: 'tabular-nums'
  kpi:
    fontFamily: 'Roboto Variable, sans-serif'
    fontSize: 30px # 1.875rem — summary numbers
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.374px

rounded:
  none: 0px
  xs: 4px # radius-sm (0.6 × base)
  sm: 6px # radius-md (0.8 × base)
  md: 8px # radius-lg (base = 0.45rem)
  lg: 12px # radius-xl (1.4 × base) — cards, inputs
  xl: 16px # radius-2xl (1.8 × base) — drop zones, entry cards
  pill: 9999px

spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  xxl: 24px

# --- Verified Component Specifications (aligned with actual source code) ---
components:
  title-bar:
    backgroundColor: '{colors.surface-pearl}'
    textColor: '{colors.ink}'
    height: 44px # Actual: chrome.css --chrome-titlebar-height
    paddingLeftMac: 78px # Actual: chrome.css --chrome-traffic-light-inset
  drop-zone:
    backgroundColor: 'bg-primary/3' # Very subtle primary tint
    borderColor: 'border-primary/30' # Dashed border
    borderHoverColor: 'border-primary/60' # Hover state
    rounded: '{rounded.xl}' # rounded-xl (12px) — actual code
    padding: 'px-4 py-8' # Actual FileDropZone internal padding
    iconContainerSize: 48px # size-12 rounded-2xl
    iconSize: 22px # FolderOpen / Upload01 icons
    loadingIconSize: 28px # Loading02 spinner
  entry-card:
    rounded: '{rounded.xl}' # rounded-xl (12px) — actual code
    padding: 16px # p-4 — actual code
    iconContainerSize: 32px # h-8 w-8 rounded-md
    iconSize: 16px # HugeIcon size prop — actual code
    badgeFontSize: 10px # text-[10px] — actual code
    badgeFontWeight: 600 # font-semibold
    titleFontSize: 14px # text-sm font-semibold — actual code
    descriptionFontSize: 12px # text-xs — actual code
    ctaFontSize: 12px # text-xs — actual code
  sidebar-summary:
    width: 220px
    backgroundColor: '{colors.canvas-parchment}'
    borderColor: '{colors.hairline}'
---

# Office Metadata Editor - Desktop Design System (v2.1)

> **v2.1 变更摘要**（2026-08-07）：与实际源码对齐审计后全面修正。
>
> - 字体族从 `Inter` 更正为 `Roboto Variable`（`base.css` L11 实际导入）。
> - 标题栏高度从 `32px` 更正为 `44px`（`chrome.css` L8 实际值）；macOS traffic light 预留从 `72px` 更正为 `78px`（`chrome.css` L22）。
> - 排版表新增 `tagline`(21px)、`kpi`(30px)、`micro-legal`(10px) 三级，补全 `base.css` 已注册的全部 9 级类型尺度。
> - 圆角规格更正：实际代码中卡片/拖拽区用 `rounded-xl`(12px)，非规范中的 `rounded.lg`(8px)；补全 `radius-sm`~`radius-xl` 完整阶梯。
> - 新增「首页布局」「对比页布局」「组件样式契约」三个章节，描述经源码验证的实际布局模式。
> - 功能卡调色板更正：badge 色值与实际 `TONE_STYLES` 对齐（如 violet 卡片 badge 为 `bg-blue-500` 而非紫色）。
> - 图标库更正为 `@hugeicons/core-free-icons`（实际 import 源）。
>
> **后续调整**（2026-08-07）：首页布局章节移除 + 主题切换交互规范。
>
> - **移除「Home Page Layout」章节**：首页存在重构争议，布局不写入规范，避免误导。颜色系统（Sky 主题 + 功能卡三级调色板）全部保留，用户明确认可。
> - **新增主题切换交互规范**：`ThemeSwitch` 当前主题始终可见（图标+标签+高亮），非当前选项默认隐藏（`max-w-0 opacity-0`），`group-hover` 时才平滑展开；无重复项、无跳动感。
> - seo.highlights 中首页布局描述标注为 pending redesign。

## 1. Window & Desktop Shell Specification

Unlike web apps or SaaS dashboards that stretch infinitely across browser viewports, **Office Metadata Editor** is a native, lightweight desktop utility built with **Tauri 2**.

### Window Metrics

- **Default Resolution**: `880px × 580px` (Compact, high-density 16:10 ratio)
- **Minimum Resolution**: `780px × 520px` (`min-width: 780px; min-height: 520px`)
- **Target Environments**:
  - **macOS**: Retina Display scaling (~1440×900 logical). Fits ~35% viewport area.
  - **Windows 10/11**: 1080p display with 125%~150% DPI scaling.

### Title Bar & Chrome (44px Height)

- **Actual height**: `44px` (CSS variable `--chrome-titlebar-height` in `chrome.css`). This is the rendered value used by `AppShell`.
- **macOS Traffic Lights**: System window buttons float above the webview. App reserves `78px` left inset (`--chrome-traffic-light-inset` for `[data-platform="macos"]`).
- **Drag Region**: `.chrome-window-toolbar` class provides a fixed-position drag strip at the top. Interactive controls must use `-webkit-app-region: no-drag` or be placed outside the drag region.
- **Theme Toggle**: Positioned at `absolute top-10 right-10` on the home page (outside the flow layout, z-indexed above content).

---

## 2. Desktop Density & Typography

Web-oriented typography (e.g., 56px hero text or 17px body) creates oversized, clunky interfaces on desktop windows. We adopt a **compact desktop scale** (13px default body text) similar to Xcode, VS Code, and Apple native utilities.

All typography tokens are registered as CSS custom properties in `base.css` `@theme inline` block and consumed via Tailwind utility classes:

| Role               | CSS Variable         | Size | Weight | Line Height | Tailwind Class            | Application                                      |
| :----------------- | :------------------- | :--- | :----- | :---------- | :------------------------ | :----------------------------------------------- |
| **Display LG**     | `--text-display-lg`  | 40px | 600    | 1.1         | `text-display-lg`         | Reserved for marketing/landing (not used in-app) |
| **Display MD**     | `--text-display-md`  | 34px | 600    | 1.2         | `text-display-md`         | Reserved for large headings                      |
| **KPI**            | `--text-kpi`         | 30px | 600    | 1.2         | `text-kpi`                | Summary numbers (finding counts, file totals)    |
| **Tagline**        | `--text-tagline`     | 21px | 600    | 1.19        | `text-tagline`            | Home page main title (**not** 24–30px)           |
| **Body Strong**    | `--text-body`        | 13px | 600    | 1.47        | `text-body font-semibold` | Form labels, table headers, card titles          |
| **Body (Default)** | `--text-body`        | 13px | 400    | 1.47        | `text-body`               | Default descriptions, list items, paragraphs     |
| **Caption**        | `--text-caption`     | 12px | 400    | 1.43        | `text-caption`            | Secondary text, status tags, CTA links           |
| **Fine Print**     | `--text-fine-print`  | 11px | 400    | 1.0         | `text-fine-print`         | Format hints, file paths, status bar text        |
| **Micro Legal**    | `--text-micro-legal` | 10px | 600    | 1.3         | `text-micro-legal`        | Entry card badges                                |

**Font Family**:

- Sans: `Roboto Variable` (imported via `@fontsource-variable/roboto`)
- Mono: `JetBrains Mono Variable` (imported via `@fontsource-variable/jetbrains-mono`)

---

## 3. Color Tokens & Theme Architecture

The system uses **Tailwind v4 CSS variables / OKLCH tokens** with a **Sky Theme** core, combined with functional feature color cards.

### Core Theme Tokens (Sky Base, oklch)

- **Primary Interactive (`--color-primary`)**: `oklch(0.5 0.134 242.749)` — Primary buttons, active tabs, focus rings.
- **Primary Hover**: `oklch(0.443 0.11 240.79)` — Darker sky for hover/pressed.
- **Surface Ladder** (warm-tinted, not pure gray):
  - `--pearl` = pure white (`oklch(1 0 0)`) — elevated cards, inputs
  - `--parchment` = near-white (`oklch(0.988 0.002 106)`) — sidebars, panel backgrounds
  - `--canvas` = warm white (`oklch(0.974 0.003 106)`) — main content area background
- **Hairline**: `oklch(0.906 0.004 106)` — Used as `box-shadow` inset (`.hairline-*` utilities), **not** `border`.
- **Divider Soft**: `oklch(0.941 0.003 106)` — Softer than hairline, for section separators.

Dark mode mirrors this ladder with rising elevation: `canvas`(0.168) < `parchment`(0.205) < `pearl`(0.242).

### Feature Card Accent Palette (Verified from Source)

Three semantic tones for home page entry cards. Each defines: gradient background, border tint, icon container, and badge.

| Feature                   | Tone    | Gradient BG                | Border           | Icon Container                           | Badge            | Badge Text |
| :------------------------ | :------ | :------------------------- | :--------------- | :--------------------------------------- | :--------------- | :--------- |
| **对比视图** (Compare)    | Orange  | `from-orange-500/15 to-0`  | `orange-500/20`  | `orange-500/10 bg` + `orange-600` text   | `bg-red-500`     | 核心       |
| **批量处理** (Batch)      | Violet  | `from-violet-500/15 to-0`  | `violet-500/20`  | `violet-500/10 bg` + `violet-600` text   | `bg-blue-500`    | 高效       |
| **隐藏信息提取** (Hidden) | Emerald | `from-emerald-500/15 to-0` | `emerald-500/20` | `emerald-500/10 bg` + `emerald-600` text | `bg-emerald-600` | 检视       |

> Note: Badge colors intentionally cross tones (e.g., violet card uses blue badge) for visual distinction priority over color harmony.

### Semantic State Colors

- **Destructive**: `oklch(0.577 0.245 27.325)` — Errors, delete actions
- **Success**: `oklch(0.68 0.146 152)` — Completed, passed checks
- **Warning**: `oklch(0.79 0.148 76)` — Cautions, needs attention

---

## 4. Component Layout Guidelines (Verified)

### Icon System: HugeIcons (`@hugeicons/core-free-icons`)

- Import from `@hugeicons/core-free-icons` (named exports like `GitCompareIcon`, `Layers01Icon`, `ScanEyeIcon`).
- Render via `<HugeIcon icon={IconName} size={16} />` wrapper component.
- Standard sizes: `size={14}` (toolbar/in-button), `size={16}` (card icons), `size={22}` (drop zone), `size={28}` (loading spinner).

### Surface Utilities (Defined in `base.css`)

Two official surface treatments — use these instead of ad-hoc bg/border combinations:

| Utility          | Background      | Border Radius      | Shadow                  | Use For                            |
| :--------------- | :-------------- | :----------------- | :---------------------- | :--------------------------------- |
| `.surface-card`  | `var(--pearl)`  | `var(--radius-xl)` | `var(--shadow-product)` | Elevated floating cards, modals    |
| `.surface-inset` | `var(--canvas)` | `var(--radius-lg)` | None                    | Nested content areas, inner panels |

Hairline separator utilities (inset box-shadow, not border):

- `.hairline-b` / `.hairline-t` / `.hairline-r` / `.hairline-l`

### Theme Switch (Collapsed-by-default, Hover-to-expand)

The theme toggle (`ThemeSwitch` in `src/components/chrome/theme-switch.tsx`) uses a **peek-on-hover** pattern to keep the home-page chrome minimal:

- **Collapsed (default)**: Shows only the **current** theme's icon (sun / moon / laptop) with a short label. This is the resting state — no layout shift.
- **Expanded (on hover/focus)**: The radiogroup horizontally reveals all three options (`白天` / `暗黑` / `系统`) growing from the right edge. Returns to collapsed on mouse leave.
- **Implementation contract**:
  - Wrap in a `group` container with `onMouseEnter`/`onMouseLeave`; track `hovered` state (or CSS `group-hover`) to drive width/`max-w` transitions.
  - Collapsed label uses `w-0 opacity-0 overflow-hidden`; expanded options use `max-w-0 → max-w-48 opacity-100 transition-all`.
  - Keep `role="radiogroup"` + per-button `role="radio"` + `aria-checked` for accessibility; the collapsed current button carries `aria-label="当前主题：<label>"`.
  - `200ms` duration; no vertical layout change — expansion is purely horizontal so absolute-positioned placement (e.g. `absolute top-10 right-10`) is safe.

### Compare Page Layout (`PageLayout` with header)

```
┌──────────────────────────────────────────────────────┐
│ [<] 元数据对比              [清空全部] [▶ 开始对比]   │ ← PageLayout header bar
│                                                      │
│  ┌─────────┐ ┌─────────────┐ ┌─────────────┐ …     │
│  │DropZone  │ │ Company A   │ │ Company B   │        │ ← grid-cols-2/3/4, gap-3
│  │(目录拖拽)│ │ 3/3 已加载  │ │ 3/3 已加载  │        │
│  │          │ │ ─文件列表── │ │ ─文件列表── │        │
│  └─────────┘ └─────────────┘ └─────────────┘ …     │
│                                                      │
│  ═══ workbench (hidden until result) ════════════    │
│  01 执行摘要      3家公司/9个文件        [导出Excel] │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐        │
│  │强线索│中线索│对齐组│差异字│未匹配│文件数│        │ ← KPI stat row
│  │  1  │  0  │  0  │  0  │  9  │  9  │        │
│  └──────┴──────┴──────┴──────┴──────┴──────┘        │
│  02 线索清单                                    N条  │
│  ┌────────────────────────────────────────┐        │
│  │ • 强线索  同一主体  100%                │        │
│  └────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

**Key specifications**:

- **Header**: `text-caption font-semibold` (12px semibold) — "元数据对比". Actions: ghost "清空全部" + primary "开始对比"/"重新对比".
- **Upload Grid**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3`. First slot is `DropZone` (directory mode); remaining slots are `CompanyCard` components.
- **Workbench**: Appears after comparison runs (replaces upload grid). Contains: executive summary (KPI row + findings list + disclaimer + export hint) + findings detail sections.
- **Company Card**: Shows company name, load count, "追加文件" action, file list with status badges ("就绪"/"就绪").

### Editor Detail Page (`Flex + Fixed Sidebar`)

- **Left Main View (`flex-1`)**: Editable metadata form fields. Compact 2-column grid (`gap-3`). Field labels above or inline with `12px` font size.
- **Right Summary Sidebar (`w-[220px]`)**: Fixed-width panel. File summary (created, modified, page count, PDF version) in compact tabular format.

---

## 5. UI Refinement Do's and Don'ts

### Do

- Use `13px` (`text-body`) for default body UI text and `12px` (`text-caption`) for captions/helper text.
- Use `@hugeicons/core-free-icons` via `<HugeIcon>` wrapper with consistent sizes: `14px` (toolbar), `16px` (cards), `22px` (drop zones).
- Keep card padding between `12px` and `16px`; use `rounded-xl` (12px) for cards/drop-zones, `rounded-lg` (8px) for inputs/inner panels.
- Ensure native Tauri window drag region works while exempting interactive controls.
- Use explicit minimum window bounds (`780px × 520px`).
- Use `.surface-card` / `.surface-inset` utilities for elevated/nested surfaces instead of ad-hoc bg+border combinations.
- Use `.hairline-*` utilities for subtle separators instead of full borders.
- Follow the warm-tinted surface ladder (canvas → parchment → pearl) rather than pure grays.

### Don't

- Don't use large web marketing typography (e.g., 24px+ body or 40px+ hero headers). Home page title should stay at `text-tagline` (21px) or below.
- Don't add heavy drop shadows; use `var(--shadow-product)` only for `.surface-card` elevated elements. Everything else gets flat surfaces with hairline separators.
- Don't place UI elements within system control safe zones (`78px` left on Mac for traffic lights).
- Don't create nested floating cards on dark/gray backgrounds in detail views; use standard flex sidebars.
- Don't use `Inter` in design specs — the actual font is `Roboto Variable`.
- Don't specify `32px` titlebar height — the actual value is `44px`.
- Don't use `rounded-lg` (8px) for entry cards or drop zones — actual code uses `rounded-xl` (12px).
- Don't assume badge colors match their card tone — verify against `TONE_STYLES` in source (e.g., violet card has **blue** badge).
