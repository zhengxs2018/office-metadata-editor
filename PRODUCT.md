# Product

<!-- impeccable:product-schema 1 -->

## Platform

desktop (native wrapper — Tauri 2; design language is not OS-adaptive)

## Users

Mixed professional audience, all using the tool on the desktop for document metadata work:

- **Enterprise compliance reviewers** (legal / compliance / infosec): audit bid submissions, procurement documents, and other sensitive Office/PDF files for hidden authors and leakage risk.
- **Office / administrative staff**: routinely process large volumes of Office documents, clean personal metadata before external sending.
- **Technical / developer users**: care about metadata field structure and scriptable/large batch operations.

All roles share a desktop-native, offline workflow; no web/cloud expectation.

## Product Purpose

本地优先的桌面工具，读取、编辑、清理并对比 Office/PDF 文档元数据。帮助用户在文档对外发送或归档前，发现并消除隐藏的作者、修订、公司标识等敏感痕迹，并支持跨公司批量比对以追溯泄密风险。Success = 用户在本地、不依赖网络的情况下，完整、可信地完成单文件编辑、批量清洗、跨公司对比与导出。

## Positioning

三位一体的本地化卖点，单一相邻工具难以同时复制：

- **本地离线 + 隐私安全**：纯本地处理，文档不出本机，适合敏感/涉密场景。
- **跨公司对比追溯泄密**：按公司分组智能比对，发现同一作者跨公司、公司标识冲突等风险。
- **批量能力 + 桌面原生**：一次性处理上百文档，紧凑原生桌面体验（880×580 高密度窗口）。

## Operating Context

- 运行在 macOS / Windows 10/11 的紧凑桌面窗口（默认 880×580，最小 780×520）。
- 文件来源：用户拖拽或选择本地 .docx / .doc / .xlsx / .pdf；支持目录递归扫描。
- 核心工作流：导入 → 解析元数据 → （编辑 / 批量清洗 / 跨公司对比）→ 导出（JSON / CSV / XML / 自定义字段）或原位保存。
- 审计与合规场景要求可追溯：对比报告、隐藏痕迹清单、作者汇总、未检出文件清单。
- 主题跟随系统深色/浅色切换。

## Capabilities and Constraints

- 格式支持：DOCX / XLSX / PDF 完整读写；DOC 兼容模式（旁路 JSON）。
- 主要功能面：单文件编辑、批量处理、对比视图、隐藏信息提取、导出中心、主题切换。
- 技术约束：Tauri 2 + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4；后端 Rust（zip、lopdf、xmltree、pinyin）；构建用 bun；图标用 @hugeicons/react。
- 设计约束：沿用现有 design.md（Sky 主题 + HugeIcons + 紧凑桌面密度）；UI 文案必须保持中文。
- 既有页面模块：home-page、editor-page、batch-page、compare-page、hidden-page。
- 未决：暂无。

## Brand Commitments

- UI 文案语言：中文（必须保留，未来设计与文案默认中文，不默认英文）。
- 既有视觉系统：沿用项目 design.md 的 Sky Theme、HugeIcons、紧凑桌面密度规范；不在此文件决定视觉世界。
- 命名：产品名 "Office 元数据编辑器"（Office Metadata Editor）。

## Evidence on Hand

- 设计系统：`design.md`（v2.0.0，Sky 主题规范，含窗口/排版/色彩/组件指南）。
- 界面预览：`screenshots/` 下 home / edit / batch / batch-export / compare / compare-report 六张图。
- 入口与设计代码：`src/pages/`（home、editor、batch、compare、hidden）、`src/components/`、`src-tauri/`。
- README 功能与格式对照表为权威功能说明。

## Product Principles

1. **本地优先，隐私不可妥协**：任何功能不得默认上传或依赖云端；文档处理全程离线。
2. **密度即专业**：紧凑桌面密度（13px 正文）是高密度工作场景的专业表达，不为"大气"牺牲信息量。
3. **三能力闭环**：编辑、批量、对比相互衔接，构成单文档到跨公司的完整证据链。
4. **可追溯胜过好看**：报告、清单、汇总必须可被复核，视觉服务于可信与可证。

## Accessibility & Inclusion

- 深色/浅色主题跟随系统，必须保证两套主题下对比度与可读性达标。
- 紧凑密度下仍需保证可操作目标尺寸与可读性（不牺牲可访问性换取密度）。
