# Office 元数据编辑器

基于 Tauri 2 + React 19 的跨平台桌面应用，本地读取、编辑、清理和对比 Office/PDF 文档元数据。

## 功能

- **单文件编辑**：拖拽导入，即时解析并编辑元数据，支持保存/另存为
- **批量处理**：批量导入数十上百个文档，一键清理敏感元数据并原位保存
- **对比视图**：按公司分组导入，跨公司智能比对（同一作者风险、公司标识冲突）
- **导出中心**：支持 JSON / CSV / XML 格式导出，自定义字段
- **深色/浅色主题**：跟随系统切换

## 支持格式

| 格式 | 读写                  |
| ---- | --------------------- |
| DOCX | 完整读写              |
| XLSX | 完整读写              |
| PDF  | 完整读写              |
| DOC  | 兼容模式（旁路 JSON） |

## 界面预览

<table>
  <tr>
    <td align="center" width="33%"><img src="./screenshots/home.png" alt="首页" width="100%" /><br/><sub><b>首页</b></sub></td>
    <td align="center" width="33%"><img src="./screenshots/edit.png" alt="编辑页" width="100%" /><br/><sub><b>编辑页</b></sub></td>
    <td align="center" width="33%"><img src="./screenshots/batch.png" alt="批量操作" width="100%" /><br/><sub><b>批量操作</b></sub></td>
  </tr>
  <tr>
    <td align="center" width="33%"><img src="./screenshots/batch-export.png" alt="批量导出" width="100%" /><br/><sub><b>批量导出</b></sub></td>
    <td align="center" width="33%"><img src="./screenshots/compare.png" alt="对比视图" width="100%" /><br/><sub><b>对比视图</b></sub></td>
    <td align="center" width="33%"><img src="./screenshots/compare-report.png" alt="对比报告" width="100%" /><br/><sub><b>对比报告</b></sub></td>
  </tr>
</table>

## 技术栈

Tauri 2 + React 19 + TypeScript + shadcn/ui + Tailwind CSS 4，后端 Rust（zip、lopdf、xmltree、pinyin）。

## 本地开发

```bash
# 环境：bun>=1.3.14、Rust stable
bun install
bun start
```

构建：

```bash
bun bump <new-version>

bun build:mac   # macOS
bun build:win   # Windows（需 mingw-w64）
```

## License

MIT
