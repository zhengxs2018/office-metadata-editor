# office-metadata-editor 系统架构

> 基于源码实际结构生成（2026-08-07，v0.3.0）。
> 配套 [架构图](assets/architecture.html)。

## 1. 项目概况

当前项目是一个 **Tauri 2 + React/TypeScript** 桌面应用（构建工具 bun + Vite），
核心能力是 **Office/PDF 文档元数据的批量编辑**、**批量隐藏信息（编辑痕迹）提取** 与
**跨文档比对工作台**。前端负责交互与展示，重活（文件解析 / 写入 / 比对内核）全部下沉到 Rust 后端，
通过 Tauri IPC 边界隔离。

当前主线分支 `update-bun`，已完成「比对内核重构」（Rust `documents/compare/*` 与 TS `lib/documents/compare/*` 分层）。

## 2. 分层架构

```
┌──────────────────────────────────────────────────────────────────────┐
│  Web 前端 (React + Vite)                                              │
│                                                                        │
│  pages/ ── router/ ── contexts/ ── stores/ (zustand) ── hooks/         │
│      │            │            │            │                         │
│      └────────────┴─────┬──────┴────────────┘                         │
│                         ▼                                              │
│  lib/resources/documents.ts   (资源客户端门面 · documentsResource)     │
│      │                                                                │
│      ├── lib/tauri.ts          (trackedInvoke · Tauri 桥接)           │
│      ├── lib/documents/metadata  (按格式分派 Schema)                  │
│      ├── lib/documents/compare/* (比对/匹配 纯函数 + selectors)        │
│      └── lib/documents/compare/export.ts (xlsx 四表导出)              │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │  Tauri IPC invoke
┌───────────────────────────────▼──────────────────────────────────────┐
│  Tauri 进程边界 (Rust 后端)                                            │
│                                                                        │
│  lib.rs  (parse_* / save_* / scan_directory / write_binary_file       │
│           / export_compare_report 命令)                                │
│      │                                                                │
│  documents/   (docx / xlsx / pdf / doc 解析与写回)                    │
│      ├── compare/   (model/fields/align/diff/rules/normalize/         │
│      │               extract_hidden/mod —— 比对内核)                  │
│      └── extract_hidden_metadata  (编辑痕迹回填 metadata)             │
│      │                                                                │
│  export/      (docx / xlsx 写回与批量落盘)                            │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ 读写字节
                          Office / PDF 文件
```

## 3. 前端分层

| 层 | 路径 | 职责 |
| --- | --- | --- |
| 页面/路由 | `src/pages/`、`src/router/` | 五大视图：metadata · compare · hidden · audit · settings；`react-router` 导航 |
| 布局 | `src/layouts/` | 应用外壳与导航骨架 |
| 上下文 | `src/contexts/` | 文件列表、`LoadedDocument` 时序、OM 工作流、toast 提示 |
| 状态库 | `src/stores/` | `zustand` 管理 OM 多步骤工作流（如 `om-workflow-store`） |
| 复用逻辑 | `src/hooks/` | 跨组件共享副作用 |
| 业务组件 | `src/components/` | `om/`（导出中心、元数据显示等）、`base/`（文件拖拽等通用件） |
| 资源客户端 | `src/lib/resources/` | `documentsResource` 按文件类型分派 `show / replace / batch` |
| Tauri 桥接 | `src/lib/tauri.ts` | `trackedInvoke` 封装 IPC 调用 |
| 元数据 Schema | `src/lib/documents/metadata/` | 按 doc/docx/xlsx/pdf 驱动表单渲染、字段校验、对比报告 |
| 比对引擎 | `src/lib/documents/compare/*` | 文件名匹配键 + Levenshtein 距离做跨列对齐；`selectors.ts` 为纯函数 |
| 导出管线 | `src/lib/documents/compare/export.ts` | 经 Tauri `write_binary_file` + base64 生成 xlsx 四表 |

### 关键数据流（元数据编辑）

1. 用户操作 `pages/` 视图 → `documentsResource.show()` 读取元数据。
2. 资源层经 `lib/tauri.ts` 的 `trackedInvoke` 调用 Rust 命令 `parse_*`。
3. Rust `documents` 模块解析文件 → 返回结构化 `DocumentMetadata`。
4. `metadata` Schema 层根据文件类型渲染对应编辑表单并校验。
5. 用户修改 → `documentsResource.replace()` / `batch()` → Rust `save_*` 写回文件。

### 关键数据流（比对 / 隐藏信息）

