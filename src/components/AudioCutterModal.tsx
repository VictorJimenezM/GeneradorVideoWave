import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trimAudio, isFFmpegLoaded, waitForFFmpeg } from "../utils/convertWebmToMp4";

interface Props {
  open: boolean;
  audioUrl: string;
  audioFile: File | null;
  fileName: string;
  onClose: () => void;
  onApplyTrim: (trimmedBlob: Blob, trimmedFileName: string) => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioCutterModal({
  open,
  audioUrl,
  audioFile,
  fileName,
  onClose,
  onApplyTrim,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  const [samples, setSamples] = useState<Float32Array | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<"all" | "selection">("all");
  const [trimStart, setTrimStart] = useState<number | null>(null);
  const [trimEnd, setTrimEnd] = useState<number | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimError, setTrimError] = useState<string | null>(null);
  const [trimProgress, setTrimProgress] = useState(0);

  const samplesRef = useRef<Float32Array | null>(null);
  const durationRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playModeRef = useRef<"all" | "selection">("all");
  const trimStartRef = useRef<number | null>(null);
  const trimEndRef = useRef<number | null>(null);

  useEffect(() => { samplesRef.current = samples; }, [samples]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playModeRef.current = playMode; }, [playMode]);
  useEffect(() => { trimStartRef.current = trimStart; }, [trimStart]);
  useEffect(() => { trimEndRef.current = trimEnd; }, [trimEnd]);

  const stopPlayback = useCallback(() => {
    const el = audioElRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setIsPlaying(false);
    setPlayMode("all");
  }, []);

