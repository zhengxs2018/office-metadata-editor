# 项目长期记忆

## 协作硬规则（用户强制）

- **绝对禁止 AI 主动执行 `tsc --noEmit` 类型验证**（以及任何等价类型检查命令）。
  - 类型验证**只能由用户主动调用**；AI 不得自行触发，即使在中途想确认契约是否正确也不行。
  - AI 改用 `read_lints` 做轻量静态检查，或在产出后向用户说明"请你运行类型检查"，不得替用户跑 `tsc`。
  - 例外：用户在对话中明确指示"帮我跑 tsc/类型检查"时方可执行。

## 类型约定

- `LoadedDocument` 没有顶层 `.fileName` 字段，统一读 `doc.metadata.fileName`。
  - 类型定义在 `src/contexts/metadata-context.tsx`；`metadata` 是 `NormalizedMetadata`。
  - `filePath`/`id`/`status`/`companyId` 在顶层；`fileName`/`fileSize`/`fileType`/... 都在 `metadata.*`。

## 工具函数位置

- 对齐列：`alignColumns` 在 `@/lib/documents/compare-matching`（不是 `align`）。
- 审查发现：`auditRows(rows, groupsByColumn)` 在 `@/lib/documents/compare-audit`。
  - `rows: CompareRow[]`，`groupsByColumn: Record<colKey, Record<filePath, MetadataPreviewGroup[]>>`。
- 元数据预览分组：`resolveMetadataPreviewGroups` 在 `@/lib/documents/metadata`（不是 `metadata-preview`）。

## 布局约定

- shadcn sidebar 规范（硬规则）：`<SidebarProvider>` 必须是 `<Sidebar>` 与 `<SidebarInset>` 的**最近父级**（flex 容器），否则 `peer` 关系断裂，sidebar 退化为 fixed off-canvas 浮在中栏上方。
- 正确结构：`<SidebarProvider className="h-full min-h-0"> > <Sidebar/> + <SidebarInset> > <PageLayout/>`，三个组件必须严格嵌套、不要把 Sidebar/SidebarInset 当 PageLayout 的 children。
- `<Sidebar>` 的定位 class 默认 `top-0 bottom-0 h-full`，**不要**自定义 `top-XX bottom-0 h-auto`（那种写法只在塞进 PageLayout header 下方时用）。
- 编辑器页：`EditorLayout` 不再自带 `SidebarProvider`/`SidebarInset`，由 page 级组织。

## 顶部头部规范（页面与全屏弹窗统一）

- **所有顶部必须遵循同一模式**（PageLayout 主页面 + 全屏弹窗），差异为 0：
  - 返回按钮：`<Button variant="ghost" size="icon-sm" className="rounded-lg text-muted-foreground hover:text-foreground"><HugeIcon icon={ArrowLeft01Icon} size={14} /></Button>`
  - 分割线：紧跟返回按钮 `<div className="h-4 w-px shrink-0 bg-hairline" />`
  - 标题区：标题 `text-ink font-heading text-base font-semibold` + 副标题 `text-fine-print text-muted-foreground`（中间用 `·` 分隔，单字符 1.5 间距）
  - 主操作按钮挂到 header 右侧（`app-no-drag flex shrink-0 items-center gap-1` 容器内），**不放 footer**
- **不要**用 `rounded-full` 圆形返回按钮、**不要**省略 `bg-hairline` 分割线、**不要**把主操作留在底部 footer。
- 实施位置（2026-08-06）：
  - `src/layouts/page-layout.tsx` 是页面级标准实现
  - `src/pages/compare-page/components/risk-report-dialog.tsx` 对齐后
  - `src/pages/batch-page/components/export-view.tsx` 对齐后
- 弹窗也保留 `data-tauri-drag-region` + `app-drag` + traffic-light inset paddingLeft（即便弹窗不是窗口，仍走 OS drag 习惯保持视觉一致）。

## 首页布局（特例：BlankLayout + 自渲染 header）

- 首页**不用 PageLayout**，用 `BlankLayout`（不传 `header` prop，让 `ChromeWindowToolbar` 自动渲染为顶部 32px 纯拖拽层）。
- 标题/副标题/主题切换都在 children 内自渲染：
  - 标题 `text-2xl font-semibold tracking-tight`（**比 PageLayout 内的 16px 大**——首页是首屏 hero，需要大字号）
  - 副标题 `text-sm text-muted-foreground`
  - 主题切换在 header 右侧，`pr-10` (40px) 远离右边（避免 Windows 关闭按钮重叠）+ `pt-3` 略低
