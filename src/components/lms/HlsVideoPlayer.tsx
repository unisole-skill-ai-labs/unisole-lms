import React, { useEffect, useRef, useState } from "react";
import { useGetLessonVideoAccessMutation } from "../../store/apiSlice";
import { Loader2, AlertCircle, Settings2, Check } from "lucide-react";

interface HlsVideoPlayerProps {
  lessonId: string;
  title?: string;
}

interface QualityOption {
  index: number;
  height: number;
  label: string;
}

const QUALITY_STORAGE_KEY = "unisole_hls_quality";

function readSavedQuality(): "auto" | number {
  try {
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY);
    if (!raw || raw === "auto") return "auto";
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : "auto";
  } catch {
    return "auto";
  }
}

function writeSavedQuality(val: "auto" | number) {
  try {
    localStorage.setItem(QUALITY_STORAGE_KEY, String(val));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export default function HlsVideoPlayer({ lessonId, title }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [getVideoAccess, { isLoading }] = useGetLessonVideoAccessMutation();
  const getVideoAccessRef = useRef(getVideoAccess);
  getVideoAccessRef.current = getVideoAccess;
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [needsClickToPlay, setNeedsClickToPlay] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<"auto" | number>(readSavedQuality);
  const [playingHeight, setPlayingHeight] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close quality menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    let hlsInstance: any = null;
    let cancelled = false;
    let refreshTimer: number | null = null;

    const scheduleTokenRefresh = (ttlSeconds?: number) => {
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
        refreshTimer = null;
      }
      const ttl = Number(ttlSeconds || 0);
      if (!ttl || ttl <= 0) return;
      const delayMs = Math.max(10_000, Math.floor(ttl * 0.8 * 1000));
      refreshTimer = window.setTimeout(async () => {
        if (cancelled) return;
        try {
          const refreshed = await getVideoAccessRef.current(lessonId).unwrap();
          if (cancelled) return;
          const videoEl = videoRef.current;
          if (!videoEl) return;
          const resumeTime = videoEl.currentTime || 0;
          const wasPlaying = !videoEl.paused;
          if (refreshed?.provider === "AZURE_MP4" && refreshed?.videoUrl) {
            videoEl.src = refreshed.videoUrl;
            videoEl.currentTime = resumeTime;
            if (wasPlaying) videoEl.play().catch(() => {});
          } else if (refreshed?.manifestUrl && hlsInstance) {
            hlsInstance.loadSource(refreshed.manifestUrl);
            hlsInstance.once?.("hlsManifestParsed", () => {
              if (!cancelled && videoRef.current) {
                videoRef.current.currentTime = resumeTime;
                if (wasPlaying) videoRef.current.play().catch(() => {});
              }
            });
          }
          scheduleTokenRefresh(refreshed?.ttlSeconds);
        } catch {
          // Will retry via HLS error handler if current token actually expires
        }
      }, delayMs);
    };

    async function loadStream() {
      setErrorMsg(null);
      setErrorDetails(null);
      setQualityOptions([]);
      setPlayingHeight(null);
      setMenuOpen(false);

      try {
        const res = await getVideoAccessRef.current(lessonId).unwrap();
        if (cancelled) return;
        const videoEl = videoRef.current;
        if (!videoEl) {
          setErrorMsg("Video stream is unavailable.");
          return;
        }

        // Direct MP4 playback via short-lived Azure Read SAS URL (no quality menu)
        if (res?.provider === "AZURE_MP4" && res?.videoUrl) {
          videoEl.src = res.videoUrl;
          scheduleTokenRefresh(res?.ttlSeconds);
          return;
        }

        const manifestUrl = res?.manifestUrl;
        if (!manifestUrl) {
          setErrorMsg("Video stream is unavailable.");
          return;
        }
        scheduleTokenRefresh(res?.ttlSeconds);

        // Dynamic import keeps hls.js out of the initial LMS bundle
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            startPosition: -1,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            backBufferLength: 30,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 4,
            fragLoadingRetryDelay: 1000,
            levelLoadingMaxRetry: 4,
            maxBufferHole: 0.5,
            nudgeMaxRetry: 5,
          });
          hlsRef.current = hlsInstance;

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, (_event: any, data: any) => {
            if (cancelled) return;
            const rawLevels: any[] = data?.levels || hlsInstance.levels || [];
            // Deduplicate by height (keeping highest bitrate per height) and sort highest first
            const byHeight = new Map<number, { index: number; height: number; bitrate: number }>();
            rawLevels.forEach((lvl, idx) => {
              const h = Number(lvl?.height || 0);
              if (h <= 0) return;
              const br = Number(lvl?.bitrate || 0);
              const prev = byHeight.get(h);
              if (!prev || br > prev.bitrate) {
                byHeight.set(h, { index: idx, height: h, bitrate: br });
              }
            });

            const sorted: QualityOption[] = Array.from(byHeight.values())
              .sort((a, b) => b.height - a.height)
              .map((item) => ({
                index: item.index,
                height: item.height,
                label: `${item.height}p`,
              }));

            setQualityOptions(sorted);

            // Apply saved preference if available on this video; otherwise fall back to Auto (-1)
            const saved = readSavedQuality();
            const match = saved !== "auto" ? sorted.find((o) => o.height === saved) : undefined;
            if (match) {
              hlsInstance.currentLevel = match.index;
              setSelectedQuality(match.height);
              setPlayingHeight(match.height);
            } else {
              hlsInstance.currentLevel = -1;
              setSelectedQuality("auto");
            }
          });

          hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_event: any, data: any) => {
            if (cancelled) return;
            const lvl = hlsInstance.levels?.[data?.level];
            if (lvl?.height) {
              setPlayingHeight(Number(lvl.height));
            }
          });

          hlsInstance.loadSource(manifestUrl);
          hlsInstance.attachMedia(videoEl);
          let networkRetries = 0;
          let mediaRecoverStep = 0; // 0: none, 1: recoverMediaError, 2: swapAudioCodec+recoverMediaError, 3: final recoverMediaError
          let authRefreshed = false;
          let healthySinceMs = Date.now();
          const loggedErrors = new Set<string>();

          const onPlaying = () => {
            if (Date.now() - healthySinceMs >= 30_000) {
              networkRetries = 0;
              mediaRecoverStep = 0;
            }
          };
          videoEl.addEventListener("timeupdate", onPlaying);

          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            videoEl.play().catch(() => {
              if (!cancelled) setNeedsClickToPlay(true);
            });
          });

          hlsInstance.on(Hls.Events.ERROR, async (_event: any, data: any) => {
            if (cancelled) return;
            const rawUrl = data?.frag?.url || data?.url || data?.networkDetails?.responseURL || "";
            const safeFragPath = rawUrl ? String(rawUrl).split("?")[0].split("/").slice(-3).join("/") : undefined;
            const levelIdx = hlsInstance?.currentLevel ?? -1;
            const levelHeight = levelIdx >= 0 ? hlsInstance?.levels?.[levelIdx]?.height : undefined;
            const levelLabel = levelHeight ? `${levelHeight}p` : `level:${levelIdx}`;
            const summary = `${data?.type || "ERR"}/${data?.details || "unknown"}${data?.response?.code ? ` (HTTP ${data.response.code})` : ""} [${levelLabel}]${safeFragPath ? ` [${safeFragPath}]` : ""}`;
            const logKey = `${data?.type}:${data?.details}:${safeFragPath || ""}`;
            if (!loggedErrors.has(logKey)) {
              loggedErrors.add(logKey);
              console.error("[HLS error]", { lessonId, type: data?.type, details: data?.details, fatal: Boolean(data?.fatal), code: data?.response?.code, level: levelLabel, frag: safeFragPath });
            }
            if (!data?.fatal) return;

            const httpStatus = data?.response?.code;
            if ((httpStatus === 401 || httpStatus === 403) && !authRefreshed) {
              authRefreshed = true;
              try {
                const refreshed = await getVideoAccessRef.current(lessonId).unwrap();
                if (!cancelled && refreshed?.manifestUrl) {
                  const resumeTime = videoEl.currentTime || 0;
                  hlsInstance.loadSource(refreshed.manifestUrl);
                  videoEl.currentTime = resumeTime;
                  scheduleTokenRefresh(refreshed?.ttlSeconds);
                  return;
                }
              } catch {
                // fall through to error state
              }
            }
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
              networkRetries += 1;
              const backoff = 500 * networkRetries;
              window.setTimeout(() => {
                if (!cancelled && hlsRef.current) hlsRef.current.startLoad();
              }, backoff);
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              healthySinceMs = Date.now();
              if (mediaRecoverStep === 0) {
                mediaRecoverStep = 1;
                hlsInstance.recoverMediaError();
                return;
              }
              if (mediaRecoverStep === 1) {
                mediaRecoverStep = 2;
                hlsInstance.swapAudioCodec();
                hlsInstance.recoverMediaError();
                return;
              }
              if (mediaRecoverStep === 2) {
                mediaRecoverStep = 3;
                hlsInstance.recoverMediaError();
                return;
              }
            }
            setErrorDetails(summary);
            setErrorMsg(
              httpStatus === 404
                ? "Video segment not found. This video may need to be re-uploaded."
                : "Playback was interrupted while loading the video stream."
            );
          });
        } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS fallback (iOS Safari manages ABR natively)
          videoEl.src = manifestUrl;
        } else {
          setErrorMsg("Your browser does not support adaptive HLS playback.");
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorMsg(err?.data?.error || err?.message || "Failed to load video access.");
        }
      }
    }

    loadStream();
    return () => {
      cancelled = true;
      if (refreshTimer !== null) {
        window.clearTimeout(refreshTimer);
      }
      hlsRef.current = null;
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [lessonId, reloadKey]);

  const handleSelectQuality = (choice: "auto" | number, levelIndex: number) => {
    setSelectedQuality(choice);
    writeSavedQuality(choice);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
    }
    if (choice !== "auto") {
      setPlayingHeight(choice);
    } else if (hlsRef.current) {
      const currIdx = hlsRef.current.currentLevel;
      const currH = currIdx >= 0 ? hlsRef.current.levels?.[currIdx]?.height : null;
      if (currH) setPlayingHeight(Number(currH));
    }
    setMenuOpen(false);
  };

  if (errorMsg) {
    const mailtoSubject = encodeURIComponent(`Video playback issue (lesson ${lessonId})`);
    const mailtoBody = encodeURIComponent(`Lesson ID: ${lessonId}\nError: ${errorDetails || errorMsg}`);
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-6 text-center gap-3">
        <AlertCircle className="w-7 h-7 text-rose-400" />
        <p className="text-sm font-medium">{errorMsg}</p>
        {errorDetails && (
          <p className="text-[11px] font-mono text-slate-400">{errorDetails}</p>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="hls-retry-btn"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
          <a
            href={`mailto:support@unisole.org?subject=${mailtoSubject}&body=${mailtoBody}`}
            className="px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-900 text-slate-300 text-xs font-semibold"
          >
            Report problem
          </a>
        </div>
      </div>
    );
  }

  const buttonLabel =
    selectedQuality === "auto"
      ? playingHeight
        ? `Auto (${playingHeight}p)`
        : "Auto"
      : `${selectedQuality}p`;

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      )}

      {qualityOptions.length > 1 && (
        <div ref={menuRef} className="absolute top-3 right-3 z-20">
          <button
            type="button"
            data-testid="hls-quality-button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/75 hover:bg-black/90 text-white border border-white/20 text-xs font-semibold backdrop-blur-xs shadow-md transition-colors cursor-pointer min-h-[36px]"
          >
            <Settings2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{buttonLabel}</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              data-testid="hls-quality-menu"
              className="absolute right-0 mt-1.5 w-36 rounded-xl bg-slate-900/95 border border-white/15 shadow-xl py-1 backdrop-blur-md z-30"
            >
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selectedQuality === "auto"}
                onClick={() => handleSelectQuality("auto", -1)}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/10 flex items-center justify-between cursor-pointer min-h-[36px]"
              >
                <span>Auto</span>
                {selectedQuality === "auto" && <Check className="w-3.5 h-3.5 text-sky-400" />}
              </button>
              {qualityOptions.map((opt) => (
                <button
                  key={opt.height}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selectedQuality === opt.height}
                  onClick={() => handleSelectQuality(opt.height, opt.index)}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-white hover:bg-white/10 flex items-center justify-between cursor-pointer min-h-[36px]"
                >
                  <span>{opt.label}</span>
                  {selectedQuality === opt.height && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        title={title || "Lesson Video"}
        controls
        playsInline
        controlsList="nodownload"
        onPlay={() => setNeedsClickToPlay(false)}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full object-contain"
      />
      {needsClickToPlay && !isLoading && !errorMsg && (
        <button
          type="button"
          onClick={() => {
            setNeedsClickToPlay(false);
            videoRef.current?.play().catch(() => {});
          }}
          className="absolute inset-0 m-auto w-fit h-fit px-4 py-2 rounded-xl bg-sky-500/95 hover:bg-sky-400 text-slate-950 text-xs font-bold shadow-lg cursor-pointer z-20"
        >
          Click to play
        </button>
      )}
    </div>
  );
}
