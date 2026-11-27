import React, { useEffect, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, AlertTriangle } from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";

export interface AssignmentAttachmentMeta {
  originalName: string;
  storedName?: string;
  size: number;
  mime: string;
}

interface AssignmentAttachmentPanelProps {
  lessonId: string;
  isLessonSaved: boolean;
  initialAttachment?: AssignmentAttachmentMeta | null;
  onAttachmentChange?: (att: AssignmentAttachmentMeta | null) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTS = [".pdf", ".txt", ".md"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AssignmentAttachmentPanel({
  lessonId,
  isLessonSaved,
  initialAttachment = null,
  onAttachmentChange,
}: AssignmentAttachmentPanelProps) {
  const [attachment, setAttachment] = useState<AssignmentAttachmentMeta | null>(initialAttachment);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAttachment(initialAttachment || null);
    setError(null);
  }, [lessonId, initialAttachment]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    const lower = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some((ext) => lower.endsWith(ext));
    if (!hasValidExt) {
      setError("Only .pdf, .txt, and .md files are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Attachment must be 10 MB or smaller.");
      return;
    }

    const token = localStorage.getItem("unisole-app:token") || "";
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lessons/${lessonId}/attachment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Upload failed");
      }
      setAttachment(data.attachment);
      onAttachmentChange?.(data.attachment);
    } catch (err: any) {
      setError(err?.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!isLessonSaved || removing || uploading) return;
    const token = localStorage.getItem("unisole-app:token") || "";
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lessons/${lessonId}/attachment`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.message || "Remove failed");
      }
      setAttachment(null);
      onAttachmentChange?.(null);
    } catch (err: any) {
      setError(err?.message || "Failed to remove attachment");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-sky-500" />
          Assignment Attachment (PDF, TXT, or MD — max 10 MB)
        </span>
      </div>

      {!isLessonSaved && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Save the lesson first, then attach a file
        </div>
      )}

      {attachment ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-sky-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {attachment.originalName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {formatBytes(attachment.size)} · {attachment.mime}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing || uploading}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Remove
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400">No file attached.</p>
      )}

      <div className="flex items-center gap-3">
        <input
          type="file"
          data-testid="assignment-attachment-input"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={!isLessonSaved || uploading || removing}
          onChange={handleFileChange}
          className="text-xs text-slate-500 disabled:opacity-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/15 file:text-sky-600 dark:file:text-sky-300 cursor-pointer"
        />
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-xs text-sky-500 font-semibold">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading...
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-rose-500 font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}