- **header 自身 paddingTop `pt-10` (40px)**：让 header 内容从 main top 40px 开始，在 ChromeWindowToolbar (0-32px) 下方 8px —— **避免拖拽区域被 header 内容"挤掉"**。
- 背景 `bg-background`，**无 hairline / bg-parchment 区分**，与内容区自然融合（"首页顶部不要有区分"）。
- **不要在 header 上加 `data-tauri-drag-region`**：BlankLayout 已渲染 ChromeWindowToolbar 处理顶部拖拽，header 在 32px 以下再加 drag 是冗余。
- 文件结构：`src/pages/home-page/index.tsx`（App.tsx 用 `./pages/home-page` 路径，Vite/TS 自动解析到 `index.tsx`）。

## 图标库

- **已从 lucide-react 迁移至 hugeicons（2026-08-06）**
  - `@hugeicons/core-free-icons` 提供图标对象，`@hugeicons/react` 提供 `<HugeiconsIcon>` 渲染器。
  - 项目封装了 `<HugeIcon>` 组件（`src/components/icons/huge-icon.tsx`），默认 `size={16}` `strokeWidth={1.8}`。
  - 图标类型：`import type { IconSvgElement } from "@hugeicons/react"`，用于 props 类型定义。
  - **hugeicons 图标是 SVG 数据对象，不是 React 组件，不能用 `<IconName className="..." />` 直接渲染，必须包装在 `<HugeiconsIcon icon={IconName} />` 或 `<HugeIcon icon={IconName} />` 中。**

## 窗口尺寸

- **Tauri 窗口 (2026-08-06)**：默认 880×580px，最小 780×520px
- 设计规范要求 compact desktop density（小圆角 4-8px、小间距、紧凑布局）

## 对比报告对话框（risk-report-dialog.tsx）— 2026-08-06 重构

重构后报告分 5 节（按编号），固定 PageLayout 顶部模式 + 返回按钮 + 副标题 + 重新对比：

- **01 执行摘要**：3 张 SummaryBigCard（高/中/通过）。通过 = 无标记的文件数；不再用"已检查文件总数"作统计卡片（用户要求），文件总数挪到副标题/对阵图 hint 里。
- **02 对阵图**：每家公司一张 CompanyBattleRow 卡，对抗式色环（COMPANY_ACCENTS palette 6 色循环），卡内显示 该公司文件数 / 高 / 中 / 通过 三宫格 + 前 6 个文件列表（高亮标记文件）。横向 ScrollArea 适配 2vN。2 家时 sm+ 折行。
- **03 风险事件清单**：仅当 findings.length > 0 渲染。每条 finding 用 RiskFindingsAdversarial 卡：高/中徽章 + 问题描述 + 字段值 + 涉及公司色块链 + 涉及文件矩阵（按公司着色）。2/3/N 公司自然扩展，无需特别适配。
- **04 文件元数据明细**：明细表移至报告**最底部**。ReportSection 新增 `actions` 槽位：「导出 Excel」按钮挂到 section 标题右侧（不再是表格上方）。明细表内 `<860px` 自动切到 3 列（公司/文件/状态），≥860px 展开 8 列全字段。表格下方挂 "共 N 个文件 · 已标记 X · 通过 Y + 按公司小计"。
- hero 标题用色块 + 箭头连接器替代单一 " ⟷ "，让对抗感可视化（每家独立着色）。

数据结构：`CompanySnapshot { id, name, shortName, files, highCount, mediumCount, cleanCount, accentIndex }`。`FlaggedFile` 新增 `riskLevel`、`matchingField`、`matchingValue` 三个字段（衍生自 findings）— 状态徽章/Tooltip 现在能直接显示「字段 X 相同：值」。
## 顶部 AppShell 拖拽区（webkit-app-region 正确模式，2026-08-06）

- **核心规则**：`<header data-tauri-drag-region class="app-drag">` 整条 header 默认可拖；**只有交互控件**才单独包 `app-no-drag`（= `-webkit-app-region: no-drag`）。
- **反向错误模式（已修）**：在 `.leading` / `.actions` 容器上 blanket 应用 `app-no-drag` 会把标题文字也算入 no-drag → 拖拽区被"覆盖"。**只可对单个按钮/输入 opt-out，不可对容器 blanket opt-out**。
- **修复后**：`src/layouts/app-shell.tsx` 移除 `.leading` 的 `app-no-drag`，保留 `.actions` 的；`src/layouts/page-layout.tsx` 把 SidebarTrigger/Button 单独包 `app-no-drag`，header props 文本自动可拖。
- **覆盖范围**：所有用 PageLayout / EditorLayout 的页面（`batch-page`、`editor-page` 等）自动受益；自定义 header 的全屏 dialog（`risk-report-dialog`、`export-view`）需各自修改。
- 实施位置（2026-08-06）：
  - `src/layouts/app-shell.tsx`（治根）
  - `src/layouts/page-layout.tsx`（header leading）
  - `src/pages/compare-page/components/risk-report-dialog.tsx`（modal header）
  - `src/pages/batch-page/components/export-view.tsx`（modal header）

