import type { MetadataSchema } from '@/types/metadata';
import { commonDocumentFieldSchemas, commonDublinCoreFieldSchemas, defaultSyncRules } from './base';

export const docMetadataSchema: MetadataSchema = {
  fileType: 'doc',
  sections: [
    {
      id: 'doc-document-properties',
      title: '文档属性',
      description: '兼容模式文档元数据',
      category: 'documentProperties',
      fields: commonDocumentFieldSchemas,
    },
    {
      id: 'doc-dublin-core',
      title: 'Dublin Core',
      description: '跨系统兼容的核心元数据',
      category: 'coreProperties',
      fields: commonDublinCoreFieldSchemas,
    },
  ],
  previewGroups: [
    {
      id: 'doc-compat',
      title: '兼容模式信息',
      properties: [
        { label: '公司', span: 2, source: { category: 'appProperties', field: 'company' } },
        { label: '管理者', span: 2, source: { category: 'appProperties', field: 'manager' } },
        { label: '应用程序', span: 2, source: { category: 'appProperties', field: 'application' } },
      ],
    },
  ],
  syncRules: defaultSyncRules,
};
