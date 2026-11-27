import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Film,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { API_BASE_URL } from "../../store/apiSlice";

interface SubmissionFileMeta {
  index: number;
  originalName: string;
  storedName: string;
  size: number;
  mime: string;
  durationSec?: number | null;
}

export interface AssignmentSubmissionRecord {
  id: string;
  studentId: string;
  assignmentId: string;
  text: string;
  attemptCount: number;
  maxAttempts: number;
  files: SubmissionFileMeta[];
  links: string[];
  reviewStatus: "NOT_REVIEWED" | "REVIEWED";
  adminComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentSubmissionPanelProps {
  assignmentId: string;
  onSubmitted?: () => void;
}

const DOC_CODE_EXTS = new Set([
  ".pdf", ".txt", ".md",
  ".py", ".js", ".ts", ".jsx", ".tsx",
  ".java", ".c", ".cpp", ".cs", ".go", ".rs",
  ".php", ".rb", ".sql", ".html", ".css", ".json", ".zip",
]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov"]);
const MAX_FILES = 5;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_LINKS = 3;
const MAX_LINK_LENGTH = 500;

function validateClientLinks(rawLinks: string[]): { ok: true; links: string[] } | { ok: false; error: string } {
  const cleaned = rawLinks.map((l) => l.trim()).filter(Boolean);
  if (cleaned.length > MAX_LINKS) {
    return { ok: false, error: `Maximum ${MAX_LINKS} links allowed per submission.` };
  }
  const seen = new Set<string>();
  for (const url of cleaned) {
    if (url.length > MAX_LINK_LENGTH) {
      return { ok: false, error: `Each link must be ${MAX_LINK_LENGTH} characters or fewer.` };
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { ok: false, error: `Invalid link URL: "${url}"` };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: `Only http:// and https:// links are allowed (rejected "${url}").` };
    }
    if (seen.has(url)) {
      return { ok: false, error: `Duplicate link is not allowed: "${url}"` };
    }
    seen.add(url);
  }
  return { ok: true, links: cleaned };
}

function getExt(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function renderAutoLinkifiedText(text: string): React.ReactNode {
  const urlRe = /(https?:\/\/[^\s<>"']+)/g;
  const parts = text.split(urlRe);
  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={idx}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-400 underline break-all hover:text-sky-500"
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function checkVideoDurationBrowser(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    video.onloadedmetadata = () => {
      const dur = Number.isFinite(video.duration) ? video.duration : null;
      cleanup();
      resolve(dur);
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    video.src = url;
  });
}

export default function AssignmentSubmissionPanel({
  assignmentId,
  onSubmitted,
}: AssignmentSubmissionPanelProps) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<AssignmentSubmissionRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [text, setText] = useState("");
  const [linkInputs, setLinkInputs] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [videoHint, setVideoHint] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // File preview state
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    mime: string;
    blobUrl?: string;
    textContent?: string;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("unisole-app:token") || "";
      const res = await fetch(`${API_BASE_URL}/api/lms/assignments/${assignmentId}/submission`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSubmission(data.submission || null);
        setIsEditing(!data.submission);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSubmission(null);
    setSelectedFiles([]);
    setLinkInputs([]);
    setText("");
    setErrorMsg(null);
    setVideoHint(null);
    setPreviewFile(null);
    fetchSubmission();
  }, [assignmentId]);

  useEffect(() => {
    return () => {
      if (previewFile?.blobUrl) URL.revokeObjectURL(previewFile.blobUrl);
    };
  }, [previewFile]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (incoming.length === 0) return;
    setErrorMsg(null);
    setVideoHint(null);

    const combined = [...selectedFiles, ...incoming];
    if (combined.length > MAX_FILES) {
      setErrorMsg(`Maximum ${MAX_FILES} files allowed per submission.`);
      return;
    }

    let totalBytes = 0;
    for (const f of combined) {
      const ext = getExt(f.name);
      const isVid = VIDEO_EXTS.has(ext);
      const isDoc = DOC_CODE_EXTS.has(ext);
      if (!isVid && !isDoc) {
        setErrorMsg(`File "${f.name}" has an unsupported or disallowed extension (${ext || "none"}).`);
        return;
      }
      if (isVid && f.size > MAX_VIDEO_BYTES) {
        setErrorMsg(`Video "${f.name}" exceeds the 50 MB limit.`);
        return;
      }
      if (isDoc && f.size > MAX_DOC_BYTES) {
        setErrorMsg(`File "${f.name}" exceeds the 10 MB limit.`);
        return;
      }
      totalBytes += f.size;
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      setErrorMsg("Total submission size exceeds 100 MB.");
      return;
    }

    // Client-side video duration hint (~1 minute)
    for (const f of combined) {
      if (VIDEO_EXTS.has(getExt(f.name))) {
        const dur = await checkVideoDurationBrowser(f);
        if (dur !== null && dur > 90) {
          setVideoHint(
            `Hint: "${f.name}" is ${Math.round(dur)}s long. Recommended walkthrough length is about 1 minute.`
          );
        }
      }
    }

    setSelectedFiles(combined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    const linkCheck = validateClientLinks(linkInputs);
    if (linkCheck.ok === false) {
      setErrorMsg(linkCheck.error);
      return;
    }

    if (!text.trim() && selectedFiles.length === 0 && linkCheck.links.length === 0) {
      setErrorMsg("Please enter a text explanation, at least one link, or attach at least one file.");
      return;
    }

    const token = localStorage.getItem("unisole-app:token") || "";
    const fd = new FormData();
    fd.append("text", text.trim());
    fd.append("links", JSON.stringify(linkCheck.links));
    for (const f of selectedFiles) {
      fd.append("files", f);
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/lms/assignments/${assignmentId}/submission`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Submission failed");
      }
      setSubmission(data.submission);
      setIsEditing(false);
      setSelectedFiles([]);
      setVideoHint(null);
      onSubmitted?.();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenFile = async (file: SubmissionFileMeta, downloadOnly = false) => {
    if (!submission) return;
    const token = localStorage.getItem("unisole-app:token") || "";
    const url = `${API_BASE_URL}/api/lms/assignment-submissions/${submission.id}/files/${file.index}`;
    setPreviewLoading(true);
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
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

      if (previewFile?.blobUrl) URL.revokeObjectURL(previewFile.blobUrl);

      if (file.mime.startsWith("text/") || /\.(txt|md|py|js|ts|jsx|tsx|java|c|cpp|cs|go|rs|php|rb|sql|html|css|json)$/i.test(file.originalName)) {
        const txt = await blob.text();
        URL.revokeObjectURL(blobUrl);
        setPreviewFile({ name: file.originalName, mime: file.mime, textContent: txt });
      } else {
        setPreviewFile({ name: file.originalName, mime: file.mime, blobUrl });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Unable to open file");
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
        <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
        <span>Loading your submission...</span>
      </div>
    );
  }

  const maxAttempts = submission?.maxAttempts || 3;
  const attemptCount = submission?.attemptCount || 0;
  const attemptsExhausted = attemptCount >= maxAttempts;

  return (
    <div data-testid="assignment-submission-panel" className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          data-testid="submission-attempt-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
        >
          Attempt {submission ? attemptCount : 1} of {maxAttempts}
        </span>

        {submission && (
          <span
            data-testid="submission-review-status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
              submission.reviewStatus === "REVIEWED"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
            }`}
          >
            {submission.reviewStatus === "REVIEWED" ? (
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
        )}
      </div>

      {/* View-only state after submission */}
      {submission && !isEditing && (
        <div
          data-testid="submission-readonly-view"
          className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] space-y-4"
        >
          {submission.adminComment && (
            <div
              data-testid="submission-admin-comment"
              className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1"
            >
              <p className="font-bold text-sky-700 dark:text-sky-300">Mentor / Admin Comment</p>
              <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                {submission.adminComment}
              </p>
            </div>
          )}

          {submission.text && (
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Explanation
              </p>
              <div
                data-testid="submission-text-display"
                className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed"
              >
                {renderAutoLinkifiedText(submission.text)}
              </div>
            </div>
          )}

          {Array.isArray(submission.links) && submission.links.length > 0 && (
            <div data-testid="submission-links-display" className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Links ({submission.links.length})
              </p>
              <ul className="space-y-1">
                {submission.links.map((url, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-xs">
                    <LinkIcon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 dark:text-sky-400 underline break-all hover:text-sky-500"
                    >
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {submission.files.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Uploaded Files ({submission.files.length})
              </p>
              <div className="space-y-2">
                {submission.files.map((f) => (
                  <div
                    key={f.index}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {f.mime.startsWith("video/") ? (
                        <Film className="w-4 h-4 text-purple-500 shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {f.originalName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatBytes(f.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenFile(f, false)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenFile(f, true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              <span>Loading file preview...</span>
            </div>
          )}

          {previewFile && (
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                  {previewFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
              {previewFile.blobUrl && previewFile.mime.startsWith("video/") && (
                <video
                  data-testid="submission-video-player"
                  src={previewFile.blobUrl}
                  controls
                  className="w-full max-h-[380px] rounded-lg bg-black"
                />
              )}
              {previewFile.blobUrl && previewFile.mime === "application/pdf" && (
                <iframe
                  src={previewFile.blobUrl}
                  title={previewFile.name}
                  className="w-full h-[420px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white"
                />
              )}
              {previewFile.textContent !== undefined && (
                <pre className="p-3 rounded-lg bg-slate-50 dark:bg-[#070A11] text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-[360px]">
                  {previewFile.textContent}
                </pre>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {attemptsExhausted ? (
              <span
                data-testid="attempts-exhausted-msg"
                className="text-xs font-semibold text-slate-500"
              >
                Maximum 3 submission attempts reached (read-only).
              </span>
            ) : (
              <button
                type="button"
                data-testid="resubmit-btn"
                onClick={() => {
                  setText(submission.text || "");
                  setLinkInputs(Array.isArray(submission.links) ? [...submission.links] : []);
                  setSelectedFiles([]);
                  setErrorMsg(null);
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 text-xs font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Resubmit (replaces previous files)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Submission / Resubmission Form */}
      {isEditing && !attemptsExhausted && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="assignment-explanation-text"
              className="block text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              Explanation & Links
            </label>
            <textarea
              id="assignment-explanation-text"
              data-testid="submission-text-input"
              rows={5}
              disabled={submitting}
              placeholder="Explain your approach, architecture, or notes..."
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-[#070A11] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070A11] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-500" />
                Links (optional, up to 3 URLs)
              </span>
              {linkInputs.length < MAX_LINKS && (
                <button
                  type="button"
                  data-testid="add-link-btn"
                  disabled={submitting}
                  onClick={() => setLinkInputs((prev) => [...prev, ""])}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add link
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Make sure your repo or file is public or shared with the reviewer.
            </p>
            {linkInputs.length > 0 && (
              <div className="space-y-2">
                {linkInputs.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="url"
                      data-testid={`submission-link-input-${idx}`}
                      disabled={submitting}
                      maxLength={MAX_LINK_LENGTH}
                      value={val}
                      onChange={(e) => {
                        const next = [...linkInputs];
                        next[idx] = e.target.value;
                        setLinkInputs(next);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      placeholder="https://github.com/username/repo"
                      className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                    />
                    <button
                      type="button"
                      data-testid={`remove-link-btn-${idx}`}
                      disabled={submitting}
                      onClick={() =>
                        setLinkInputs((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-slate-400 hover:text-rose-500 p-1.5 cursor-pointer"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-[#070A11] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-sky-500" />
                Upload Files (max 5 files, 100 MB total)
              </span>
              <span className="text-[10px] text-slate-400">
                Docs/Code ≤ 10 MB · Video (.mp4, .webm, .mov, ~1 minute) ≤ 50 MB
              </span>
            </div>

            <input
              type="file"
              multiple
              data-testid="submission-files-input"
              disabled={submitting}
              onChange={handleFilesSelected}
              className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/15 file:text-sky-600 dark:file:text-sky-300 cursor-pointer"
            />

            {videoHint && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                {videoHint}
              </p>
            )}

            {selectedFiles.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {selectedFiles.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="truncate font-medium">
                      {f.name}{" "}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({formatBytes(f.size)})
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="flex items-center gap-2 text-xs font-semibold text-rose-500 dark:text-rose-400"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            {submission && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedFiles([]);
                  setErrorMsg(null);
                }}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              data-testid="submission-submit-btn"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {submitting
                  ? "Uploading..."
                  : submission
                  ? "Submit Resubmission"
                  : "Submit Assignment"}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
