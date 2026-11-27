import React, { useEffect, useState } from "react";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";
import { renderMarkdownToHtml } from "../../utils/formatContent";

export interface StudentAttachmentMeta {
  originalName: string;
  size: number;
  mime: string;
}

interface AssignmentAttachmentViewerProps {
  lessonId: string;
  attachment: StudentAttachmentMeta;
}

export default function AssignmentAttachmentViewer({
  lessonId,
  attachment,
}: AssignmentAttachmentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const ext = attachment.originalName.toLowerCase().split(".").pop() || "";
  const isPdf = attachment.mime === "application/pdf" || ext === "pdf";
  const isMarkdown = attachment.mime === "text/markdown" || ext === "md";

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    async function loadAttachment() {
      setLoading(true);
      setError(null);
      setPdfBlobUrl(null);
      setTextContent(null);

      try {
        const token = localStorage.getItem("unisole-app:token") || "";
        const res = await fetch(`${API_BASE_URL}/api/lms/lessons/${lessonId}/attachment`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed to load attachment (HTTP ${res.status})`);
        }
        if (isPdf) {
          const blob = await res.blob();
          if (!active) return;
          createdUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(createdUrl);
        } else {
          const txt = await res.text();
          if (!active) return;
          setTextContent(txt);
        }
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Unable to load attachment");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAttachment();
    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [lessonId, attachment.originalName, attachment.mime, isPdf]);

  return (
    <div
      data-testid="assignment-attachment-viewer"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
        <span className="truncate">{attachment.originalName}</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          <span>Loading attachment...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-rose-500 font-semibold py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && isPdf && pdfBlobUrl && (
        <iframe
          data-testid="assignment-pdf-viewer"
          src={pdfBlobUrl}
          title={attachment.originalName}
          className="w-full h-[520px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
        />
      )}

      {!loading && !error && !isPdf && isMarkdown && textContent !== null && (
        <div
          data-testid="assignment-md-viewer"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] prose prose-sm prose-slate dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(textContent) }}
        />
      )}

      {!loading && !error && !isPdf && !isMarkdown && textContent !== null && (
        <pre
          data-testid="assignment-txt-viewer"
          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap overflow-x-auto max-h-[480px]"
        >
          {textContent}
        </pre>
      )}
    </div>
  );
}