  useEffect(() => {
    if (!open) return;

    const audioEl = document.createElement("audio");
    audioEl.preload = "auto";
    audioEl.crossOrigin = "anonymous";
    audioElRef.current = audioEl;

    const onTimeUpdate = () => {
      const el = audioElRef.current;
      if (!el) return;
      const t = el.currentTime;
      setCurrentTime(t);

      if (playModeRef.current === "selection") {
        const end = trimEndRef.current;
        if (end !== null && t >= end) {
          el.pause();
          el.currentTime = end;
          setIsPlaying(false);
        }
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setPlayMode("all");
    };

    audioEl.addEventListener("timeupdate", onTimeUpdate);
    audioEl.addEventListener("ended", onEnded);

    audioEl.src = audioUrl;
    audioEl.load();

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextCtor();
    audioCtxRef.current = audioCtx;

    (async () => {
      try {
        const res = await fetch(audioUrl);
        const buf = await res.arrayBuffer();
        const decoded = await audioCtx.decodeAudioData(buf);

        const ch = decoded.numberOfChannels;
        const len = decoded.length;
        const mono = new Float32Array(len);
        if (ch === 1) {
          mono.set(decoded.getChannelData(0));
        } else {
          for (let c = 0; c < ch; c++) {
            const data = decoded.getChannelData(c);
            for (let i = 0; i < len; i++) mono[i] += data[i];
          }
        }

        setSamples(mono);
        setDuration(decoded.duration);
      } catch (e: any) {
        console.error("[AudioCutter] decode error:", e);
      }
    })();

    return () => {
      audioEl.pause();
      audioEl.removeEventListener("timeupdate", onTimeUpdate);
      audioEl.removeEventListener("ended", onEnded);
      audioEl.src = "";
      audioElRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    };
  }, [open, audioUrl]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setTrimStart(null);
    setTrimEnd(null);
    setCurrentTime(0);
    setIsPlaying(false);
    setPlayMode("all");
    setTrimError(null);
    setTrimProgress(0);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const data = samplesRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * dpr);
    const h = Math.floor(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, w, h);

    const dur = durationRef.current;
    const t = audioElRef.current?.currentTime ?? 0;
    const tStart = trimStartRef.current;
    const tEnd = trimEndRef.current;

    if (tStart !== null && tEnd !== null && dur > 0) {
      const x1 = (tStart / dur) * w;
      const x2 = (tEnd / dur) * w;
      ctx.fillStyle = "rgba(99,102,241,0.12)";
      ctx.fillRect(x1, 0, x2 - x1, h);
    }

    const step = Math.max(1, Math.floor(data.length / w));
    const midY = h / 2;

    ctx.lineWidth = 1;

    for (let x = 0; x < w; x++) {
      const sampleIdx = Math.floor((x / w) * data.length);
      let max = 0;
      for (let j = 0; j < step; j++) {
        const idx = sampleIdx + j;
        if (idx < data.length) {
          const v = Math.abs(data[idx]);
          if (v > max) max = v;
        }
      }
      const barH = max * midY * 0.85;

      const inSelection =
        tStart !== null && tEnd !== null && dur > 0 &&
        (x / w) * dur >= tStart && (x / w) * dur <= tEnd;

      ctx.fillStyle = inSelection
        ? "rgba(129,140,248,0.85)"
        : "rgba(99,102,241,0.55)";
      ctx.fillRect(x, midY - barH, 1, barH * 2);
    }

    if (tStart !== null && dur > 0) {
      const x = (tStart / dur) * w;
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("I", x, 14 * dpr);
    }

    if (tEnd !== null && dur > 0) {
      const x = (tEnd / dur) * w;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = `bold ${11 * dpr}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("F", x, 14 * dpr);
    }

    if (dur > 0) {
      const cx = (t / dur) * w;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2 * dpr;
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 6 * dpr;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, []);

  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      drawWaveform();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    if (open && samples) {
      loop();
    }
    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [open, samples, drawWaveform, trimStart, trimEnd]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const el = audioElRef.current;
    if (!canvas || !el || durationRef.current <= 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const time = ratio * durationRef.current;

    el.currentTime = time;
    setCurrentTime(time);
  };

  const togglePlay = () => {
    const el = audioElRef.current;
    if (!el) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      return;
    }

    setPlayMode("all");
    el.currentTime = currentTime;
    el.play();
    setIsPlaying(true);
  };

  const handleSetStart = () => {
    setTrimStart(currentTime);
    if (trimEnd !== null && currentTime >= trimEnd) {
      setTrimEnd(null);
    }
  };

  const handleSetEnd = () => {
    setTrimEnd(currentTime);
    if (trimStart !== null && currentTime <= trimStart) {
      setTrimStart(null);
    }
  };

  const playSelection = () => {
    const el = audioElRef.current;
    if (!el || trimStart === null || trimEnd === null) return;

    setPlayMode("selection");
    el.currentTime = trimStart;
    el.play();
    setIsPlaying(true);
  };

  const canApply = trimStart !== null && trimEnd !== null && trimStart < trimEnd && audioFile && isFFmpegLoaded();

  const handleApply = async () => {
    if (!canApply || !audioFile) return;

    setIsTrimming(true);
    setTrimError(null);
    setTrimProgress(0);

    try {
      if (!isFFmpegLoaded()) {
        const ready = await waitForFFmpeg();
        if (!ready) throw new Error("FFmpeg no se pudo cargar");
      }

      stopPlayback();

      const blob = await trimAudio(audioFile, trimStart, trimEnd, {
        onProgress: (pct) => setTrimProgress(pct),
      });

      const baseName = fileName.replace(/\.[^.]+$/, "");
      const trimmedName = `${baseName}_cortado.mp3`;

      onApplyTrim(blob, trimmedName);
    } catch (e: any) {
      setTrimError(e?.message ?? "Error al cortar el audio");
    } finally {
      setIsTrimming(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 bg-slate-900/95 rounded-xl border border-slate-700/60 shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
            CORTAR AUDIO
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-3 text-xs text-slate-400 truncate">{fileName}</div>

        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-32 rounded-lg border border-slate-700/40 cursor-pointer mb-3"
        />

        <div className="flex items-center justify-between text-xs text-slate-300 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span className="text-slate-500">{formatTime(duration)}</span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!samples}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-200 transition-all hover:bg-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying && playMode === "all" ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
            {isPlaying && playMode === "all" ? "Pausa" : "Play"}
          </button>

          <button
            type="button"
            onClick={handleSetStart}
            disabled={!samples}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 transition-all hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="19,20 9,12 19,4" fill="currentColor" />
              <line x1="5" y1="4" x2="5" y2="20" />
            </svg>
            Inicio
          </button>

          <button
            type="button"
            onClick={playSelection}
            disabled={!samples || trimStart === null || trimEnd === null}
            className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-200 transition-all hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPlaying && playMode === "selection" ? (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" fill="currentColor" />
              </svg>
            )}
            Solo corte
          </button>

          <button
            type="button"
            onClick={handleSetEnd}
            disabled={!samples}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-200 transition-all hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Fin
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="4" x2="19" y2="20" />
              <polygon points="5,4 15,12 5,20" fill="currentColor" />
            </svg>
          </button>
        </div>

        {(trimStart !== null || trimEnd !== null) && (
          <div className="text-center text-xs text-slate-400 mb-3">
            {trimStart !== null && <span className="text-emerald-400">Inicio: {formatTime(trimStart)}</span>}
            {trimStart !== null && trimEnd !== null && <span className="mx-2 text-slate-600">→</span>}
            {trimEnd !== null && <span className="text-rose-400">Fin: {formatTime(trimEnd)}</span>}
            {trimStart !== null && trimEnd !== null && trimStart < trimEnd && (
              <span className="ml-2 text-slate-500">({formatTime(trimEnd - trimStart)})</span>
            )}
          </div>
        )}

        {trimError && (
          <div className="text-center text-xs text-red-400 mb-3">{trimError}</div>
        )}

        {isTrimming && (
          <div className="mb-3">
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${trimProgress}%` }}
              />
            </div>
            <div className="text-center text-xs text-amber-400 mt-1">Cortando audio... {trimProgress}%</div>
          </div>
        )}

        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply || isTrimming}
          className="w-full rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 transition-all hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/30"
        >
          {isTrimming ? "Cortando..." : "Establecer"}
        </button>
      </div>
    </div>,
    document.body
  );
}