## recharts 使用（2026-08-06）

- `package.json` 已装 `recharts@3.8.0`（与 React 19 兼容）。
- 用于：`risk-report-dialog.tsx` 02 对阵图横向 stacked bar，每行公司、stack = 高/中/通过文件数。仅在 ≥2 家公司时渲染。
- 关键陷阱：`ResponsiveContainer` 的父容器必须有可测高度（不要包 `display: none` / 0 高度父），否则图表不渲染。
- recharts 工具栏/网格使用 `stroke="var(--border)"` 而非硬编码颜色，配合 `strokeOpacity` 让网格融入设计系统。

## 卡片密度与宽度约束（对阵图卡，2026-08-06）

- 1 家：`grid-cols-1 [&>article]:max-w-[480px]`（不超过半页宽）。
- 2 家：`sm:grid-cols-2 [&>article]:sm:max-w-none`（屏宽足够就铺满）。
- 3 家：`sm:grid-cols-3 [&>article]:sm:max-w-none`。
- 4+ 家：`ScrollArea` + `flex w-max`，每张卡 `w-65 sm:w-70`（固定 260/280px）。
- 卡片内部统一 `p-3.5`、`gap-3` 段落、`gap-2` 行间。BattleStat 用 `text-lg` 数字、`py-1.5` 内 padding、`/10` 透明度。
- 单家公司使用 `[&>article]:max-w-[480px]` 防止单独展示时横向拉伸变形。

## 对比报告卡片降噪原则（对阵图卡，2026-08-06）

- **永远滚动 ≥3 家**：横滚比 grid 更可预测；用户随时能 swipe，不依赖视口宽度。
- **三宫格只显示非零指标**：用 `statsColCount(s)` 动态算列数，避免 `高 0`、`中 0` 噪声。
- **文件列表只看命中**：仅 flagged 列表是信号；其余 `+ 还有 N 个文件未列出` 即可，去掉 full pass 冗余列表。
- **未涉及 = 单行胶囊**：替代完整 stats + 整文件列表，省 60% 视觉重量。
- **全通过** 也用单行胶囊 `N 个文件全部通过`，不渲染 三宫格也不渲染文件列表。
- **公司 tag 取消"未涉及"标签**：用正文 chip 颜色替代，header 不堆叠多种 badge。
- **风险事件清单**：file rows 合并成 `公司 · 文件名` 单行；compact spacing（py-2, gap-2.5）；公司 chip 与"涉及 N 家"合并到一行。
- **统一卡片内部间距**：`gap-3` 段落 / `gap-2.5` 文件行 / `py-2` 文件行内 padding / `px-2.5`。

## 表格与文档边框核心教训（2026-08-06 batch-page 多轮迭代）

### 问题：`border-collapse: collapse` + `position: sticky` → 边框不可见
- 根因：sticky 元素提升到独立层叠上下文，覆盖 collapse 模式下相邻 cell 共享的边框。
- 只有数据行（无 sticky）边框正常，表头 `<th>`（有 sticky left/right）边框消失。

### 正确方案
1. **`border-separate border-spacing-0`** 替代 `border-collapse`（独立边框，sticky 不覆盖）
2. **单边边框**：每个 cell 只加 `border-b border-r`（无双线），外缘加 `border-t border-l`
3. **固定列分隔**：不用 `border-r-2`（会与相邻 cell `border-r` 形成双线），改用 `shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]` box-shadow
4. **颜色**：当表头用 `bg-muted` 时，`border-border` 颜色太接近（96% vs 92% lightness），必须用 `border-zinc-300` 硬编码灰色
5. **所有 `<th>` 必须加 `bg-muted`**（固定列+非固定列），否则滚动透底
6. **表头圆角**：左右固定列 `<th>` 加 `rounded-tl-lg` / `rounded-tr-lg`，配合表格容器 `overflow-hidden rounded-lg`

### editor-page 应用（2026-08-06）
- `OmMetadataSection`：`border-border/70` → `border-zinc-200`（Card 边框可见）
- `OmPropertyPreview`：`border-border/50` → `border-zinc-200`（预览面板边框可见）
- `OmMetadataFieldItem`：`border-border/55` → `border-zinc-200`（Input 下划线可见）

### compare-page file-metadata-grid 应用（2026-08-06）
- `file-metadata-grid.tsx`：CSS Grid → `<table border-separate border-spacing-0>`，公司（sticky left）+ 状态（sticky right）双固定列
- 去掉 `min-[860px]` 响应式隐藏逻辑，所有列常驻 + 横向滚动，小屏下固定列保活
