# 项目信息

## 概览

- 定位：本地离线、跨公司 Office 元数据取证识别工具（桌面原生，Tauri 2 封装）。
- 技术栈：Rust（Tauri 2 后端内核）+ React 19 / TypeScript / Vite（前端）。包管理用 `bun`。
- 核心能力：① 元数据编辑 ② 文档比对（串标线索识别）③ 隐藏属性提取 ④ 批量导出。
- 合规红线：产出一律为「线索 / 疑似 / 需复核」，禁「认定串标 / 违规 / 证据」等定性表述；报告须带免责声明。不提供任何抹除 / 清洗元数据功能。

## 构建命令

| 场景       | 命令                                        |
| ---------- | ------------------------------------------- |
| Rust 检查  | `cd src-tauri && cargo check --all-targets` |
| Rust 测试  | `cd src-tauri && cargo test`                |
| 前端类型   | `bun typecheck`（`tsc --noEmit`）           |
| 前端 lint  | `bun lint`（oxlint，非 eslint）             |
| 前端格式化 | `bun format`（oxfmt，非 prettier）          |
| 生产构建   | `bun run build`                             |
| 前端开发   | `bun run dev`                               |

## 目录结构

新建文件与模块须落位到下表指定位置：

```
src-tauri/src/
├── lib.rs                # 命令注册（generate_handler!）、setup、插件初始化、进程级 util
├── configuration.rs      # 配置中心
├── documents/
│   ├── mod.rs           # 模块门面：重新导出子模块 pub API
│   ├── compare/         # 文档比对内核
│   ├── hidden/          # 隐藏属性提取
│   ├── edit/            # 元数据编辑（docx.rs / pdf.rs / xlsx.rs）
│   ├── metadata/        # 元数据只读与保存（共享底座）
│   └── fs.rs            # 通用文件/文件夹工具（扫描、路径、zip 读取）
├── export/              # 导出（Excel/文本）
└── main.rs              # 仅 1 行转发 run()

src/
├── main.tsx             # 根挂载（ThemeProvider + StrictMode）
├── App.tsx              # 路由 + 全局 Provider + Toaster
├── pages/               # 页面级（按业务域）：compare-page / batch-page / hidden-page / editor-page
│   └── <page>/components/   # 页面内组件，不跨页复用
├── components/          # 全局复用组件（base / export / chrome / icons）
├── lib/                 # 纯逻辑层（无 React）：documents / configuration / resources
│   └── documents/compare/   # 比对纯函数 selectors / types / export
├── types/               # 跨模块共享 TS 类型
├── contexts/            # React Context（FileProvider / MetadataProvider）
├── stores/              # zustand 状态
└── router/              # 路由定义
```

- `documents/metadata/`：只读解析、原地保存、OOXML 通用 XML 读写（coreProperties/appProperties）的唯一实现位置；禁止在 `edit/` 重复实现。
- `documents/edit/{docx,pdf,xlsx}.rs`：仅格式特化逻辑，通用能力从 `metadata/` 复用。
- `documents/fs.rs`：通用文件/文件夹工具（scan_directory、convert_file_path_to_pathbuf、read_zip_entry、ensure_parent_dir）的唯一实现位置；禁止多处各写一份。
- 页面专属组件 → `pages/<page>/components/`；禁止塞进 `components/`。
- 纯逻辑（选择器、类型、导出构造）→ `lib/`，可单测、不依赖 JSX。
- 别名 `@/` → `src/`；新增导入优先用别名。
- 配置键命名空间：`ui.*` 仅前端消费，`engine.*` 仅 Rust 消费。

## 协作约定

- 跨模块共享改动（测试改动、构建配置、入口文件、路由、全局状态）须先与用户确认。
- 禁止自主编写测试用例 / 引入测试运行器，除非经用户审核确认必要性。

## codebase-memory-mcp

本地代码库语义索引 MCP（纯本地、零依赖静态二进制，无内置 LLM）。已在 `.codebuddy/mcp.json` 接入，`CBM_ALLOWED_ROOT` 限定到本项目根，`CBM_AUTO_INDEX=1` 首次连接自动索引。

- 触发索引：对话中说「Index this project」，或 CLI `codebase-memory-mcp cli index_repository --repo-path /Users/zhengxs/Documents/GitHub/office-metadata-editor`。
- 理解跨文件调用链、语义检索、变更影响面时优先调用其 MCP 工具（`search_code`/`get_symbol` 等）。
- 忽略规则用根目录 `.cbmignore`（gitignore 语法，低于 `.gitignore`）。
