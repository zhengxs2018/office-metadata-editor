export const SUPPORTED_FILE_EXTENSIONS = ['docx', 'doc', 'xlsx', 'pdf'] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

export const OPEN_FILE_DIALOG_FILTER = {
  name: 'Office 文档',
  extensions: [...SUPPORTED_FILE_EXTENSIONS],
};

// 图片 EXIF 支持范围：独立于办公文档过滤，避免污染批量/比对入口。
export const IMAGE_FILE_EXTENSIONS = ['jpg', 'jpeg', 'heic', 'heif', 'png', 'webp'] as const;

export type ImageFileExtension = (typeof IMAGE_FILE_EXTENSIONS)[number];

// 当前支持 EXIF 清理的格式（JPEG/HEIC 段剥离成熟），PNG/WebP 仅可读取。
export const IMAGE_EXIF_CLEARABLE = ['jpg', 'jpeg', 'heic', 'heif'] as const;

export const OPEN_IMAGE_DIALOG_FILTER = {
  name: '图片（含 EXIF）',
  extensions: [...IMAGE_FILE_EXTENSIONS],
};
