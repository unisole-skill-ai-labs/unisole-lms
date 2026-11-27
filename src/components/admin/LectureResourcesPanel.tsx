import React, { useEffect, useRef, useState } from "react";
import { Check, Edit3, FileText, Loader2, Paperclip, Trash2, Upload, X } from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";

export interface LectureResourceMeta {
  id: string;
  originalName: string;
  storedName?: string;
  size: number;
  mime: string;
}

interface LectureResourcesPanelProps {
  lessonId: string;
  isLessonSaved: boolean;
  initialResources?: LectureResourceMeta[];
  onResourcesChange?: (resources: LectureResourceMeta[]) => void;
}

const ALLOWED_EXTS = [
  ".pdf", ".md", ".txt",
  ".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".c", ".cpp", ".cs", ".go", ".rs", ".php", ".rb", ".sql", ".html", ".css", ".json",
  ".zip",
];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

export default function LectureResourcesPanel({
  lessonId,
  isLessonSaved,
  initialResources = [],
  onResourcesChange,
}: LectureResourcesPanelProps) {
  const [resources, setResources] = useState<LectureResourceMeta[]>(initialResources);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const initialKey = JSON.stringify(initialResources || []);
  useEffect(() => {
    setResources(Array.isArray(initialResources) ? initialResources : []);
    setError(null);
    setEditingId(null);
  }, [lessonId, initialKey]);

  const handleUploadFiles = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;
    setError(null);

    if (resources.length + files.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} files allowed per lecture.`);
      return;
    }

    for (const file of files) {
      const dotIdx = file.name.lastIndexOf(".");
      const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : "";
      if (!ALLOWED_EXTS.includes(ext)) {
        setError(`File "${file.name}" is not allowed. Supported: PDF, MD, TXT, ZIP, and code files.`);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`File "${file.name}" exceeds the 10 MB limit.`);
        return;
      }
    }

    const token = localStorage.getItem("unisole-app:token") || "";
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lessons/${lessonId}/resources`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || json?.message || "Failed to upload resources.");
      }
      const next = Array.isArray(json.resources) ? json.resources : [];
      setResources(next);
      onResourcesChange?.(next);
    } catch (err: any) {
      setError(err?.message || "Failed to upload resources.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRename = async (resourceId: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setError("File name cannot be empty.");
      return;
    }
    setError(null);
    const token = localStorage.getItem("unisole-app:token") || "";
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/lessons/${lessonId}/resources/${resourceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ name: trimmed }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to rename resource.");
      const next = Array.isArray(json.resources) ? json.resources : [];
      setResources(next);
      setEditingId(null);
      onResourcesChange?.(next);
    } catch (err: any) {
      setError(err?.message || "Failed to rename resource.");
    }
  };

  const handleRemove = async (resourceId: string) => {
    setError(null);
    const token = localStorage.getItem("unisole-app:token") || "";
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/lessons/${lessonId}/resources/${resourceId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Failed to remove resource.");
      const next = Array.isArray(json.resources) ? json.resources : [];
      setResources(next);
      onResourcesChange?.(next);
    } catch (err: any) {
      setError(err?.message || "Failed to remove resource.");
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  return (
    <div
      data-testid="lecture-resources-panel"
      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0B1120] space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
          Files & Downloadable Resources ({resources.length}/{MAX_FILES})
        </span>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={!isLessonSaved || uploading || resources.length >= MAX_FILES}
            accept={ALLOWED_EXTS.join(",")}
            onChange={(e) => handleUploadFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            data-testid="upload-lecture-resources-btn"
            disabled={!isLessonSaved || uploading || resources.length >= MAX_FILES}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{uploading ? "Uploading..." : "Upload files"}</span>
          </button>
        </div>
      </div>

      {!isLessonSaved && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          Save the lesson first to upload files (PDF, MD, TXT, ZIP, or code up to 10 MB each).
        </p>
      )}

      {error && (
        <p data-testid="lecture-resources-error" className="text-xs text-rose-500 font-semibold">
          {error}
        </p>
      )}

      {resources.length === 0 ? (
        <div className="text-xs text-slate-400 py-1">No files uploaded yet.</div>
      ) : (
        <div className="space-y-2">
          {resources.map((res) => (
            <div
              key={res.id}
              data-testid={`lecture-resource-row-${res.id}`}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070A11]/50 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                {editingId === res.id ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1120] flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(res.id)}
                      className="p-1 rounded bg-sky-500 text-white cursor-pointer"
                      title="Save name"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {res.originalName}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatSize(res.size)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(res.id);
                    setRenameValue(res.originalName);
                  }}
                  title="Rename file"
                  className="p-1 text-slate-400 hover:text-sky-500 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(res.id)}
                  title="Remove file"
                  className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
