import React, { useCallback, useMemo, useState } from "react";
import { HugeIcon } from "@/components/icons/huge-icon";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { invoke } from "@tauri-apps/api/core";

import { Button } from "@/components/ui/button";
import { PageLayout } from "@/layouts/page-layout";
import { useFileContext, type CompanyEntry } from "@/contexts/file-context";
import { useMetadata, type LoadedDocument } from "@/contexts/metadata-context";
import {
  EMPTY_COMPARE_RESULT,
  type CompareFileInput,
  type CompareResult,
} from "@/lib/documents/compare/types";
import { ROUTES } from "@/router/paths";
import { DropZone } from "@/pages/compare-page/components/drop-zone";
import { CompanyCard } from "@/pages/compare-page/components/company-card";
import { CompareWorkbench } from "@/pages/compare-page/components/compare-workbench";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toCompareInputs(
  documents: LoadedDocument[],
  companyById: Record<string, CompanyEntry>,
): CompareFileInput[] {
  return documents
    .filter((doc) => doc.status === "ready" && doc.companyId)
    .map((doc) => {
      const props = doc.metadata.documentProperties;
      const app = doc.metadata.appProperties;
      const company = doc.companyId ? companyById[doc.companyId] : undefined;
      return {
        id: doc.id,
        companyId: doc.companyId ?? "",
        companyName: text(company?.name),
        fileName: doc.metadata.fileName,
        creator: text(props?.creator),
        lastModifiedBy: text(props?.lastModifiedBy),
        appCompany: text(app?.company),
        manager: text(app?.manager),
        template: text(app?.template),
        application: text(app?.application),
        appVersion: text(app?.appVersion),
        created: text(props?.created),
        modified: text(props?.modified),
        revision: text(props?.revision),
        title: text(props?.title),
        subject: text(props?.subject),
        keywords: text(props?.keywords),
        description: text(props?.description),
        category: text(props?.category),
        contentStatus: text(props?.contentStatus),
        version: text(props?.version),
        language: text(props?.language),
        totalTime: text(app?.totalTime),
        annotationAuthors: doc.metadata.annotationAuthors ?? [],
        revisionAuthors: doc.metadata.revisionAuthors ?? [],
        xmpCreators: doc.metadata.xmpCreators ?? [],
        hasHiddenMarkers: doc.metadata.hasHiddenMarkers ?? false,
      };
    });
}

export const ComparePage: React.FC = () => {
  const { companyById, clearAll, companyCount } = useFileContext();
  const { documents } = useMetadata();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readyDocs = useMemo(
    () => documents.filter((doc) => doc.status === "ready"),
    [documents],
  );

  const allCompanies = useMemo(() => Object.values(companyById), [companyById]);

  const companiesWithFiles = useMemo(
    () =>
      allCompanies.filter((c) =>
        readyDocs.some((doc) => doc.companyId === c.id),
      ),
    [allCompanies, readyDocs],
  );

  const canRun = companiesWithFiles.length >= 2 && !comparing;
  // 有对比结果时隐藏上传卡片，避免用户误以为「没结果」；清空后回到上传态。
  const showUpload = !result;

  const handleRun = useCallback(async () => {
    if (!canRun) return;
    setComparing(true);
    setError(null);
    try {
      const files = toCompareInputs(documents, companyById);
      const next = await invoke<CompareResult>("compare_metadata", { files });
      setResult(next);
    } catch (cause) {
      console.error("对比失败:", cause);
      setError("对比执行失败，请重试。");
      setResult(EMPTY_COMPARE_RESULT);
    } finally {
      setComparing(false);
    }
  }, [canRun, documents, companyById]);

  const handleReset = (): void => {
    clearAll();
    setResult(null);
    setError(null);
  };

  return (
    <PageLayout
      backTo={ROUTES.home}
      bleed
      header={<h1 className="text-caption font-semibold">元数据对比</h1>}
      actions={
        <div className="flex items-center gap-1">
          {companyCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 rounded-lg text-muted-foreground"
              disabled={comparing}
            >
              清空全部
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={handleRun}
            disabled={!canRun}
            className="gap-1.5 rounded-lg"
          >
            <HugeIcon icon={PlayIcon} size={14} />
            {comparing ? "对比中…" : result ? "重新对比" : "开始对比"}
          </Button>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showUpload || error ? (
          <div className="mx-auto w-full max-w-7xl p-4 sm:px-6">
            {showUpload ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                <DropZone mode="directory" />
                {allCompanies.map((company, idx) => (
                  <CompanyCard key={company.id} company={company} index={idx} />
                ))}
              </div>
            ) : null}
            {error ? (
              <p className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-fine-print text-rose-700">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        {result ? (
          <div className="border-t border-border/60">
            <CompareWorkbench result={result} />
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
};

export default ComparePage;
