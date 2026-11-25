import React, { useEffect, useState } from "react";
import { Check, Copy, Loader2, Terminal, Link as LinkIcon } from "lucide-react";
import {
  useCreateLessonVideoCliTokenMutation,
  useGetLessonVideoStatusQuery,
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
  const { data: statusData, refetch } = useGetLessonVideoStatusQuery(lessonId, {
    skip: !lessonId,
    pollingInterval: shouldPoll ? 5000 : 0,
  });

  const [createCliToken, { isLoading: isGenerating }] = useCreateLessonVideoCliTokenMutation();
  const [switchToLink, { isLoading: isSwitching }] = useSwitchLessonVideoToLinkMutation();

  const serverMode =
    statusData?.videoProvider === "AZURE_HLS" ||
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
    if (mode !== "UPLOAD" || st === "READY" || st === "FAILED") {
      setShouldPoll(false);
      if (st === "READY" || st === "FAILED") {
        setHasGeneratedCmd(false);
      }
      return;
    }
    setShouldPoll(st === "UPLOADING" || hasGeneratedCmd);
  }, [mode, statusData?.videoStatus, hasGeneratedCmd]);

  const handleModeSwitch = async (next: "LINK" | "UPLOAD") => {
    setMode(next);
    if (next === "LINK" && (statusData?.videoProvider === "AZURE_HLS" || (statusData?.videoStatus && statusData.videoStatus !== "NONE"))) {
      try {
        await switchToLink(lessonId).unwrap();
        setCliCommand("");
        setHasGeneratedCmd(false);
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

  const statusKey = statusData?.videoStatus || "NONE";
  const badge = STATUS_STYLES[statusKey] || STATUS_STYLES.NONE;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleModeSwitch("LINK")}
          disabled={isSwitching}
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
          disabled={isSwitching}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
            mode === "UPLOAD"
              ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-300"
              : "bg-slate-50 dark:bg-[#070A11] border-slate-200 dark:border-slate-800 text-slate-500"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Upload video (local encoder)
        </button>
      </div>

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
              <span className="text-[11px] font-semibold text-slate-400">HLS Status:</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}>
                {badge.label}
              </span>
              {shouldPoll && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
            </div>
            <button
              type="button"
              onClick={handleGenerateCommand}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
              Generate command
            </button>
          </div>

          {statusData?.videoError && (
            <p className="text-xs text-rose-500 font-medium">{statusData.videoError}</p>
          )}

          {statusData?.videoHlsPath && statusKey === "READY" && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono break-all">
              HLS Path: {statusData.videoHlsPath}
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
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
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
