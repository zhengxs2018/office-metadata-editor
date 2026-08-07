# Office 元数据编辑器 · 架构说明

> 版本：v0.3.0 · 最后更新：2026-08-07
>
> 配套图示（独立 HTML，支持深浅色切换与 PNG / JPEG / WebP / SVG 导出）：
>
> | 图 | 文件 | 说明 |
> | --- | --- | --- |
> | 系统架构 | [`assets/architecture.html`](./assets/architecture.html) | 进程边界、分层与依赖 |
> | 比对内核数据流 | [`assets/compare-pipeline.html`](./assets/compare-pipeline.html) | `compare_metadata` 全链路 |
> | 批量编辑工作流 | [`assets/batch-edit.html`](./assets/batch-edit.html) | 拖拽入库到落盘 |
>
> 图的源规格为同目录下的 `*.json`，改图请改 JSON 后重新渲染，勿手改 HTML。

---

## 1. 概览

本项目是一个 **Tauri v2 桌面应用**，用于批量查看、编辑、清除 Office 与 PDF 文档的元数据，并在此基础上提供两项分析能力：**跨公司文档比对**与**隐藏信息提取**。

架构上是清晰的两进程模型：

- **WebView 渲染进程**：React 19 + TypeScript，负责交互、状态编排与报表生成。
- **Rust 原生进程**（`tauri_native_lib`）：负责一切文件 I/O、文档解析回写与计算密集的比对内核。

一条硬边界贯穿全局：**文件句柄只存在于 Rust 侧，前端自始至终只持有路径字符串**。所有跨进程调用统一经 `trackedInvoke` 收口，命令白名单由 `src-tauri/capabilities/default.json` 限定。

## 2. 技术栈

### 前端

| 领域 | 选型 |
| --- | --- |
| 框架 | React 19 + TypeScript 7 |
| 构建 | Vite 8（bun 驱动），包管理 `bun@1.3.14` |
| 路由 | `react-router-dom` v7，路径常量集中在 `src/router/paths.ts` |
| 状态 | React Context（`FileProvider` / `MetadataProvider`）+ zustand（`file-store`） |
| UI | shadcn 风格组件 + Radix UI + Tailwind CSS 4 |
| 表单 | TanStack Form + zod 校验 |
| 表格/图表 | TanStack Table、Recharts |
| 交互 | dnd-kit（排序）、vaul、sonner（toast）、next-themes |
| 图标 | Hugeicons（`@hugeicons/react`） |
| 报表 | SheetJS（`xlsx`） |
| 质量 | oxlint（type-aware）+ oxfmt |

### Rust 侧

| 领域 | 选型 |
| --- | --- |
| 运行时 | Tauri 2，edition 2021 |
| 插件 | `tauri-plugin-dialog` / `-opener` / `-log` |
| OOXML | `zip`（deflate）+ `xmltree` |
| PDF | `lopdf` 0.34 |
| 中文处理 | `pinyin` 0.11 |
| 其他 | `serde` / `serde_json`、`walkdir`、`base64` |
| 质量 | `cargo clippy -D warnings`、`cargo fmt` |

Release profile 以体积优先：`lto = true`、`codegen-units = 1`、`opt-level = "s"`、`panic = "abort"`、`strip = true`。

## 3. 系统分层

> 图示：[`assets/architecture.html`](./assets/architecture.html) —— 用浏览器打开，可切换深浅色并导出图片。

### 3.1 前端分层（`src/`）

```
src/
├── pages/            页面（每页一个目录，含私有 components/）
│   ├── home-page/      入口导航
│   ├── editor-page/    单文件精细编辑
│   ├── batch-page/     批量编辑与清除
│   ├── compare-page/   跨公司比对工作台
│   └── hidden-page/    隐藏信息提取
├── components/
│   ├── ui/             shadcn 基础组件
│   ├── base/           业务无关复合组件（FileDropZone、AddFilesDialog 等）
│   ├── chrome/         窗口外壳（主题同步、平台同步）
│   ├── export/         导出相关组件
│   └── icons/          图标封装
├── contexts/         metadata-context / file-context 及其类型与默认值
├── stores/           file-store（zustand）
├── lib/
│   ├── tauri.ts        trackedInvoke / trackedEmit —— IPC 唯一出口
│   ├── debug-events.ts 调试事件总线
│   ├── resources/      documents.ts 资源访问层
│   └── documents/      领域逻辑
│       ├── metadata/     四种格式的元数据适配（base/docx/xlsx/pdf/doc）
│       ├── compare/      types / selectors / export / stop-words
│       ├── hidden/       selectors / export
│       └── export/       导出工具
├── hooks/            use-global-drag-drop / use-mobile
├── router/           paths.ts
└── layouts/          布局组件
```

