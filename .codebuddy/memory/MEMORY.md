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

## 项目目录扫描

- 后端 `scan_directory({ recursive, extensions })`（不是 `@tauri-apps/plugin-fs` 的 `readDir`，后者只读一层）。