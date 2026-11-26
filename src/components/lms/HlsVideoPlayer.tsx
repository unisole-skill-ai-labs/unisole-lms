import React, { useEffect, useRef, useState } from "react";
import { useGetLessonVideoAccessMutation } from "../../store/apiSlice";
import { Loader2, AlertCircle } from "lucide-react";

interface HlsVideoPlayerProps {
  lessonId: string;
  title?: string;
}

export default function HlsVideoPlayer({ lessonId, title }: HlsVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [getVideoAccess, { isLoading }] = useGetLessonVideoAccessMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let hlsInstance: any = null;
    let cancelled = false;

    async function loadStream() {
      setErrorMsg(null);
      try {
        const res = await getVideoAccess(lessonId).unwrap();
        if (cancelled) return;
        const manifestUrl = res?.manifestUrl;
        const videoEl = videoRef.current;
        if (!manifestUrl || !videoEl) {
          setErrorMsg("Video stream is unavailable.");
          return;
        }

        // Native HLS (iOS Safari / macOS Safari)
        if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          videoEl.src = manifestUrl;
          return;
        }

        // Dynamic import keeps hls.js out of the initial LMS bundle
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          hlsInstance = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hlsInstance.loadSource(manifestUrl);
          hlsInstance.attachMedia(videoEl);
          hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
            if (data?.fatal) {
              setErrorMsg("Unable to load video stream. Please try refreshing.");
            }
          });
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
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [lessonId, getVideoAccess]);

  if (errorMsg) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-300 p-6 text-center gap-2">
        <AlertCircle className="w-7 h-7 text-rose-400" />
        <p className="text-sm font-medium">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        title={title || "Lesson Video"}
        controls
        playsInline
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
