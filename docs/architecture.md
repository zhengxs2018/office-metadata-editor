# TabKit 系统架构

> 基于源码实际结构生成（2026-08-06）。
> 配套 [架构图](assets/architecture.html)。

## 1. 项目概况

当前项目是一个 **Tauri 2 + React/TypeScript** 桌面应用，核心能力是 **Office/PDF 文档元数据的批量编辑**
与 **招标文件（OM）管理**。前端用 Vite + React 构建，重活（文件解析/写入）全部下沉到 Rust 后端，
通过 Tauri IPC 边界隔离。

## 2. 分层架构

```
┌──────────────────────────────────────────────────────────────────────┐
│  Web 前端 (React + Vite)                                              │
│                                                                        │
│  pages/ ── router/ ── contexts/ ── stores/ (zustand)                   │
│      │            │            │            │                         │
│      └────────────┴─────┬──────┴────────────┘                         │
│                         ▼                                              │
│  lib/resources/documents.ts  (资源客户端门面 · documentsResource)      │
│      │                                                                │
│      ├── lib/tauri.ts        (trackedInvoke · Tauri 桥接)            │
│      ├── lib/documents/metadata  (按格式分派 Schema)                 │
│      └── lib/documents/compare-* (文件名匹配 + Levenshtein 对齐)      │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ IPC invoke
┌───────────────────────────────▼──────────────────────────────────────┐
│  Tauri 进程边界 (Rust 后端)                                            │
│                                                                        │
│  lib.rs  (parse_*/save_* 命令)                                         │
│      │                                                                │
│  documents 模块  (docx / xlsx / pdf / doc 解析与写回)                 │
│      │                                                                │
│  文件系统 IO（本地文件读写）                                           │
└───────────────────────────────┬──────────────────────────────────────┘
                                 │ 读写字节
                          Office / PDF 文件
```

## 3. 前端分层

| 层 | 路径 | 职责 |
| --- | --- | --- |
| 页面/路由 | `src/pages/`、`src/router/` | 导航与视图承载，`react-router` 驱动 |
| 上下文 | `src/contexts/` | 元数据时序、OM 工作流、toast 提示 |
| 状态库 | `src/stores/` | `zustand` 管理 OM 多步骤工作流状态（`om-workflow-store`） |
| 资源客户端 | `src/lib/resources/` | `documentsResource` 按文件类型分派 `show/replace/batch` |
| Tauri 桥接 | `src/lib/tauri.ts` | `trackedInvoke` 封装 IPC 调用 |
| 元数据 Schema | `src/lib/documents/metadata/` | 按文件类型（doc/docx/xlsx/pdf）驱动表单渲染与校验 |
| 对比引擎 | `src/lib/documents/compare-*` | 文件名匹配键 + Levenshtein 距离做跨列对齐（投标核心能力） |

### 关键数据流（元数据编辑）

1. 用户操作 `pages/` 视图 → `documentsResource.show()` 读取元数据。
2. 资源层经 `lib/tauri.ts` 的 `trackedInvoke` 调用 Rust 命令 `parse_*`。
3. Rust `documents` 模块解析文件 → 返回结构化元数据。
4. `metadata` Schema 层根据文件类型渲染对应编辑表单并校验。
5. 用户修改 → `documentsResource.replace()`/`batch()` → Rust `save_*` 写回文件。

## 4. 元数据 Schema 分派

`src/lib/documents/metadata/index.ts` 是中枢：根据 `file-type.ts` 判定的文件类型，
分派到各自的 schema 模块（`doc.ts` / `docx.ts` / `xlsx.ts` / `pdf.ts`），统一驱动：

- 表单字段渲染
- 字段校验
- 对比报告（`compare-report.ts`）

## 5. 对比 / 匹配引擎

`src/lib/documents/compare-matching.ts` 实现跨文档对齐：

- 以 **文件名** 作为匹配键（投标场景典型：投标件与底稿同名不同目录）。
- 用 **Levenshtein 距离** 处理文件名近似匹配，生成 `compare-report`。

## 6. Tauri 后端（Rust）

| 模块 | 路径 | 职责 |
| --- | --- | --- |
| 命令层 | `src-tauri/src/lib.rs` | 暴露 `parse_*` / `save_*` 命令供前端 invoke |
| 文档解析 | `src-tauri/src/documents/` | 按格式（docx/xlsx/pdf/doc）解析与写回元数据 |
| 配置 | `src-tauri/tauri.conf.json` | Tauri 2 应用配置（窗口、权限、bundle） |

所有文件 IO 在 Rust 进程内完成，与 Web 前端存在**进程边界隔离**，前端无法直接访问文件系统。

## 7. 设计要点

- **进程边界隔离**：文件解析/写入全部在 Rust 侧，前端只经 IPC 交换结构化数据，安全且跨平台。
- **Schema 驱动**：新增文件类型只需在 `metadata/` 下补一个 schema 模块，前端表单与对比逻辑自动适配。
- **资源门面**：`documentsResource` 对前端屏蔽类型差异，统一 `show/replace/batch` 接口。
- **投标增强**：对比/匹配引擎把"同名文档跨目录对齐"作为一等能力，区别于普通元数据工具。
