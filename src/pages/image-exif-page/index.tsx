import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';
import {
  Camera01Icon,
  MapPinIcon,
  Delete01Icon,
  SaveIcon,
  FileAddIcon,
  Loading02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';

import { PageLayout } from '@/layouts/page-layout';
import { HugeIcon } from '@/components/icons/huge-icon';
import { Button } from '@/components/ui/button';
import { cn, formatFileSize } from '@/lib/utils';
import { FileDropZone } from '@/components/base/file-drop-zone';
import {
  IMAGE_FILE_EXTENSIONS,
  IMAGE_EXIF_CLEARABLE,
  OPEN_IMAGE_DIALOG_FILTER,
} from '@/lib/documents/supported-formats';
import {
  parseImageExifFromPath,
  saveImageExifToSource,
  saveImageExifAs,
} from '@/lib/tauri';
import { ROUTES } from '@/router/paths';
import type { ImageExif } from '@/types/image-exif';

type ExifItemStatus = 'loading' | 'ready' | 'error' | 'cleared';

interface ExifItem {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  exif: ImageExif | null;
  status: ExifItemStatus;
  error?: string;
}

function buildExifItem(filePath: string): ExifItem {
  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
  const extensionMatch = fileName.match(/\.([^.]+)$/);
  const fileType = extensionMatch ? extensionMatch[1].toLowerCase() : '';

  return {
    id: crypto.randomUUID(),
    filePath,
    fileName,
    fileType,
    fileSize: 0,
    exif: null,
    status: 'loading',
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const ImageExifPage: React.FC = () => {
  const [items, setItems] = React.useState<ExifItem[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const activeItem = React.useMemo(
    () => items.find((item) => item.id === activeId) ?? items[0] ?? null,
    [items, activeId],
  );

  React.useEffect(() => {
    if (activeId === null && items.length > 0) {
      setActiveId(items[0].id);
    }
  }, [items, activeId]);

  const addFiles = React.useCallback((filePaths: string[]) => {
    if (filePaths.length === 0) return;

    setItems((prev) => {
      const existingPaths = new Set(prev.map((item) => item.filePath.toLowerCase()));
      const newItems = filePaths
        .filter((path) => !existingPaths.has(path.toLowerCase()))
        .map(buildExifItem);

      if (newItems.length === 0) return prev;

      newItems.forEach((item) => {
        parseImageExifFromPath(item.filePath)
          .then((exif) => {
            setItems((current) =>
              current.map((it) =>
                it.id === item.id
                  ? { ...it, exif, fileSize: exif.fileSize, status: 'ready' }
                  : it,
              ),
            );
          })
          .catch((error) => {
            setItems((current) =>
              current.map((it) =>
                it.id === item.id
                  ? { ...it, status: 'error', error: toErrorMessage(error) }
                  : it,
              ),
            );
          });
      });

      return [...prev, ...newItems];
    });
  }, []);

  const handleOpen = React.useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [OPEN_IMAGE_DIALOG_FILTER],
    });

    if (Array.isArray(selected)) {
      addFiles(selected);
    } else if (typeof selected === 'string') {
      addFiles([selected]);
    }
  }, [addFiles]);

  const handleRemove = React.useCallback((id: string) => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const next = prev.filter((item) => item.id !== id);
      const fallback = next[index] ?? next[index - 1] ?? next[0] ?? null;
      setActiveId(fallback?.id ?? null);
      return next;
    });
  }, []);

  const handleClearCurrent = React.useCallback(async () => {
    if (!activeItem || activeItem.status !== 'ready') return;

    setBusy(true);
    try {
      await saveImageExifToSource(activeItem.filePath);
      const exif = await parseImageExifFromPath(activeItem.filePath);
      setItems((current) =>
        current.map((item) =>
          item.id === activeItem.id
            ? { ...item, exif, fileSize: exif.fileSize, status: 'cleared' }
            : item,
        ),
      );
      toast.success('EXIF 已清理并写回');
    } catch (error) {
      toast.error(`清理失败：${toErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }, [activeItem]);

  const handleSaveAsCurrent = React.useCallback(async () => {
    if (!activeItem || activeItem.status !== 'ready') return;

    setBusy(true);
    try {
      const target = await saveImageExifAs(activeItem.filePath);
      if (target) toast.success(`已另存清理副本：${target}`);
    } catch (error) {
      toast.error(`另存失败：${toErrorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }, [activeItem]);

  const isClearable =
    activeItem !== null && IMAGE_EXIF_CLEARABLE.some((ext) => ext === activeItem.fileType);

  const headerContent = (
    <div className="min-w-0">
      <p className="truncate font-heading text-base font-semibold title-text">
        图片 EXIF 提取与清理
      </p>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleOpen} disabled={busy}>
        <HugeIcon icon={FileAddIcon} size={14} />
        打开图片
      </Button>
      {activeItem?.status === 'ready' && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAsCurrent}
            disabled={busy || !isClearable}
          >
            <HugeIcon icon={SaveIcon} size={14} />
            另存为
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearCurrent}
            disabled={busy || !isClearable}
          >
            <HugeIcon icon={Delete01Icon} size={14} />
            清理 EXIF
          </Button>
        </>
      )}
    </div>
  );

  return (
    <PageLayout backTo={ROUTES.home} header={headerContent} actions={headerActions} bleed>
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center p-6">
          <FileDropZone
            onFilesSelected={addFiles}
            accept={[...IMAGE_FILE_EXTENSIONS]}
            className="h-96 w-full max-w-2xl"
          />
        </div>
      ) : (
        <div className="flex h-full w-full">
          {items.length > 1 && (
            <ImageSidebar
              items={items}
              activeId={activeId}
              onSelect={setActiveId}
              onRemove={handleRemove}
            />
          )}
          <main className="flex flex-1 flex-col overflow-auto p-6">
            {activeItem ? (
              <ExifContent item={activeItem} onRetry={() => addFiles([activeItem.filePath])} />
            ) : (
              <LoadingState />
            )}
          </main>
        </div>
      )}
    </PageLayout>
  );
};

