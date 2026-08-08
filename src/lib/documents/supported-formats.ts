export const SUPPORTED_FILE_EXTENSIONS = ['docx', 'doc', 'xlsx', 'pdf'] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

export const OPEN_FILE_DIALOG_FILTER = {
  name: 'Office 文档',
  extensions: [...SUPPORTED_FILE_EXTENSIONS],
};
