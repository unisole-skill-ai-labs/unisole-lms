import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Film,
  Link as LinkIcon,
  Loader2,
  Search,
} from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";
import PdfViewer from "../lms/PdfViewer";
import { renderAutoLinkifiedText } from "../lms/AssignmentSubmissionPanel";

interface AdminUploadFile {
  index: number;
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
}

interface AdminAssignmentUploadItem {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  text: string;
  attemptCount: number;
  maxAttempts: number;
  files: AdminUploadFile[];
  links: string[];
  reviewStatus: "NOT_REVIEWED" | "REVIEWED";
  adminComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminAssignmentUploadsPanel() {
  const [items, setItems] = useState<AdminAssignmentUploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    mime: string;
    blobUrl?: string;
    textContent?: string;
  } | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("unisole-app:token") || "";
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(
        `${API_BASE_URL}/api/admin/submissions/assignment-uploads?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const list: AdminAssignmentUploadItem[] = data.items || [];
        setItems(list);
        const nextComments: Record<string, string> = {};
        for (const it of list) {
          nextComments[it.id] = it.adminComment || "";
        }
        setComments(nextComments);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [statusFilter]);

  useEffect(() => {
    return () => {
      if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    };
  }, [preview]);

  const handleReviewSave = async (
    id: string,
    reviewStatus: "NOT_REVIEWED" | "REVIEWED"
  ) => {
    setSavingId(id);
    try {
      const token = localStorage.getItem("unisole-app:token") || "";
      const res = await fetch(
        `${API_BASE_URL}/api/admin/submissions/assignment-uploads/${id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reviewStatus,
            adminComment: comments[id] ?? "",
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  reviewStatus: data.submission.reviewStatus,
                  adminComment: data.submission.adminComment,
                  reviewedAt: data.submission.reviewedAt,
                }
              : it
          )
        );
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleOpenFile = async (
    submissionId: string,
    file: AdminUploadFile,
    downloadOnly = false
  ) => {
    const token = localStorage.getItem("unisole-app:token") || "";
    const res = await fetch(
      `${API_BASE_URL}/api/lms/assignment-submissions/${submissionId}/files/${file.index}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);

    if (downloadOnly) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.originalName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }

    if (preview?.blobUrl) URL.revokeObjectURL(preview.blobUrl);
    if (
      file.mime.startsWith("text/") ||
      /\.(txt|md|py|js|ts|jsx|tsx|java|c|cpp|cs|go|rs|php|rb|sql|html|css|json)$/i.test(
        file.originalName
      )
    ) {
      const txt = await blob.text();
      URL.revokeObjectURL(blobUrl);
      setPreview({ name: file.originalName, mime: file.mime, textContent: txt });
    } else {
      setPreview({ name: file.originalName, mime: file.mime, blobUrl });
    }
  };

  return (
    <div data-testid="admin-assignment-uploads-panel" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadItems()}
              placeholder="Search student, phone, or assignment..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]"
            />
          </div>
          <button
            type="button"
            onClick={loadItems}
            className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold cursor-pointer"
          >
            Search
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]"
        >
          <option value="ALL">All statuses</option>
          <option value="NOT_REVIEWED">Not reviewed</option>
          <option value="REVIEWED">Reviewed</option>
        </select>
      </div>

      {preview && (
        preview.blobUrl && preview.mime === "application/pdf" ? (
          <PdfViewer
            blobUrl={preview.blobUrl}
            fileName={preview.name}
            onClose={() => setPreview(null)}
          />
        ) : (
          <div className="p-4 rounded-2xl border border-sky-500/30 bg-white dark:bg-[#0B1120] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">{preview.name}</span>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Close preview
              </button>
            </div>
            {preview.blobUrl && preview.mime.startsWith("video/") && (
              <video src={preview.blobUrl} controls className="w-full max-h-[380px] rounded-lg bg-black" />
            )}
            {preview.textContent !== undefined && (
              <pre className="p-3 rounded-lg bg-slate-50 dark:bg-[#070A11] text-xs font-mono whitespace-pre-wrap max-h-[360px] overflow-auto">
                {preview.textContent}
              </pre>
            )}
          </div>
        )
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
          <span>Loading assignment submissions...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] text-xs text-slate-400">
          No assignment submissions found.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`admin-upload-card-${item.id}`}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {item.studentName}{" "}
                    <span className="text-xs font-mono text-slate-400">
                      ({item.studentPhone})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assignment: <span className="font-semibold">{item.assignmentTitle}</span> ·
                    Attempt {item.attemptCount} of {item.maxAttempts} · Updated{" "}
                    {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    item.reviewStatus === "REVIEWED"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {item.reviewStatus === "REVIEWED" ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Reviewed
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      Not reviewed
                    </>
                  )}
                </span>
              </div>

              {item.text && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070A11] text-xs whitespace-pre-wrap">
                  {renderAutoLinkifiedText(item.text)}
                </div>
              )}

              {Array.isArray(item.links) && item.links.length > 0 && (
                <div data-testid={`admin-submission-links-${item.id}`} className="flex flex-wrap gap-2">
                  {item.links.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 text-xs text-sky-600 dark:text-sky-400 underline break-all"
                    >
                      <LinkIcon className="w-3.5 h-3.5 shrink-0" />
                      {url}
                    </a>
                  ))}
                </div>
              )}

              {item.files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.files.map((f) => (
                    <div
                      key={f.index}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] text-xs"
                    >
                      {f.mime.startsWith("video/") ? (
                        <Film className="w-3.5 h-3.5 text-purple-500" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-sky-500" />
                      )}
                      <span className="font-medium">{f.originalName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatBytes(f.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(item.id, f, false)}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(item.id, f, true)}
                        className="text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  data-testid={`admin-comment-input-${item.id}`}
                  value={comments[item.id] ?? ""}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Add mentor/admin comment (optional)..."
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid={`mark-reviewed-btn-${item.id}`}
                    disabled={savingId === item.id}
                    onClick={() => handleReviewSave(item.id, "REVIEWED")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    type="button"
                    disabled={savingId === item.id}
                    onClick={() => handleReviewSave(item.id, "NOT_REVIEWED")}
                    className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Mark Not Reviewed
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