const ImageSidebar: React.FC<{
  items: ExifItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ items, activeId, onSelect, onRemove }) => (
  <aside className="flex w-64 flex-col border-r border-border bg-muted/30">
    <div className="border-b border-border px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">
        已加载 {items.length} 张图片
      </span>
    </div>
    <div className="flex-1 overflow-auto p-2">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group relative">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(item.id);
                }
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-xs',
                item.id === activeId
                  ? 'bg-background shadow-sm ring-1 ring-border'
                  : 'hover:bg-background/60',
              )}
            >
              <HugeIcon
                icon={Camera01Icon}
                size={16}
                className="shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.fileName}</p>
                <p className="truncate text-muted-foreground">
                  {item.status === 'loading' && '读取中…'}
                  {item.status === 'error' && '读取失败'}
                  {item.status === 'cleared' && '已清理'}
                  {item.status === 'ready' && formatFileSize(item.fileSize)}
                </p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(item.id);
                }}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              >
                <HugeIcon icon={Delete01Icon} size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </aside>
);

const ExifContent: React.FC<{ item: ExifItem; onRetry: () => void }> = ({ item, onRetry }) => {
  if (item.status === 'loading') return <LoadingState />;
  if (item.status === 'error') {
    return <ErrorState message={item.error ?? '读取失败'} onRetry={onRetry} />;
  }
  if (!item.exif) return null;
  return <ExifDetail exif={item.exif} />;
};

const LoadingState: React.FC = () => (
  <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
    <HugeIcon icon={Loading02Icon} size={32} className="animate-spin" />
    <p className="text-sm">正在读取 EXIF…</p>
  </div>
);

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex h-full flex-col items-center justify-center gap-3">
    <HugeIcon icon={AlertCircleIcon} size={32} className="text-destructive" />
    <p className="text-sm text-destructive">{message}</p>
    <Button variant="outline" size="sm" onClick={onRetry}>
      重试
    </Button>
  </div>
);

const ExifDetail: React.FC<{ exif: ImageExif }> = ({ exif }) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="rounded bg-muted px-2 py-0.5">{exif.fileName}</span>
      <span className="rounded bg-muted px-2 py-0.5">.{exif.fileType}</span>
      <span className="rounded bg-muted px-2 py-0.5">{formatFileSize(exif.fileSize)}</span>
      {exif.thumbnailPresent && (
        <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-600">含缩略图</span>
      )}
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <InfoCard title="拍摄设备">
        <Field label="厂商" value={exif.camera.make} />
        <Field label="型号" value={exif.camera.model} />
        <Field label="镜头" value={exif.camera.lensModel} />
        <Field label="软件" value={exif.camera.software} />
        <Field
          label="机身序列号"
          value={exif.camera.serialNumber}
          highlight={!!exif.camera.serialNumber}
        />
      </InfoCard>

      <InfoCard title="拍摄参数">
        <Field label="拍摄时间" value={exif.capture.dateTimeOriginal} />
        <Field label="曝光时间" value={exif.capture.exposureTime} />
        <Field label="光圈" value={exif.capture.fNumber} />
        <Field label="ISO" value={exif.capture.iso} />
        <Field label="焦距" value={exif.capture.focalLength} />
        <Field label="方向" value={exif.capture.orientation} />
      </InfoCard>
    </div>

    {exif.gps && (
      <InfoCard title="GPS 定位">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 text-xs">
            <span>纬度 {exif.gps.latitude.toFixed(6)}</span>
            <span>经度 {exif.gps.longitude.toFixed(6)}</span>
            {exif.gps.altitude !== null && <span>海拔 {exif.gps.altitude.toFixed(1)} m</span>}
          </div>
          <a
            href={exif.gps.mapUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-600',
              'hover:bg-sky-500/20 dark:text-sky-300',
            )}
          >
            <HugeIcon icon={MapPinIcon} size={14} />
            在地图中查看
          </a>
        </div>
      </InfoCard>
    )}

    {exif.rawFields.length > 0 && (
      <InfoCard title={`原始 EXIF 字段（${exif.rawFields.length}）`}>
        <div className="max-h-72 overflow-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 text-left font-medium">标签</th>
                <th className="px-3 py-1.5 text-left font-medium">值</th>
              </tr>
            </thead>
            <tbody>
              {exif.rawFields.map((field, index) => (
                <tr key={`${field.tag}-${index}`} className="border-t border-border">
                  <td className="px-3 py-1.5 align-top font-mono text-muted-foreground">{field.tag}</td>
                  <td className="break-all px-3 py-1.5">{field.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    )}
  </div>
);

const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-lg border border-border bg-background p-4">
    <h3 className="mb-3 text-sm font-semibold">{title}</h3>
    {children}
  </section>
);

const Field: React.FC<{ label: string; value: string; highlight?: boolean }> = ({
  label,
  value,
  highlight,
}) => (
  <div className="flex items-baseline justify-between gap-3 py-1 text-xs">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span
      className={cn(
        'break-all text-right',
        highlight && 'font-medium text-amber-600 dark:text-amber-400',
      )}
    >
      {value || '—'}
    </span>
  </div>
);

export default ImageExifPage;
