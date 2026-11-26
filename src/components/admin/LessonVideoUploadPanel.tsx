import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  Terminal,
  Link as LinkIcon,
  Upload,
  X,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import {
  useCheckVideoSetupMutation,
  useCompleteSimpleVideoUploadMutation,
  useCreateLessonVideoCliTokenMutation,
  useFailSimpleVideoUploadMutation,
  useGetLessonVideoStatusQuery,
  useInitSimpleVideoUploadMutation,
  useSwitchLessonVideoToLinkMutation,
} from "../../store/apiSlice";

interface LessonVideoUploadPanelProps {
  lessonId: string;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  durationMinutes: number;
  onDurationChange: (mins: number) => void;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  NONE: { label: "None", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  UPLOADING: { label: "Uploading", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
  READY: { label: "Ready", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" },
  FAILED: { label: "Failed", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-300" },
};

export default function LessonVideoUploadPanel({
  lessonId,
  videoUrl,
  onVideoUrlChange,
  durationMinutes,
  onDurationChange,
}: LessonVideoUploadPanelProps) {
  const [hasGeneratedCmd, setHasGeneratedCmd] = useState(false);
  const [cliCommand, setCliCommand] = useState("");
  const [copied, setCopied] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);

  // Simple MP4 upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploadingMp4, setIsUploadingMp4] = useState(false);
  const [simpleError, setSimpleError] = useState<string | null>(null);

  const { data: statusData, refetch } = useGetLessonVideoStatusQuery(lessonId, {
    skip: !lessonId,
    pollingInterval: shouldPoll ? 5000 : 0,
  });

  const [createCliToken, { isLoading: isGenerating }] = useCreateLessonVideoCliTokenMutation();
  const [switchToLink, { isLoading: isSwitching }] = useSwitchLessonVideoToLinkMutation();
  const [initSimpleUpload] = useInitSimpleVideoUploadMutation();
  const [completeSimpleUpload] = useCompleteSimpleVideoUploadMutation();
  const [failSimpleUpload] = useFailSimpleVideoUploadMutation();
  const [checkVideoSetup, { data: setupResult, isLoading: isCheckingSetup }] =
    useCheckVideoSetupMutation();

  const uploadMode: "hls" | "simple" | "both" = statusData?.uploadMode || "hls";
  const maxSizeMb: number = statusData?.maxSizeMb || 500;
  const allowSimple = uploadMode === "simple" || uploadMode === "both";
  const allowHls = uploadMode === "hls" || uploadMode === "both";

  const isUploadedProvider =
    statusData?.videoProvider === "AZURE_HLS" || statusData?.videoProvider === "AZURE_MP4";

  const serverMode =
    isUploadedProvider ||
    statusData?.videoStatus === "UPLOADING" ||
    statusData?.videoStatus === "READY" ||
    statusData?.videoStatus === "FAILED"
      ? "UPLOAD"
      : "LINK";

  const [mode, setMode] = useState<"LINK" | "UPLOAD">(serverMode);

  useEffect(() => {
    setMode(serverMode);
  }, [lessonId, serverMode]);

  useEffect(() => {
    const st = statusData?.videoStatus;
    if (mode !== "UPLOAD" || st === "READY" || st === "FAILED" || isUploadingMp4) {
      setShouldPoll(false);
      if (st === "READY" || st === "FAILED") {
        setHasGeneratedCmd(false);
      }
      return;
    }
    setShouldPoll(st === "UPLOADING" || hasGeneratedCmd);
  }, [mode, statusData?.videoStatus, hasGeneratedCmd, isUploadingMp4]);

  const handleModeSwitch = async (next: "LINK" | "UPLOAD") => {
    setMode(next);
    if (
      next === "LINK" &&
      (isUploadedProvider || (statusData?.videoStatus && statusData.videoStatus !== "NONE"))
    ) {
      try {
        await switchToLink(lessonId).unwrap();
        setCliCommand("");
        setHasGeneratedCmd(false);
        setSimpleError(null);
        refetch();
      } catch {
        // Ignore if already in link mode
      }
    }
  };

  const handleGenerateCommand = async () => {
    try {
      const res = await createCliToken(lessonId).unwrap();
      setCliCommand(res?.command || "");
      setHasGeneratedCmd(true);
      setCopied(false);
    } catch {
      setCliCommand("");
    }
  };

  const handleCopy = async () => {
    if (!cliCommand) return;
    await navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startSimpleUpload = async (file: File) => {
    setSimpleError(null);
    if (!/\.mp4$/i.test(file.name)) {
      setSimpleError("Only .mp4 files are supported.");
      return;
    }
    if (file.type && file.type !== "video/mp4") {
      setSimpleError("Invalid file type. Please select an MP4 (video/mp4) file.");
      return;
    }
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size <= 0 || file.size > maxBytes) {
      setSimpleError(`File size must be under ${maxSizeMb} MB.`);
      return;
    }

    setSelectedFile(file);
    setIsUploadingMp4(true);
    setUploadProgress(0);

    try {
      const initRes = await initSimpleUpload({
        lessonId,
        fileName: file.name,
        contentType: "video/mp4",
        sizeBytes: file.size,
      }).unwrap();

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", initRes.uploadUrl, true);
        xhr.setRequestHeader("x-ms-blob-type", "BlockBlob");
        xhr.setRequestHeader("Content-Type", "video/mp4");

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable && evt.total > 0) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network/CORS error while uploading MP4"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(file);
      });

      await completeSimpleUpload({
        lessonId,
        blobPath: initRes.blobPath,
        durationMinutes: durationMinutes > 0 ? durationMinutes : undefined,
      }).unwrap();

      setUploadProgress(100);
      setIsUploadingMp4(false);
      refetch();
    } catch (err: any) {
      const msg = err?.data?.error || err?.message || "Upload failed";
      setSimpleError(msg);
      setIsUploadingMp4(false);
      failSimpleUpload({ lessonId, error: msg }).catch(() => {});
      refetch();
    } finally {
      xhrRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
  };

  const statusKey = statusData?.videoStatus || "NONE";
  const badge = STATUS_STYLES[statusKey] || STATUS_STYLES.NONE;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleModeSwitch("LINK")}
            disabled={isSwitching || isUploadingMp4}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              mode === "LINK"
                ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
                : "bg-slate-50 dark:bg-[#070A11] border-slate-200 dark:border-slate-800 text-slate-500"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            YouTube/Vimeo link
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch("UPLOAD")}
            disabled={isSwitching || isUploadingMp4}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              mode === "UPLOAD"
                ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
                : "bg-slate-50 dark:bg-[#070A11] border-slate-200 dark:border-slate-800 text-slate-500"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            {allowSimple ? "Upload MP4 Video" : "Upload video (local encoder)"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => checkVideoSetup(undefined)}
          disabled={isCheckingSetup}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
        >
          {isCheckingSetup ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          )}
          Check Video Setup
        </button>
      </div>

      {setupResult && (
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-[11px] space-y-1">
          <div className="flex flex-wrap items-center gap-3 font-semibold">
            <span>Storage: {setupResult.storageMode}</span>
            <span>Upload mode: {setupResult.uploadMode}</span>
            <span className={setupResult.connectivity?.ok ? "text-emerald-600" : "text-amber-600"}>
              Connectivity: {setupResult.connectivity?.ok ? "OK" : "Not ready"}
            </span>
            <span className={setupResult.corsCheck?.ok ? "text-emerald-600" : "text-amber-600"}>
              CORS: {setupResult.corsCheck?.ok ? "OK" : "Not verified"}
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">{setupResult.connectivity?.message}</p>
        </div>
      )}

      {mode === "LINK" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
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
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => onDurationChange(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070A11] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono"
            />
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070A11] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Video Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
              {(shouldPoll || isUploadingMp4) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              )}
            </div>

            {allowHls && (
              <button
                type="button"
                onClick={handleGenerateCommand}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Terminal className="w-3.5 h-3.5" />
                )}
                Generate HLS command
              </button>
            )}
          </div>

          {allowSimple && (
            <div className="space-y-2 border-t border-slate-200/70 dark:border-slate-800/70 pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  disabled={isUploadingMp4}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) startSimpleUpload(f);
                  }}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500/15 file:text-sky-600 dark:file:text-sky-300 hover:file:bg-sky-500/25 cursor-pointer"
                />
                {isUploadingMp4 && (
                  <button
                    type="button"
                    onClick={handleCancelUpload}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 text-xs font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                )}
                {!isUploadingMp4 && simpleError && selectedFile && (
                  <button
                    type="button"
                    onClick={() => startSimpleUpload(selectedFile)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-600 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Direct MP4 upload to Azure Blob Storage (max {maxSizeMb} MB).
              </p>

              {(isUploadingMp4 || uploadProgress > 0) && (
                <div className="w-full space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">{uploadProgress}%</p>
                </div>
              )}
            </div>
          )}

          {(simpleError || statusData?.videoError) && (
            <p className="text-xs text-rose-500 font-medium">
              {simpleError || statusData?.videoError}
            </p>
          )}

          {statusData?.videoHlsPath && statusKey === "READY" && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all">
              Video Blob Path: {statusData.videoHlsPath}
            </p>
          )}

          {cliCommand && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Run on your MacBook with <code className="font-mono">ffmpeg</code> installed, replacing{" "}
                <code className="font-mono">&lt;path-to-video.mp4&gt;</code>:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto whitespace-nowrap">
                  {cliCommand}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