分层原则：**页面只做编排，领域逻辑一律下沉到 `lib/documents`**。`selectors.ts` 系列保持纯函数，不触碰 IPC，便于独立推理。

### 3.2 Rust 分层（`src-tauri/src/`）

```
src-tauri/src/
├── main.rs                 二进制入口（6 行，仅转发）
├── lib.rs                  命令层：注册 34 个 invoke 命令（约 1650 行）
├── files/mod.rs            保存对话框与落盘
├── documents/
│   ├── docx.rs             DOCX 解析与回写
│   ├── xlsx.rs             XLSX 解析与回写
│   ├── pdf.rs              PDF 解析与回写
│   └── compare/            比对内核
│       ├── mod.rs            run_compare 编排入口
│       ├── model.rs          数据契约（295 行）
│       ├── align.rs          文档对齐（161 行）
│       ├── diff.rs           字段差异（79 行）
│       ├── fields.rs         字段字典与分级（130 行）
│       ├── normalize.rs      文本归一化（306 行）
│       ├── rules.rs          风险规则（627 行）
│       └── extract_hidden.rs 隐藏痕迹提取（109 行）
└── export/                 元数据构建、批量清除
    ├── mod.rs                共享数据结构（271 行）
    ├── docx.rs / xlsx.rs / pdf.rs
```

`lib.rs` 是唯一的命令注册点，业务实现全部下沉到子模块。

## 4. 命令层（IPC 契约）

`lib.rs` 通过 `tauri::generate_handler!` 注册 34 个命令，按职责分五组：

**目录与自动化**
`scan_directory`、`create_automation_request`、`cancel_automation_request`、`finish_automation_request`、`get_automation_request_status`

**DOCX**
`parse_docx_metadata`、`parse_docx_metadata_from_path`、`update_docx_metadata`、`save_docx_metadata`、`save_docx_metadata_to_source`、`batch_save_docx_metadata_to_source`、`save_docx_metadata_as`、`batch_clear_and_save_docx_metadata`

**XLSX / PDF / DOC**
三组各 4~5 个命令，签名与 DOCX 组对称：`parse_*_metadata_from_path`、`save_*_metadata_to_source`、`batch_save_*_metadata_to_source`、`save_*_metadata_as`、`batch_clear_and_save_*_metadata`

**分析**
`compare_metadata`

**系统**
`write_text_file`、`write_binary_file`、`set_window_theme`、`open_export_folder`

### 契约约定

- 所有跨进程结构体标注 `#[serde(rename_all = "camelCase")]`，与 TypeScript 类型天然对齐。
- 批量命令接收 `Vec<BatchSaveRequestItem>`，返回 `Vec<BatchSaveResultItem>`，**逐条报告成败，不因单条失败整体回滚**。
- 前端不直接 `invoke`，一律经 `trackedInvoke`，自动记录命令名、入参、耗时、结果或错误到调试事件总线。

## 5. 核心链路

### 5.1 批量元数据编辑

> 图示：[`assets/batch-edit.html`](./assets/batch-edit.html)

1. 用户拖拽文件或目录 → 目录走 `scan_directory` 递归枚举（`walkdir`）。
2. 路径入 `file-store`（zustand）去重。
3. 按扩展名分派 `parse_*_metadata_from_path`，Rust 侧用 `zip + xmltree` 或 `lopdf` 解析。
4. 返回 `DocumentMetadata` 填充 TanStack Form，支持模板批量套用。
5. 提交走 `batch_save_*_to_source`，Rust 侧 `build_updated_*_bytes` 重建合法文档字节后 `fs::write` 原地覆写。
6. 结果逐条汇总，成功计数与失败明细分别呈现。

清除痕迹（`batch_clear_and_save_*`）复用同一条链路，额外接收 `BatchClearOptions`（`templateId` + 字段覆盖）。

### 5.2 跨公司文档比对

> 图示：[`assets/compare-pipeline.html`](./assets/compare-pipeline.html)

`compare_metadata` → `compare::run_compare(files, options)`，五个阶段：

