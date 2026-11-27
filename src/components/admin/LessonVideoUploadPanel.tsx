import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Terminal,
  Link as LinkIcon,
  FolderUp,
  X,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import {
  API_BASE_URL,
  useCreateLessonVideoCliTokenMutation,
  useGetLessonVideoStatusQuery,
  useReplaceLessonVideoMutation,
  useSwitchLessonVideoToLinkMutation,
} from "../../store/apiSlice";

interface LessonVideoUploadPanelProps {
  lessonId: string;
  isLessonSaved?: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  durationMinutes?: number;
  onDurationChange?: (mins: number) => void;
  onModeChange?: (mode: VideoMode) => void;
  onProviderStatusChange?: (provider: string | null, status: string | null) => void;
}

type VideoMode = "LINK" | "HLS";

interface HlsFileEntry {
  relPath: string;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

const HLS_VALID_RE = /^(master\.m3u8|(360p|480p|720p|1080p)\/(index\.m3u8|seg_\d+\.ts))$/;
const RENDITIONS = ["360p", "480p", "720p", "1080p"];
const IGNORED_FILES = new Set([".DS_Store", "Thumbs.db", "desktop.ini"]);

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  NONE: { label: "None", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  UPLOADING: { label: "Uploading", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  READY: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  FAILED: { label: "Failed", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};

function normalizeAndValidateHlsFiles(
  raw: Array<{ relPath: string; file: File }>,
  maxSizeBytes: number
): { files: HlsFileEntry[]; error: string | null; totalBytes: number } {
  const cleaned = raw
    .map((item) => ({
      relPath: item.relPath.replace(/\\/g, "/").replace(/^\/+/, ""),
      file: item.file,
    }))
    .filter((item) => {
      const base = item.relPath.split("/").pop() || "";
      return base && !IGNORED_FILES.has(base);
    });

  if (cleaned.length === 0) {
    return { files: [], error: "No files detected in selected folder.", totalBytes: 0 };
  }

  // Strip common root folder prefix (e.g. "my-video/master.m3u8" -> "master.m3u8")
  const firstParts = cleaned.map((c) => c.relPath.split("/")[0]);
  const allHaveSlash = cleaned.every((c) => c.relPath.includes("/"));
  const sharedRoot = allHaveSlash && new Set(firstParts).size === 1 ? `${firstParts[0]}/` : "";
  const normalized = cleaned.map((c) => ({
    relPath: sharedRoot ? c.relPath.slice(sharedRoot.length) : c.relPath,
    file: c.file,
  }));

  let totalBytes = 0;
  for (const item of normalized) {
    totalBytes += item.file.size;
    if (!HLS_VALID_RE.test(item.relPath)) {
      return {
        files: [],
        error: `Unsupported file in HLS folder: ${item.relPath}`,
        totalBytes,
      };
    }
  }

  if (totalBytes > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      files: [],
      error: `HLS folder exceeds maximum size limit of ${maxMb} MB.`,
      totalBytes,
    };
  }

  const paths = new Set(normalized.map((n) => n.relPath));
  if (!paths.has("master.m3u8")) {
    return { files: [], error: "master.m3u8 not found", totalBytes };
  }

  const presentRenditions = RENDITIONS.filter((r) =>
    normalized.some((n) => n.relPath.startsWith(`${r}/`))
  );
  if (presentRenditions.length === 0) {
    return {
      files: [],
      error: "No rendition folder (360p, 480p, 720p, or 1080p) found.",
      totalBytes,
    };
  }

  for (const r of presentRenditions) {
    if (!paths.has(`${r}/index.m3u8`)) {
      return { files: [], error: `Rendition ${r} is missing index.m3u8`, totalBytes };
    }
    const hasSeg = normalized.some(
      (n) => n.relPath.startsWith(`${r}/`) && /^seg_\d+\.ts$/.test(n.relPath.slice(r.length + 1))
    );
    if (!hasSeg) {
      return { files: [], error: `Rendition ${r} has no seg_N.ts segment files`, totalBytes };
    }
  }

  const sorted = normalized
    .sort((a, b) => a.relPath.localeCompare(b.relPath))
    .map((n) => ({ ...n, status: "pending" as const }));

  return { files: sorted, error: null, totalBytes };
}

async function readDroppedItems(dt: DataTransfer): Promise<Array<{ relPath: string; file: File }>> {
  const out: Array<{ relPath: string; file: File }> = [];
  const items = Array.from(dt.items || []);
  const entries = items
    .map((it) => (typeof (it as any).webkitGetAsEntry === "function" ? (it as any).webkitGetAsEntry() : null))
    .filter(Boolean);

  if (entries.length > 0) {
    const walk = async (entry: any, prefix: string): Promise<void> => {
      if (entry.isFile) {
        await new Promise<void>((resolve) => {
          entry.file(
            (file: File) => {
              out.push({ relPath: prefix ? `${prefix}/${file.name}` : file.name, file });
              resolve();
            },
            () => resolve()
          );
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readBatch = (): Promise<any[]> =>
          new Promise((resolve) => reader.readEntries(resolve, () => resolve([])));
        let batch = await readBatch();
        while (batch.length > 0) {
          for (const child of batch) {
            await walk(child, prefix ? `${prefix}/${entry.name}` : entry.name);
          }
          batch = await readBatch();
        }
      }
    };
    for (const entry of entries) {
      await walk(entry, "");
    }
    return out;
  }

  for (const f of Array.from(dt.files || [])) {
    const rel = (f as any).webkitRelativePath || f.name;
    out.push({ relPath: rel, file: f });
  }
  return out;
}

function uploadBlobWithXhr(
  url: string,
  file: File,
  contentType: string,
  onProgress: (loadedBytes: number) => void,
  onRegister: (xhr: XMLHttpRequest | null) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    onRegister(xhr);
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress(evt.loaded);
    };
    xhr.onload = () => {
      onRegister(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(file.size);
        resolve();
      } else {
        reject(new Error(`Upload failed with HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      onRegister(null);
      reject(new Error("Network/CORS error while uploading to Azure Blob"));
    };
    xhr.onabort = () => {
      onRegister(null);
      reject(new Error("Upload cancelled"));
    };
    xhr.send(file);
  });
}

function guessHlsContentType(relPath: string): string {
  if (relPath.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (relPath.endsWith(".ts")) return "video/mp2t";
  return "application/octet-stream";
}

export default function LessonVideoUploadPanel({
  lessonId,
  isLessonSaved = true,
  videoUrl,
  onVideoUrlChange,
  durationMinutes,
  onDurationChange,
  onModeChange,
  onProviderStatusChange,
}: LessonVideoUploadPanelProps) {
  const [cliCommand, setCliCommand] = useState("");
  const [copied, setCopied] = useState(false);

  // HLS folder upload state
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const hlsAbortRef = useRef(false);
  const [hlsFiles, setHlsFiles] = useState<HlsFileEntry[]>([]);
  const [hlsTotalBytes, setHlsTotalBytes] = useState(0);
  const [hlsUploadedBytes, setHlsUploadedBytes] = useState<Record<string, number>>({});
  const [hlsValidationError, setHlsValidationError] = useState<string | null>(null);
  const [hlsSession, setHlsSession] = useState<{
    cliToken: string;
    hlsPath: string;
    uploadUrls: Record<string, string>;
  } | null>(null);
  const [isUploadingHls, setIsUploadingHls] = useState(false);
  const [isVerifyingHls, setIsVerifyingHls] = useState(false);
  const [isDraggingFolder, setIsDraggingFolder] = useState(false);

  const {
    data: statusData,
    error: statusError,
    refetch,
  } = useGetLessonVideoStatusQuery(lessonId, {
    skip: !lessonId || lessonId.startsWith("unsaved_"),
  });

  const [createCliToken, { isLoading: isGenerating }] = useCreateLessonVideoCliTokenMutation();
  const [switchToLink, { isLoading: isSwitching }] = useSwitchLessonVideoToLinkMutation();
  const [replaceVideo, { isLoading: isReplacing }] = useReplaceLessonVideoMutation();
  const [hlsWarning, setHlsWarning] = useState<string | null>(null);

  const maxSizeMb: number = statusData?.maxSizeMb || 500;
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const isStorageNotConfigured = (statusError as any)?.status === 503;

  const manualModeLessonRef = useRef<string | null>(null);
  const hasExistingLink =
    statusData?.videoProvider !== "AZURE_HLS" && Boolean(videoUrl && videoUrl.trim());
  const initialMode: VideoMode = hasExistingLink ? "LINK" : "HLS";
  const [mode, setMode] = useState<VideoMode>(initialMode);

  useEffect(() => {
    setHlsFiles([]);
    setHlsTotalBytes(0);
    setHlsUploadedBytes({});
    setHlsValidationError(null);
    setHlsSession(null);
    setCliCommand("");
    setCopied(false);
  }, [lessonId]);

  useEffect(() => {
    onProviderStatusChange?.(statusData?.videoProvider || null, statusData?.videoStatus || null);
  }, [statusData?.videoProvider, statusData?.videoStatus, onProviderStatusChange]);

  useEffect(() => {
    if (manualModeLessonRef.current === lessonId) return;
    let nextMode: VideoMode = "HLS";
    if (statusData?.videoProvider === "AZURE_HLS") {
      nextMode = "HLS";
    } else if (videoUrl && videoUrl.trim()) {
      nextMode = "LINK";
    }
    setMode(nextMode);
    onModeChange?.(nextMode);
  }, [lessonId, statusData?.videoProvider, videoUrl, onModeChange]);

  const handleModeSwitch = (next: VideoMode) => {
    manualModeLessonRef.current = lessonId;
    setMode(next);
    onModeChange?.(next);
  };

  const handleRemoveVideo = async () => {
    if (!isLessonSaved || isSwitching || isUploadingHls) return;
    if (!window.confirm("Remove the uploaded HLS video from this lesson?")) return;
    try {
      await switchToLink(lessonId).unwrap();
      setCliCommand("");
      setHlsValidationError(null);
      setHlsFiles([]);
      setHlsTotalBytes(0);
      setHlsUploadedBytes({});
      setHlsSession(null);
      refetch();
    } catch {
      // Ignore if already cleared
    }
  };

  const handleReplaceVideo = async () => {
    if (!isLessonSaved || isReplacing || isUploadingHls) return;
    if (!window.confirm("Replace the current HLS video? Student progress will be preserved.")) return;
    try {
      await replaceVideo(lessonId).unwrap();
      setCliCommand("");
      setHlsValidationError(null);
      setHlsWarning(null);
      setHlsFiles([]);
      setHlsTotalBytes(0);
      setHlsUploadedBytes({});
      setHlsSession(null);
      setMode("HLS");
      onModeChange?.("HLS");
      refetch();
    } catch {
      // ignore
    }
  };

  const handleFolderSelection = async (raw: Array<{ relPath: string; file: File }>) => {
    const validated = normalizeAndValidateHlsFiles(raw, maxSizeBytes);
    setHlsFiles(validated.files);
    setHlsTotalBytes(validated.totalBytes);
    setHlsUploadedBytes({});
    setHlsSession(null);
    setHlsWarning(null);
    if (validated.error) {
      setHlsValidationError(validated.error);
      return;
    }
    try {
      const byPath = new Map(validated.files.map((f) => [f.relPath, f.file]));
      const masterFile = byPath.get("master.m3u8");
      if (!masterFile) {
        setHlsValidationError("master.m3u8 not found.");
        return;
      }
      const masterText = await masterFile.text();
      const variantPaths = masterText
        .split(/\r?\n/)
        .map((l) => l.trim().replace(/\\/g, "/"))
        .filter((l) => l && !l.startsWith("#"));
      if (variantPaths.length === 0) {
        setHlsValidationError("master.m3u8 contains no variant streams. Re-encode with: node tools/video-cli/encode-hls.mjs <video.mp4>");
        return;
      }

      const durations: number[] = [];
      for (const vp of variantPaths) {
        const vFile = byPath.get(vp);
        if (!vFile || vFile.size === 0) {
          setHlsValidationError(`Referenced playlist missing or empty: ${vp}. Re-encode with: node tools/video-cli/encode-hls.mjs <video.mp4>`);
          return;
        }
        const vText = await vFile.text();
        if (!vText.includes("#EXT-X-ENDLIST")) {
          setHlsValidationError(`${vp} is missing #EXT-X-ENDLIST (incomplete encode). Re-encode with: node tools/video-cli/encode-hls.mjs <video.mp4>`);
          return;
        }
        const vDir = vp.split("/")[0];
        let totalDur = 0;
        const lines = vText.split(/\r?\n/);
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line) continue;
          if (line.startsWith("#EXTINF:")) {
            const d = Number(line.slice("#EXTINF:".length).split(",")[0]);
            if (!Number.isFinite(d) || d <= 0) {
              setHlsValidationError(`${vp} has invalid #EXTINF duration. Re-encode with: node tools/video-cli/encode-hls.mjs <video.mp4>`);
              return;
            }
            totalDur += d;
          } else if (!line.startsWith("#")) {
            const segRel = `${vDir}/${line.replace(/\\/g, "/")}`;
            const segFile = byPath.get(segRel);
            if (!segFile || segFile.size === 0) {
              setHlsValidationError(`Segment missing or empty: ${segRel}. Re-encode with: node tools/video-cli/encode-hls.mjs <video.mp4>`);
              return;
            }
          }
        }
        durations.push(totalDur);
      }

      if (durations.length > 1) {
        const diff = Math.max(...durations) - Math.min(...durations);
        if (diff > 1.0) {
          setHlsWarning(`Rendition durations differ by ${diff.toFixed(1)}s. Seeking may drift slightly between quality levels.`);
        }
      }
      setHlsValidationError(null);
    } catch (err: any) {
      setHlsValidationError(err?.message || "Failed to validate HLS playlists.");
    }
  };

  const handleUploadHlsFolder = async () => {
    if (hlsFiles.length === 0 || hlsValidationError) return;
    setIsUploadingHls(true);
    hlsAbortRef.current = false;
    setHlsValidationError(null);

    try {
      const tokenRes = await createCliToken(lessonId).unwrap();
      const cliToken: string = tokenRes.cliToken;
      const uuid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(16)}-0000-4000-8000-000000000000`.slice(0, 36);

      const urlsRes = await fetch(`${API_BASE_URL}/api/admin/lessons/${lessonId}/video/upload-urls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cliToken}`,
        },
        body: JSON.stringify({
          uuid,
          files: hlsFiles.map((f) => f.relPath),
        }),
      });
      if (urlsRes.status === 503) {
        throw new Error("Video storage is not set up yet. Ask the developer to configure Azure.");
      }
      const urlsData = await urlsRes.json();
      if (!urlsRes.ok) {
        throw new Error(urlsData?.error || "Failed to initialize HLS upload URLs");
      }

      const session = {
        cliToken,
        hlsPath: urlsData.hlsPath as string,
        uploadUrls: urlsData.uploadUrls as Record<string, string>,
      };
      setHlsSession(session);

      for (const entry of hlsFiles) {
        if (hlsAbortRef.current) throw new Error("Upload cancelled");
        await uploadSingleHlsFile(entry.relPath, entry.file, session.uploadUrls[entry.relPath]);
      }
    } catch (err: any) {
      setHlsValidationError(err?.message || "HLS upload failed");
    } finally {
      setIsUploadingHls(false);
    }
  };

  const uploadSingleHlsFile = async (relPath: string, file: File, sasUrl: string) => {
    setHlsFiles((prev) =>
      prev.map((f) => (f.relPath === relPath ? { ...f, status: "uploading", error: undefined } : f))
    );
    try {
      await uploadBlobWithXhr(
        sasUrl,
        file,
        guessHlsContentType(relPath),
        (loaded) => setHlsUploadedBytes((prev) => ({ ...prev, [relPath]: loaded })),
        (xhr) => {
          xhrRef.current = xhr;
        }
      );
      setHlsFiles((prev) =>
        prev.map((f) => (f.relPath === relPath ? { ...f, status: "done", error: undefined } : f))
      );
    } catch (err: any) {
      setHlsFiles((prev) =>
        prev.map((f) =>
          f.relPath === relPath ? { ...f, status: "error", error: err?.message || "Failed" } : f
        )
      );
      throw err;
    }
  };

  const handleVerifyAndPublishHls = async () => {
    if (!hlsSession) return;
    setIsVerifyingHls(true);
    setHlsValidationError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/lessons/${lessonId}/video/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hlsSession.cliToken}`,
        },
        body: JSON.stringify({
          hlsPath: hlsSession.hlsPath,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        throw new Error("Video storage is not set up yet. Ask the developer to configure Azure.");
      }
      if (!res.ok) {
        throw new Error(data?.error || "Verification failed");
      }
      refetch();
    } catch (err: any) {
      setHlsValidationError(err?.message || "Failed to publish HLS video");
    } finally {
      setIsVerifyingHls(false);
    }
  };

  const handleCancelAll = () => {
    hlsAbortRef.current = true;
    if (xhrRef.current) xhrRef.current.abort();
  };

  const handleGenerateCli = async () => {
    try {
      const res = await createCliToken(lessonId).unwrap();
      setCliCommand(res?.command || "");
      setCopied(false);
    } catch {
      setCliCommand("");
    }
  };

  const totalHlsLoaded = Object.values(hlsUploadedBytes).reduce((a, b) => a + b, 0);
  const hlsProgressPct =
    hlsTotalBytes > 0 ? Math.min(100, Math.round((totalHlsLoaded / hlsTotalBytes) * 100)) : 0;
  const allHlsFilesDone = hlsFiles.length > 0 && hlsFiles.every((f) => f.status === "done");

  const statusKey = statusData?.videoStatus || "NONE";
  const badge = STATUS_STYLES[statusKey] || STATUS_STYLES.NONE;
  const uploadDisabled = !isLessonSaved || isStorageNotConfigured || isUploadingHls;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch("HLS")}
          disabled={isSwitching || isUploadingHls}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            mode === "HLS"
              ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
              : "bg-slate-50 dark:bg-[#070A11] border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <FolderUp className="w-3.5 h-3.5" />
          Upload HLS folder
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("LINK")}
          disabled={isSwitching || isUploadingHls}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            mode === "LINK"
              ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
              : "bg-slate-50 dark:bg-[#070A11] border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          Paste link
        </button>
      </div>

      {mode === "LINK" && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Video URL (Optional: YouTube, Vimeo, or MP4 link)
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => onVideoUrlChange(e.target.value)}
            placeholder="https://youtu.be/..."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono"
          />
          <p className="text-[10px] text-slate-400 mt-1">Paste a video link</p>
        </div>
      )}

      {mode !== "LINK" && (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Video Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
              {(isUploadingHls || isVerifyingHls) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              )}
            </div>
            {(statusKey === "READY" || statusKey === "FAILED") && (
              <div className="flex items-center gap-2">
                {statusData?.videoHlsPath && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs">
                    {statusData.videoHlsPath}
                  </span>
                )}
                <button
                  type="button"
                  data-testid="replace-video-btn"
                  onClick={handleReplaceVideo}
                  disabled={isReplacing || isUploadingHls}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                  title="Replace HLS video (keeps student progress)"
                >
                  <FolderUp className="w-3 h-3" />
                  Replace video
                </button>
                {statusKey === "READY" && (
                  <button
                    type="button"
                    onClick={handleRemoveVideo}
                    disabled={isSwitching || isUploadingHls}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                    title="Remove uploaded HLS video"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove video
                  </button>
                )}
              </div>
            )}
          </div>

          {!isLessonSaved && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Save the lesson first, then upload
            </div>
          )}

          {isStorageNotConfigured && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Video storage is not set up yet. Ask the developer to configure Azure.
            </div>
          )}

          {mode === "HLS" && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!uploadDisabled) setIsDraggingFolder(true);
                }}
                onDragLeave={() => setIsDraggingFolder(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setIsDraggingFolder(false);
                  if (uploadDisabled) return;
                  const dropped = await readDroppedItems(e.dataTransfer);
                  handleFolderSelection(dropped);
                }}
                className={`p-4 rounded-xl border-2 border-dashed transition-colors text-center space-y-2 ${
                  isDraggingFolder
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40"
                }`}
              >
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Drag and drop{" "}
                  <button
                    type="button"
                    disabled={uploadDisabled}
                    onClick={() => folderInputRef.current?.click()}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer disabled:opacity-50"
                  >
                    or browse
                  </button>
                </p>
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  disabled={uploadDisabled}
                  {...({ webkitdirectory: "", directory: "" } as any)}
                  onChange={(e) => {
                    const list = Array.from(e.target.files || []).map((f) => ({
                      relPath: (f as any).webkitRelativePath || f.name,
                      file: f,
                    }));
                    handleFolderSelection(list);
                  }}
                  className="hidden"
                />
              </div>

              {hlsValidationError && (
                <p data-testid="hls-validation-error" className="text-xs text-rose-500 font-semibold">{hlsValidationError}</p>
              )}
              {hlsWarning && (
                <p data-testid="hls-validation-warning" className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{hlsWarning}</p>
              )}

              {hlsFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Detected {hlsFiles.length} file(s) ({(hlsTotalBytes / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                    <div className="flex items-center gap-2">
                      {!allHlsFilesDone && (
                        <button
                          type="button"
                          onClick={handleUploadHlsFolder}
                          disabled={uploadDisabled || Boolean(hlsValidationError)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          <FolderUp className="w-3.5 h-3.5" />
                          Upload folder
                        </button>
                      )}
                      {isUploadingHls && (
                        <button
                          type="button"
                          onClick={handleCancelAll}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 text-xs font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      )}
                      {allHlsFilesDone && hlsSession && (
                        <button
                          type="button"
                          onClick={handleVerifyAndPublishHls}
                          disabled={isVerifyingHls}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                        >
                          {isVerifyingHls ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          Verify and publish
                        </button>
                      )}
                    </div>
                  </div>

                  {(isUploadingHls || hlsProgressPct > 0) && (
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 transition-all duration-200"
                          style={{ width: `${hlsProgressPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">{hlsProgressPct}%</p>
                    </div>
                  )}

                  <ul className="max-h-36 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-[11px] font-mono">
                    {hlsFiles.map((f) => (
                      <li key={f.relPath} className="flex items-center justify-between px-2.5 py-1.5 gap-2">
                        <span className="truncate">{f.relPath}</span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span
                            className={
                              f.status === "done"
                                ? "text-emerald-500"
                                : f.status === "error"
                                  ? "text-rose-500"
                                  : "text-slate-400"
                            }
                          >
                            {f.status}
                          </span>
                          {f.status === "error" && hlsSession?.uploadUrls[f.relPath] && (
                            <button
                              type="button"
                              onClick={() =>
                                uploadSingleHlsFile(f.relPath, f.file, hlsSession.uploadUrls[f.relPath])
                              }
                              className="text-amber-500 hover:underline font-sans font-semibold cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Or use the local CLI encoder:</span>
                <button
                  type="button"
                  onClick={handleGenerateCli}
                  disabled={!isLessonSaved || isGenerating}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  <Terminal className="w-3 h-3" />
                  Generate CLI command
                </button>
              </div>
              {cliCommand && (
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                    {cliCommand}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(cliCommand);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
