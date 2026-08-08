import type {
  DocumentFileType,
  DocumentMetadata,
  MetadataPreviewGroup,
  MetadataSchema,
  MetadataSection,
} from '@/types/metadata';
import {
  applyMetadataFieldUpdateBySchema,
  buildMetadataPreviewGroups,
  buildMetadataSections,
  clearMetadataBySchemaConfig,
} from './base';
import { docMetadataSchema } from './doc';
import { docxMetadataSchema } from './docx';
import { pdfMetadataSchema } from './pdf';
import { xlsxMetadataSchema } from './xlsx';

const schemaMap: Record<DocumentFileType, MetadataSchema> = {
  docx: docxMetadataSchema,
  doc: docMetadataSchema,
  xlsx: xlsxMetadataSchema,
  pdf: pdfMetadataSchema,
  unknown: docxMetadataSchema,
};

export function resolveMetadataSchema(fileType: DocumentFileType): MetadataSchema {
  return schemaMap[fileType] ?? schemaMap.unknown;
}

export function resolveMetadataSections(
  fileType: DocumentFileType,
  metadata: DocumentMetadata,
): MetadataSection[] {
  const schema = resolveMetadataSchema(fileType);
  return buildMetadataSections(schema, metadata);
}

export function resolveMetadataPreviewGroups(
  fileType: DocumentFileType,
  metadata: DocumentMetadata,
): MetadataPreviewGroup[] {
  const schema = resolveMetadataSchema(fileType);
  return buildMetadataPreviewGroups(schema, metadata);
}

export function applyMetadataFieldUpdate(
  fileType: DocumentFileType,
  metadata: DocumentMetadata,
  category: MetadataSection['category'],
  field: string,
  value: string | number,
): DocumentMetadata {
  const schema = resolveMetadataSchema(fileType);
  return applyMetadataFieldUpdateBySchema(schema, metadata, category, field, value);
}

export function clearMetadataBySchema(
  fileType: DocumentFileType,
  metadata: DocumentMetadata,
  defaultMetadata: DocumentMetadata,
): DocumentMetadata {
  const schema = resolveMetadataSchema(fileType);
  return clearMetadataBySchemaConfig(schema, metadata, defaultMetadata);
}
