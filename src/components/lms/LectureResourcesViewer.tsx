import React, { useEffect, useState } from "react";
import { Download, Eye, FileCode, FileText, Loader2, X } from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";
import { renderMarkdownToHtml } from "../../utils/formatContent";
import PdfViewer from "./PdfViewer";

export interface StudentLectureResourceMeta {
  id: string;
  originalName: string;
  storedName?: string;
  size: number;
  mime: string;
}

interface LectureResourcesViewerProps {
  lessonId: string;
  resources: StudentLectureResourceMeta[];
}

const CODE_EXTS = new Set([
  "py", "js", "ts", "jsx", "tsx", "java", "c", "cpp", "cs", "go", "rs", "php", "rb", "sql", "html", "css", "json",
]);

export default function LectureResourcesViewer({
  lessonId,
  resources,
}: LectureResourcesViewerProps) {
  const [openResource, setOpenResource] = useState<StudentLectureResourceMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    setOpenResource(null);
    setPdfBlobUrl(null);
    setTextContent(null);
    setError(null);
  }, [lessonId]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  if (!resources || resources.length === 0) return null;

  const getExt = (name: string) => (name.toLowerCase().split(".").pop() || "");

  const handleOpen = async (res: StudentLectureResourceMeta) => {
    if (openResource?.id === res.id) {
      setOpenResource(null);
      return;
    }
    const ext = getExt(res.originalName);
    const isPdf = res.mime === "application/pdf" || ext === "pdf";
    const isMd = res.mime === "text/markdown" || ext === "md";
    const isTxt = ext === "txt";
    const isCode = CODE_EXTS.has(ext);

    if (!isPdf && !isMd && !isTxt && !isCode) {
      handleDownload(res);
      return;
    }

    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
    setTextContent(null);
    setError(null);
    setOpenResource(res);
    setLoading(true);

    try {
      const token = localStorage.getItem("unisole-app:token") || "";
      const resp = await fetch(`${API_BASE_URL}/api/lms/lessons/${lessonId}/resources/${res.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error(`Failed to load file (HTTP ${resp.status})`);
      if (isPdf) {
        const blob = await resp.blob();
        setPdfBlobUrl(URL.createObjectURL(blob));
      } else {
        setTextContent(await resp.text());
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load resource.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (res: StudentLectureResourceMeta) => {
    try {
      const token = localStorage.getItem("unisole-app:token") || "";
      const resp = await fetch(
        `${API_BASE_URL}/api/lms/lessons/${lessonId}/resources/${res.id}?download=1`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!resp.ok) throw new Error(`Download failed (HTTP ${resp.status})`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.originalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      setError(err?.message || "Download failed.");
    }
  };

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`;

  const openExt = openResource ? getExt(openResource.originalName) : "";
  const openIsPdf = openResource && (openResource.mime === "application/pdf" || openExt === "pdf");
  const openIsMd = openResource && (openResource.mime === "text/markdown" || openExt === "md");
  const openIsCode = openResource && CODE_EXTS.has(openExt);

  return (
    <div data-testid="lecture-resources-viewer" className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Files & Downloadable Resources ({resources.length})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {resources.map((res) => {
          const ext = getExt(res.originalName);
          const isCode = CODE_EXTS.has(ext);
          const isZip = ext === "zip";
          return (
            <div
              key={res.id}
              data-testid={`student-resource-${res.id}`}
              className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]"
            >
              <button
                type="button"
                onClick={() => handleOpen(res)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  {isCode ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-500">
                    {res.originalName}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatSize(res.size)}</p>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                {!isZip && (
                  <button
                    type="button"
                    data-testid={`open-resource-${res.originalName}`}
                    onClick={() => handleOpen(res)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{openResource?.id === res.id ? "Hide" : "Open"}</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid={`download-resource-${res.originalName}`}
                  onClick={() => handleDownload(res)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {openResource && (
        <div
          data-testid="resource-inline-preview"
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {openResource.originalName}
            </span>
            <button
              type="button"
              onClick={() => setOpenResource(null)}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {openIsPdf ? (
            <PdfViewer
              blobUrl={pdfBlobUrl}
              fileName={openResource.originalName}
              isLoadingExternal={loading}
              externalError={error}
              onDownload={() => handleDownload(openResource)}
            />
          ) : loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              <span>Loading file...</span>
            </div>
          ) : error ? (
            <p className="text-xs text-rose-500 font-semibold">{error}</p>
          ) : openIsMd && textContent !== null ? (
            <div
              data-testid="resource-md-viewer"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] prose prose-sm prose-slate dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(textContent) }}
            />
          ) : openIsCode && textContent !== null ? (
            <pre
              data-testid="resource-code-viewer"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0B1120] text-sky-200 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[520px]"
            >
              <code>{textContent}</code>
            </pre>
          ) : textContent !== null ? (
            <pre
              data-testid="resource-txt-viewer"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto max-h-[520px]"
            >
              {textContent}
            </pre>
          ) : null}
        </div>
      )}
    </div>
  );
}