1. **归一化**（`normalize.rs`）：全半角统一、大小写折叠、停用词剔除、中文转拼音，产出稳定匹配键。
2. **对齐**（`align.rs`）：同公司文件不互比；先精确匹配归一化文件名，再走模糊相似度，低于 `fuzzyMatchFloor` 的落入 `unmatched`。每组产出 `gNNNN` 编号与三位小数的 `match_confidence`。
3. **差异**（`diff.rs` + `fields.rs`）：按字段字典逐项比对，产出 `DiffState`（`Same` / `Similar` / `Conflict` / `Missing`）。字段按 `FieldTier` 分为 `Risk` 与 `Info` 两级，决定前端着色。
4. **规则判定**（`rules.rs`）：识别跨公司共享作者、最后修改者、创建/修改时间邻近、残留批注与修订作者、模板指纹一致等信号，产出 `Finding`（带证据链）与 `PairRisk`（High / Medium / Low）。
5. **聚合**：风险等级按 `groupId` 回填到 `AlignedGroup`，统计进 `CompareStats`，连同 `SCHEMA_VERSION` 与 `DISCLAIMER` 组成 `CompareResult`。

前端 `lib/documents/compare/selectors.ts` 以纯函数派生视图数据，`export.ts` 经 SheetJS 生成 Excel 后交 `write_binary_file` 落盘。

> `DISCLAIMER` 随结果一并下发，明确结论仅为线索、需人工复核 —— 这是产品定位上的重要约束，不应在 UI 中省略。

### 5.3 隐藏信息提取

`extract_hidden_metadata`（`compare/extract_hidden.rs`）扫描文档中的批注作者、修订作者、XMP creators 与隐藏标记，回填进 `metadata`。它有双重身份：

- 作为 `hidden-page` 的独立能力，产出扫描概要、痕迹清单、作者汇总、未检出文件四段报告；
- 作为比对内核的前置输入，为 `rules.rs` 提供作者维度的风险信号。

## 6. 关键设计决策

**IPC 单点收口。** 所有 `invoke` 经 `trackedInvoke`，换来完整的调用埋点（命令、入参、耗时、结果），开发态可回放整条链路。代价是多一层封装，收益是排障成本大幅下降。

**文件 I/O 全部留在 Rust。** 前端只传路径。避免了大文件在 IPC 边界上的序列化开销，也让权限控制有唯一收敛点。

**批量操作不做事务。** 逐条返回成败而非整体回滚。批量场景下部分成功远比全体失败有价值，用户可针对失败项重试。

**比对内核纯函数化。** `run_compare` 无 I/O、无全局状态，输入 `CompareFileInput[]` 输出 `CompareResult`，可独立测试与推理。隐藏信息提取在入口处完成回填，规则层不再关心来源。

**Schema 版本显式化。** `SCHEMA_VERSION` 固化在 `model.rs`，前后端共识；契约变更必须显式升版。

**领域逻辑下沉。** 页面组件不含业务判断，`selectors` 保持纯函数。这让四个功能页的复杂度维持在可控范围。

## 7. 构建与质量

| 命令 | 用途 |
| --- | --- |
| `bun start` | Tauri 开发模式（前后端一起） |
| `bun dev` | 仅前端 Vite dev server |
| `bun run build` | `tsc -b` + Vite 构建 |
| `bun run build:mac` / `build:win` | 打包（Windows 走 `x86_64-pc-windows-gnu` + NSIS） |
| `bun run lint` | oxlint（type-aware）+ clippy（`-D warnings`） |
| `bun run format` | oxfmt + cargo fmt |
| `bun run typecheck` | `tsc --noEmit` |

Rust 与 TypeScript 两侧的 lint 都设为零容忍（clippy `-D warnings`），保证跨语言边界的一致性。

## 8. 图示维护

三张图由 archify 从 JSON 规格渲染，产物是**零依赖的独立 HTML**，内置深浅色切换与四种格式导出。

```bash
cd docs/assets
A=~/.codebuddy/skills/archify/bin/archify.mjs

# 校验（会检查标签溢出、连线穿越节点、边界越界等布局问题）
node $A validate architecture architecture.architecture.json
node $A validate dataflow     compare-pipeline.dataflow.json
node $A validate workflow     batch-edit.workflow.json

# 渲染
node $A render architecture architecture.architecture.json architecture.html
node $A render dataflow     compare-pipeline.dataflow.json compare-pipeline.html
node $A render workflow     batch-edit.workflow.json       batch-edit.html
```

**改图请改 JSON 再重新渲染，不要手工编辑 HTML** —— HTML 是生成产物，手改会在下次渲染时丢失。