1. 拖拽或目录扫描 → `scan_directory` 递归收集文件。
2. Rust `documents/compare` 内核做对齐（align）、差异（diff）、规则（rules）评分。
3. 前端按 `groups`（对齐矩阵）/ `findings`（风险线索）/ `unmatched`（未匹配）渲染工作台。
4. 用户触发导出 → `export.ts` 经 `write_binary_file` 落盘 xlsx 四表（概要/痕迹清单/作者汇总/未检出）。

## 4. 元数据 Schema 分派

`src/lib/documents/metadata/index.ts` 是中枢：根据 `file-type.ts` 判定的文件类型，
分派到各自的 schema 模块（`doc.ts` / `docx.ts` / `xlsx.ts` / `pdf.ts`），统一驱动：

- 表单字段渲染
- 字段校验
- 对比报告（`compare-report.ts`）

## 5. 比对 / 匹配引擎（v0.3.0 重构）

比对内核拆分为前后端两层，互不耦合：

| 层 | 路径 | 职责 |
| --- | --- | --- |
| Rust 内核 | `src-tauri/src/documents/compare/` | `model`（数据结构）/ `fields`（字段定义）/ `align`（跨文档对齐）/ `diff`（差异计算）/ `rules`（风险评分）/ `normalize`（归一化）/ `extract_hidden`（编辑痕迹提取）/ `mod`（命令入口） |
| TS 选择器 | `src/lib/documents/compare/` | `selectors.ts` 纯函数 `docNameOf`、按 groups.cells + unmatched 汇集来源文件；`export.ts` 导出管线 |
| TS 匹配 | `src/lib/documents/compare/matching.ts` | 文件名作为匹配键 + Levenshtein 距离做近似对齐 |

- 投标场景典型：投标件与底稿**同名不同目录**，以文件名为匹配键做跨目录对齐。
- 风险等级（高/中/低）由 `rules` 评分，前端按等级显式空态与提示。

## 6. 隐藏信息（编辑痕迹）提取

`hidden-page` 已从「单文件点击」改造为「批量拖拽 + 报告式」，对齐比对页体验：

- 空态用 `FileDropZone`（`@/components/base/file-drop-zone`），支持文件与目录递归扫描。
- 数据取自 `LoadedDocument.metadata` 的 `annotationAuthors` / `revisionAuthors` / `xmpCreators` / `hasHiddenMarkers`（**不是** `doc.hidden`）。
- 报告布局复用对比页 `ReportSection`（01 扫描概要 / 02 隐藏痕迹清单 / 03 作者汇总 / 04 未检出）。
- Rust 侧 `extract_hidden_metadata` 在解析阶段回填上述字段，前端只消费不再重算。

## 7. Tauri 后端（Rust）

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| 命令层 | `src-tauri/src/lib.rs` | 暴露 `parse_*` / `save_*` / `scan_directory` / `write_binary_file` / `export_compare_report` |
| 文档解析 | `src-tauri/src/documents/` | 按格式（docx/xlsx/pdf/doc）解析与写回元数据 |
| 比对内核 | `src-tauri/src/documents/compare/` | 跨文档对齐、差异、规则评分、隐藏提取 |
| 导出 | `src-tauri/src/export/` | docx/xlsx 写回与批量落盘；`DocumentMetadata` 跨模块复用 |
| 配置 | `src-tauri/tauri.conf.json`、`Cargo.toml` | Tauri 2 应用配置（窗口、权限、bundle）；依赖 calibre / lopdf / docx / calamine |

所有文件 IO 在 Rust 进程内完成，与 Web 前端存在**进程边界隔离**，前端无法直接访问文件系统。

## 8. 设计要点

- **进程边界隔离**：文件解析/写入全部在 Rust 侧，前端只经 IPC 交换结构化数据，安全且跨平台。
- **Schema 驱动**：新增文件类型只需在 `metadata/` 下补一个 schema 模块，前端表单与对比逻辑自动适配。
- **资源门面**：`documentsResource` 对前端屏蔽类型差异，统一 `show/replace/batch` 接口。
- **比对内核分层**：Rust 负责重计算（对齐/差异/规则），TS 负责纯函数选择（selectors）与导出，职责清晰。
- **投标增强**：比对/匹配引擎把"同名文档跨目录对齐"作为一等能力，区别于普通元数据工具。
- **报告式 UI 复用语**：比对页与隐藏页共享 `ReportSection`、可展开线索列表、作者归并面板等组件，降低维护成本。
