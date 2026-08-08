/**
 * 导出后的统一收尾：提示 + 按配置打开文件所在目录。
 *
 * 所有导出入口（对比报告 / 批量元数据 / 导出中心 / 隐藏信息）都应走这里，
 * 避免"某个页面忘了打开文件夹"或"开关只对部分页面生效"。
 */

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

import { getConfiguration } from './index';

/** 导出后是否自动打开所在目录（用户可在设置中关闭）。 */
export function shouldRevealAfterExport(): boolean {
  return getConfiguration('ui.export').get('revealAfterExport', true);
}

/** 从完整路径提取文件名（跨平台，兼容可能的正斜杠/反斜杠）。 */
function basename(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

/**
 * 打开文件所在目录。
 *
 * 后端会再次校验 `engine.export.revealCommandEnabled`，
 * 返回 `false` 表示被后端策略拦截，此时不提示"已打开"。
 */
export async function revealInFolder(filePath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('open_export_folder', { filePath });
  } catch (error) {
    console.error('打开文件夹失败:', error);
    return false;
  }
}

/**
 * 在系统文件管理器中定位并选中指定文件。
 *
 * 后端会再次校验 `engine.export.revealCommandEnabled`，返回 `false` 表示被拦截。
 */
export async function revealFileInFolder(filePath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('reveal_file_in_folder', { filePath });
  } catch (error) {
    console.error('定位文件失败:', error);
    return false;
  }
}

/**
 * 导出成功后的标准收尾：成功提示 +（可选）打开目录。
 *
 * 提示只展示文件名（导出后已自动打开目录，完整路径无意义）。
 *
 * @param filePath 导出文件的完整路径
 * @param description 提示文案，默认展示文件名
 */
export async function notifyExportSuccess(filePath: string, description?: string): Promise<void> {
  const reveal = shouldRevealAfterExport();
  const opened = reveal ? await revealInFolder(filePath) : false;

  const showToast = getConfiguration('ui.export').get('showSuccessToast', true);
  if (!showToast) return;

  toast.success('导出成功', {
    description: description ?? `已导出 ${basename(filePath)}`,
    action: opened
      ? undefined
      : {
          label: '打开文件夹',
          onClick: () => {
            void revealInFolder(filePath);
          },
        },
  });
}
