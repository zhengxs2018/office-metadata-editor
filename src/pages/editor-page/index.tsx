import React, { useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "@/router/paths"
import { useMetadata } from "@/contexts/metadata-context"
import { useFileContext } from "@/contexts/file-context"
import { OmEditorToolbar } from "@/components/om/om-editor-toolbar"
import { normalizeDocumentFileType } from "@/lib/documents/file-type"
import { EditorLayout } from "@/layouts/editor-layout"
import { EditorPageSidebar } from "@/pages/editor-page/components/editor-page-sidebar"
import { EditorPageForm } from "@/pages/editor-page/components/editor-page-form"
import { EditorPageSkeleton } from "@/pages/editor-page/components/editor-page-skeleton"
import { resolveMetadataPreviewGroups } from "@/lib/documents/metadata"

export const EditorPage: React.FC = () => {
  const navigate = useNavigate()
  const { metadata, documents } = useMetadata()
  const { files, activeFileId, selectFile, removeFile, isLoading } = useFileContext()

  const activeFile = useMemo(() => {
    if (files.length === 0) return null
    if (!activeFileId) return files[0]
    return files.find(item => item.id === activeFileId) ?? files[0]
  }, [files, activeFileId])

  const activeFileType = useMemo(() => {
    return normalizeDocumentFileType(
      metadata?.fileType || activeFile?.filePath.split(".").pop() || "",
    )
  }, [metadata, activeFile])

  const previewGroups = useMemo(() => {
    if (!metadata) return []
    return resolveMetadataPreviewGroups(activeFileType, metadata)
  }, [activeFileType, metadata])

  useEffect(() => {
    if (!isLoading && files.length === 0) {
      navigate(ROUTES.home)
    }
  }, [files.length, isLoading, navigate])

  const showSidebar = files.length > 1

  return (
    <EditorLayout
      showSidebarTrigger={showSidebar}
      sidebar={
        showSidebar ? (
          <EditorPageSidebar
            files={files}
            documents={documents}
            activeFileId={activeFileId}
            onSelectFile={selectFile}
            onRemoveFile={removeFile}
          />
        ) : undefined
      }
      actions={<OmEditorToolbar />}
    >
      {activeFile?.status === "ready" ? (
        <EditorPageForm fileType={activeFileType} previewGroups={previewGroups} />
      ) : (
        <EditorPageSkeleton />
      )}
    </EditorLayout>
  )
}

export default EditorPage
