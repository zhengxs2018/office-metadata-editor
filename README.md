# Office 元数据编辑器

一个基于 Tauri 2 + React 19 的桌面应用，用于本地读取、编辑、清理和批量处理 Office/PDF 文档元数据。

## 功能概览

- 支持单文件编辑与批量处理
- 支持拖拽导入和文件选择导入
- 支持字段编辑、清空元数据、保存覆盖、另存为
- 所有处理在本地完成，不依赖外部服务

## 支持格式

- DOCX：直接读取与写入文档内元数据
- XLSX：直接读取与写入文档内元数据
- PDF：读取与写入 PDF Info 字典元数据

说明：DOC 属于兼容模式，保存行为稍有不同，请在使用前确认。

## 界面预览

<table>
  <tr>
    <td align="center" width="33%">
      <img src="./screenshots/home.png" alt="首页" width="100%" />
      <br/><sub><b>首页</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="./screenshots/edit.png" alt="编辑页" width="100%" />
      <br/><sub><b>编辑页</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="./screenshots/batch.png" alt="批量操作" width="100%" />
      <br/><sub><b>批量操作</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="33%">
      <img src="./screenshots/batch-export.png" alt="批量导出" width="100%" />
      <br/><sub><b>批量导出</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="./screenshots/compare.png" alt="对比视图" width="100%" />
      <br/><sub><b>对比视图</b></sub>
    </td>
    <td align="center" width="33%">
      <img src="./screenshots/compare-report.png" alt="对比报告" width="100%" />
      <br/><sub><b>对比报告</b></sub>
    </td>
  </tr>
</table>

## 本地开发

1. 开发环境要求
   - Node.js >= 24.14.0
   - pnpm >= 10
   - Rust（stable）
2. 安装依赖

   ```bash
   pnpm install
   pnpm start
   ```

## 构建

如果需要在 macOS 上交叉编译：

```bash
brew install nsis mingw-w64
pnpm build:win
```

根据自己的需求构建分发软件：

```bash
pnpm build:mac
pnpm build:win
```

## LICENSE

MIT
