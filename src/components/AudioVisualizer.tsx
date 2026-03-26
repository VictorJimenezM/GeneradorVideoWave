import { useEffect, useMemo, useRef, useState } from "react";
import RecordRTC from "recordrtc";
import { toBlobURL } from "@ffmpeg/util";
import { FFmpeg } from "@ffmpeg/ffmpeg";

const TWO_PI = Math.PI * 2;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hexToRgba(hex: string, alpha: number) {
  // Accept "#RRGGBB" or "#RGB"
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = clamp(alpha, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

type Point = { x: number; y: number };

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Waveform (decoded) for deterministic circular mapping.
  const monoSamplesRef = useRef<Float32Array | null>(null);
  const totalSamplesRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Precomputed circular geometry (unit vectors) for points along duration.
  const precomputedCosRef = useRef<Float32Array | null>(null);
  const precomputedSinRef = useRef<Float32Array | null>(null);
  const sampleStepRef = useRef<number>(1);
  const pointCountRef = useRef<number>(0);

  // Drawing state (refs to avoid re-renders during animation).
  const rafRef = useRef<number | null>(null);
  const drawingModeRef = useRef<"idle" | "preview" | "record">("idle");
  const isAnimatingRef = useRef(false);

  const lastDrawnPointIndexRef = useRef<number>(-1);
  const lastCurvePointRef = useRef<Point | null>(null);
  const lastTipRef = useRef<{ x: number; y: number; r: number } | null>(null);
  const hasClearedRef = useRef(false);

  // Recording
  const recorderRef = useRef<any | null>(null);
  const finishRecordRef = useRef<(() => void) | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  // Offline export (FFmpeg)
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [ffmpegLoadError, setFfmpegLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState<
    "idle" | "loading-ffmpeg" | "rendering-frames" | "encoding" | "done"
  >("idle");
  const [transparentBg, setTransparentBg] = useState(false);

  // UI / audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [waveformReady, setWaveformReady] = useState(false);
  const [isLoopingUI, setIsLoopingUI] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);

  // Live parameters (state + refs for drawing loop).
  const [radiusRatio, setRadiusRatio] = useState(0.46); // radio base = min(cx,cy) * ratio
  const [intensity, setIntensity] = useState(0.28); // amp radius = radiusBase * intensity
  const [strokeWidth, setStrokeWidth] = useState(4.5);
  const [waveColor, setWaveColor] = useState("#6366f1"); // indigo-500
  const [bgColor, setBgColor] = useState("#020617"); // slate-950

  const paramsRef = useRef({
    radiusRatio,
    intensity,
    strokeWidth,
    waveColor,
    bgColor,
  });

  useEffect(() => {
    paramsRef.current = { radiusRatio, intensity, strokeWidth, waveColor, bgColor };
  }, [radiusRatio, intensity, strokeWidth, waveColor, bgColor]);

  // Live preview: if parameters change while previewing, we clear the canvas
  // and let the current animation frame redraw with the new style.
  useEffect(() => {
    if (!isPreviewing) return;
    if (drawingModeRef.current !== "preview") return;
    if (!waveformReady) return;

    clearCanvasSolid();
    resetDrawingState();
    hasClearedRef.current = true; // we've already cleared; avoid double clear
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusRatio, intensity, strokeWidth, waveColor, bgColor, isPreviewing, waveformReady]);

  const fftLikePointsPerCircle = 2600; // smoothness vs performance

  const radiusBaseRatioRef = useRef(radiusRatio);
  useEffect(() => {
    radiusBaseRatioRef.current = radiusRatio;
  }, [radiusRatio]);

  const stopAll = async () => {
    // Stop animation loop first.
    isAnimatingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    // Stop audio.
    const audioEl = audioRef.current;
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch {
        // ignore
      }
    }

    // Stop recorder if any.
    if (recorderRef.current) {
      try {
        recorderRef.current.stopRecording?.();
      } catch {
        // ignore
      }
      recorderRef.current = null;
    }
    finishRecordRef.current = null;

    setIsPreviewing(false);
    setIsRecording(false);
  };

  const ensureCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!ctxRef.current) ctxRef.current = canvas.getContext("2d");
    return ctxRef.current;
  };

  const clearCanvasSolid = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const { bgColor } = paramsRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasClearedRef.current = true;
  };

  const fadeCanvas = (alpha: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const { bgColor } = paramsRef.current;
    ctx.fillStyle = hexToRgba(bgColor, alpha);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const syncCanvasSize = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (drawingModeRef.current === "record") return; // video size is set explicitly

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      clearCanvasSolid();
    }
  };

  const setCanvasVideoSquare1080 = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.floor(1080 * dpr);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
  };

  const getOffscreenCanvas2D = (w: number, h: number) => {
    if (typeof (window as any).OffscreenCanvas !== "undefined") {
      const c = new (window as any).OffscreenCanvas(w, h);
     
      const ctx = c.getContext("2d");

      if (!ctx) {
        throw new Error("No se pudo inicializar el contexto de dibujo");
      }

      return { canvas: c as any, ctx: ctx as any };
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    return { canvas: c as any, ctx: ctx as any };
  };

  const canvasToPngBytes = async (c: any): Promise<Uint8Array> => {
    // OffscreenCanvas: convertToBlob; HTMLCanvasElement: toBlob.
    let blob: Blob | null = null;
    if (typeof c.convertToBlob === "function") {
      blob = await c.convertToBlob({ type: "image/png" });
    } else {
      blob = await new Promise<Blob | null>((resolve) => {
        c.toBlob((b: Blob | null) => resolve(b), "image/png");
      });
    }
    if (!blob) throw new Error("No se pudo generar PNG del frame.");
    return new Uint8Array(await blob.arrayBuffer());
  };

  const toBlobURL = async (url: string, type: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };
  
  const ensureFFmpegLoaded = async () => {
    if (ffmpegRef.current && isFFmpegLoaded) return ffmpegRef.current;

    setExportStage("loading-ffmpeg");
    setExportProgress(0);
    setFfmpegLoadError(null);
    setIsFFmpegLoaded(false);

    const resolveURL = async (candidates: string[], label: string) => {
      for (const p of candidates) {
        const url = new URL(p, window.location.href).toString();
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (res.ok) return url;
        } catch {
          // ignore and try next candidate
        }
      }
      throw new Error(`No se encontró ${label} en rutas: ${candidates.join(", ")}`);
    };

    // Soportamos ambos layouts:
    // - public/ffmpeg-core.*  -> /ffmpeg-core.*
    // - public/ffmpeg/ffmpeg-core.* -> /ffmpeg/ffmpeg-core.*
    const coreURL = await resolveURL(
      ["/ffmpeg-core.js", "/ffmpeg/ffmpeg-core.js"],
      "ffmpeg-core.js"
    );
    const wasmURL = await resolveURL(
      ["/ffmpeg-core.wasm", "/ffmpeg/ffmpeg-core.wasm"],
      "ffmpeg-core.wasm"
    );
    const workerURL = await resolveURL(
      ["/ffmpeg-core.worker.js", "/ffmpeg/ffmpeg-core.worker.js"],
      "ffmpeg-core.worker.js"
    );

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    const checkURL = async (url: string, label: string) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(
          `${label} fetch failed: ${res.status} ${res.statusText}`
        );
      }
    };

    const LOAD_TIMEOUT_MS = 60000;
    try {
      // Validate resources exist before starting heavy ffmpeg.load().
      await Promise.all([
        checkURL(coreURL, "ffmpeg-core.js"),
        checkURL(wasmURL, "ffmpeg-core.wasm"),
        checkURL(workerURL, "ffmpeg-core.worker.js"),
      ]);

      await Promise.race([
        ffmpeg.load({ coreURL, wasmURL, workerURL } as any),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout cargando FFmpeg core/wasm")),
            LOAD_TIMEOUT_MS
          )
        ),
      ]);

      setIsFFmpegLoaded(true);
      setFfmpegLoadError(null);
      return ffmpeg;
    } catch (e: any) {
      setIsFFmpegLoaded(false);
      const msg =
        e?.message ??
        "No se pudo cargar FFmpeg offline. Revisa consola y headers COEP/COOP.";
      setFfmpegLoadError(msg);
      throw e;
    }
  };

  const loadFFmpeg = async () => {
    try {
      await ensureFFmpegLoaded();
    } catch {
      // error already stored in state
    } finally {
      setExportStage("idle");
    }
  };

  const drawWaveFrameOffline = (
    ctx: CanvasRenderingContext2D,
    size: number,
    progress01: number,
    opts: { transparent: boolean }
  ) => {
    const monoSamples = monoSamplesRef.current;
    const totalSamples = totalSamplesRef.current;
    const duration = durationRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    if (!monoSamples || !totalSamples || !duration || !cosArr || !sinArr) return;

    const { radiusRatio, intensity, strokeWidth, waveColor, bgColor } = paramsRef.current;

    // Clear
    if (opts.transparent) {
      ctx.clearRect(0, 0, size, size);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, size, size);
    }

    const cx = size / 2;
    const cy = size / 2;
    const rMin = Math.min(cx, cy);
    const radiusBase = rMin * radiusRatio;
    const radiusAmp = radiusBase * intensity;

    const step = sampleStepRef.current;
    const headSampleIndex = Math.floor(clamp(progress01, 0, 1) * (totalSamples - 1));
    const headPointIndex = Math.floor(headSampleIndex / step);
    const head = clamp(headPointIndex, 0, pointCountRef.current - 1);

    // Smooth path with quadratic midpoints
    ctx.save();
    ctx.lineWidth = Math.max(1, strokeWidth);
    ctx.strokeStyle = waveColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let prevX = cx + (radiusBase + (monoSamples[0] ?? 0) * radiusAmp) * cosArr[0];
    let prevY = cy + (radiusBase + (monoSamples[0] ?? 0) * radiusAmp) * sinArr[0];

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);

    for (let i = 1; i <= head; i++) {
      const sampleIdx = clamp(i * step, 0, totalSamples - 1);
      const amp = monoSamples[sampleIdx] ?? 0;
      const r = radiusBase + amp * radiusAmp;
      const x = cx + r * cosArr[i];
      const y = cy + r * sinArr[i];
      const midX = (prevX + x) / 2;
      const midY = (prevY + y) / 2;
      ctx.quadraticCurveTo(prevX, prevY, midX, midY);
      prevX = x;
      prevY = y;
    }

    ctx.lineTo(prevX, prevY);
    ctx.stroke();

    // Tip
    const headAngle = progress01 * TWO_PI - Math.PI / 2;
    const tipAmp = monoSamples[headSampleIndex] ?? 0;
    const tipR = radiusBase + tipAmp * radiusAmp;
    const tipX = cx + tipR * Math.cos(headAngle);
    const tipY = cy + tipR * Math.sin(headAngle);

    ctx.fillStyle = waveColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(tipX, tipY, Math.max(2, strokeWidth * 0.9), 0, TWO_PI);
    ctx.fill();
    ctx.restore();
  };

  const buildPrecomputedGeometry = () => {
    const totalSamples = totalSamplesRef.current;
    if (!totalSamples || totalSamples < 2) return;

    const step = Math.max(1, Math.floor(totalSamples / fftLikePointsPerCircle));
    sampleStepRef.current = step;

    const pc = Math.max(1, Math.ceil(totalSamples / step));
    pointCountRef.current = pc;

    const cosArr = new Float32Array(pc);
    const sinArr = new Float32Array(pc);
    for (let i = 0; i < pc; i++) {
      const sampleIdx = i * step;
      const theta = (sampleIdx / totalSamples) * TWO_PI - Math.PI / 2; // 0 at top
      cosArr[i] = Math.cos(theta);
      sinArr[i] = Math.sin(theta);
    }
    precomputedCosRef.current = cosArr;
    precomputedSinRef.current = sinArr;
  };

  const decodeAudioToMono = async (file: File) => {
    setIsDecoding(true);
    setWaveformReady(false);
    setError(null);
    setRecordError(null);

    const decodeId = `${Date.now()}-${Math.random()}`;
    const lastIdRef = (decodeAudioToMono as any)._lastDecodeId;
    (decodeAudioToMono as any)._lastDecodeId = decodeId;
    void lastIdRef;

    try {
      const AudioContextCtor =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioContextCtor();

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      if ((decodeAudioToMono as any)._lastDecodeId !== decodeId) {
        try {
          await audioContext.close();
        } catch {
          // ignore
        }
        return;
      }

      const channels = audioBuffer.numberOfChannels;
      const length = audioBuffer.length;
      const mono = new Float32Array(length);

      if (channels === 1) {
        mono.set(audioBuffer.getChannelData(0));
      } else {
        for (let c = 0; c < channels; c++) {
          const ch = audioBuffer.getChannelData(c);
          for (let i = 0; i < length; i++) mono[i] += ch[i] / channels;
        }
      }

      monoSamplesRef.current = mono;
      totalSamplesRef.current = length;
      durationRef.current = audioBuffer.duration;

      buildPrecomputedGeometry();
      setWaveformReady(true);
      setIsDecoding(false);
      clearCanvasSolid();
    } catch (e: any) {
      setIsDecoding(false);
      setWaveformReady(false);
      setError(e?.message ?? "No se pudo decodificar el audio.");
    }
  };

  const resetDrawingState = () => {
    lastDrawnPointIndexRef.current = -1;
    lastCurvePointRef.current = null;
    lastTipRef.current = null;
    hasClearedRef.current = false;
  };

  const getPointXY = (pointIndex: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return { x: 0, y: 0 };
    const { radiusRatio, intensity } = paramsRef.current;

    const monoSamples = monoSamplesRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    const totalSamples = totalSamplesRef.current;
    if (!monoSamples || !cosArr || !sinArr || !totalSamples) return { x: 0, y: 0 };

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMin = Math.min(cx, cy);

    const step = sampleStepRef.current;
    const sampleIdx = clamp(pointIndex * step, 0, totalSamples - 1);
    const amp = monoSamples[sampleIdx] ?? 0; // [-1,1]

    const radiusBase = rMin * radiusRatio;
    const radiusAmp = radiusBase * intensity;
    const r = radiusBase + amp * radiusAmp;

    return {
      x: cx + r * cosArr[pointIndex],
      y: cy + r * sinArr[pointIndex],
    };
  };

  const drawAdditionalPath = (fromPoint: number, toPoint: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const monoSamples = monoSamplesRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    if (!ctx || !canvas || !monoSamples || !cosArr || !sinArr) return;
    if (toPoint <= fromPoint) return;

    const { strokeWidth, waveColor } = paramsRef.current;

    // Quadratic smoothing via midpoints. This is "smooth path" without
    // reallocating huge arrays per frame.
    ctx.save();
    ctx.lineWidth = Math.max(1, strokeWidth);
    ctx.strokeStyle = waveColor;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Seed starting point.
    let prev = lastCurvePointRef.current;
    if (!prev) {
      prev = getPointXY(fromPoint);
      lastCurvePointRef.current = prev;
    }

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);

    for (let i = fromPoint + 1; i <= toPoint; i++) {
      const p = getPointXY(i);
      const midX = (prev.x + p.x) / 2;
      const midY = (prev.y + p.y) / 2;
      // Smooth-ish segment; uses previous point as control point.
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      prev = p;
      lastCurvePointRef.current = prev;
    }

    // Ensure path reaches the last point exactly.
    ctx.lineTo(prev.x, prev.y);
    ctx.stroke();
    ctx.restore();
  };

  const drawTip = (progress01: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const audioEl = audioRef.current;
    if (!ctx || !canvas || !audioEl) return;

    const monoSamples = monoSamplesRef.current;
    const totalSamples = totalSamplesRef.current;
    const duration = durationRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    if (!monoSamples || !totalSamples || !duration || !cosArr || !sinArr) return;

    const { intensity, radiusRatio, waveColor, bgColor } = paramsRef.current;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMin = Math.min(cx, cy);

    const headAngle = progress01 * TWO_PI - Math.PI / 2;
    const sampleStep = sampleStepRef.current;
    const headSampleIndex = Math.floor(progress01 * (totalSamples - 1));
    const amp = monoSamples[headSampleIndex] ?? 0;

    const radiusBase = rMin * radiusRatio;
    const radiusAmp = radiusBase * intensity;
    const rTip = radiusBase + amp * radiusAmp;

    const x = cx + rTip * Math.cos(headAngle);
    const y = cy + rTip * Math.sin(headAngle);

    const tipRadius = Math.max(2, Math.min(10, (ctx.lineWidth || 4) * 0.9));

    // If we are not fading (no loop), erase previous tip to avoid ghosting.
    if (drawingModeRef.current !== "record") {
      // For preview, we know fade is driven by loop toggle.
      const shouldFade = isLoopingUI;
      if (!shouldFade && lastTipRef.current) {
        const prev = lastTipRef.current;
        ctx.save();
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(prev.x, prev.y, prev.r + 2, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      }
    }

    if (drawingModeRef.current === "record") {
      // For recorded (no loop), always erase previous tip.
      if (lastTipRef.current) {
        const prev = lastTipRef.current;
        ctx.save();
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.arc(prev.x, prev.y, prev.r + 2, 0, TWO_PI);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.fillStyle = waveColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y, tipRadius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    lastTipRef.current = { x, y, r: tipRadius };
  };

  const tick = () => {
    const audioEl = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const monoSamples = monoSamplesRef.current;
    if (!audioEl || !canvas || !ctx || !monoSamples) return;

    syncCanvasSize();

    const duration = durationRef.current;
    if (!duration) return;

    const currentTime = audioEl.currentTime || 0;
    const progress01 = clamp(currentTime / duration, 0, 1);

    const pointCount = pointCountRef.current;
    if (!pointCount) return;

    const step = sampleStepRef.current;
    const headSampleIndex = Math.floor(progress01 * (totalSamplesRef.current - 1));
    const headPointIndex = Math.floor(headSampleIndex / step);
    const head = clamp(headPointIndex, 0, pointCount - 1);

    // Determine if we should fade (loop mode).
    const shouldFade = audioEl.loop || (drawingModeRef.current !== "record" && isLoopingUI);
    if (!hasClearedRef.current) {
      clearCanvasSolid();
      resetDrawingState();
      hasClearedRef.current = true;
      // Start curve at 0 immediately.
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0);
    } else if (shouldFade) {
      // Slow fade to keep old trails but let them soften over loops.
      fadeCanvas(0.02);
    }

    // If we looped and progress wrapped back, reset drawing increment (do not clear).
    if (head < lastDrawnPointIndexRef.current && shouldFade) {
      lastDrawnPointIndexRef.current = -1;
      lastCurvePointRef.current = null;
      // Tip will be erased/redrawn anyway.
    }

    // Draw incremental path from last drawn to current head.
    const last = lastDrawnPointIndexRef.current;
    if (last < 0) {
      // Ensure starting point is seeded.
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0);
      if (head > 0) drawAdditionalPath(0, head);
    } else if (head > last) {
      drawAdditionalPath(last, head);
      lastDrawnPointIndexRef.current = head;
    }

    // Draw tip.
    drawTip(progress01);

    // Stop at the end for preview (non-loop) and record.
    if (!audioEl.loop && progress01 >= 1) {
      isAnimatingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (drawingModeRef.current === "record") {
        // In modo record, finalizamos/exportamos exactamente al 100%.
        finishRecordRef.current?.();
      } else {
        setIsPreviewing(false);
      }
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
  };

  const startAnimation = (mode: "preview" | "record") => {
    if (!monoSamplesRef.current) return;
    drawingModeRef.current = mode;
    isAnimatingRef.current = true;
    hasClearedRef.current = false;
    lastDrawnPointIndexRef.current = -1;
    lastCurvePointRef.current = null;
    lastTipRef.current = null;

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAnimationOnly = () => {
    isAnimatingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const prepareAndPlay = async (opts: { loop: boolean }) => {
    const audioEl = audioRef.current;
    if (!audioEl) throw new Error("Audio element no disponible");
    if (!audioUrl) throw new Error("No hay audio cargado");
    if (!waveformReady) throw new Error("Decodificación no lista");

    // Reset audio.
    audioEl.loop = opts.loop;
    audioEl.currentTime = 0;

    audioEl.src = audioUrl;
    audioEl.volume = 1;

    // Some browsers require resume after user gesture.
    // (We don't create an AudioContext here; analysis is pre-decoded.)
    await audioEl.play();

    return audioEl;
  };

  const handlePreview = async () => {
    setError(null);
    setRecordError(null);
    if (!audioUrl) {
      setError("Primero carga un archivo de audio.");
      return;
    }
    if (isRecording) return;
    if (!waveformReady) {
      setError(isDecoding ? "Decodificando audio..." : "Waveform no lista todavía.");
      return;
    }

    try {
      stopAnimationOnly();
      await stopAll(); // resets currentTime and stops any recorder
      const audioEl = audioRef.current;
      if (!audioEl) return;
      // startAnimation relies on currentTime progressing.
      await prepareAndPlay({ loop: isLoopingUI });
      ensureCanvasContext();
      clearCanvasSolid();
      resetDrawingState();
      setIsPreviewing(true);
      startAnimation("preview");

      audioEl.onended = () => {
        if (!audioEl.loop) {
          stopAnimationOnly();
          setIsPreviewing(false);
        }
      };
    } catch (e: any) {
      setIsPreviewing(false);
      setError(e?.message ?? "No se pudo iniciar la previsualización.");
    }
  };

  const downloadBlob = (blob: Blob, extension = "webm") => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audio-visualizer-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  const handleGenerateAndDownloadRealtime = async () => {
    setError(null);
    setRecordError(null);

    if (isExporting || isDecoding) return;
    if (!audioUrl) {
      setError("Primero carga un archivo de audio.");
      return;
    }
    if (!waveformReady || !monoSamplesRef.current) {
      setError(isDecoding ? "Decodificando audio..." : "Waveform no lista todavía.");
      return;
    }

    try {
      const canvas = canvasRef.current;
      const audioEl = audioRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !audioEl || !ctx) {
        throw new Error("Canvas o audio no disponible.");
      }

      setIsExporting(true);
      setIsPreviewing(false);
      // Asegura resolución mínima 1080x1080 para el video.
      setCanvasVideoSquare1080();
      ensureCanvasContext();
      clearCanvasSolid();
      resetDrawingState();

      stopAnimationOnly();

      // Evita que se solape el playback del preview.
      try {
        audioEl.pause();
      } catch {
        // ignore
      }

      // Capture stream del canvas (video) para RecordRTC.
      const captureStream = (canvas as any).captureStream as
        | ((fps: number) => MediaStream)
        | undefined;
      if (typeof captureStream !== "function") {
        throw new Error("captureStream() no está soportado en este navegador.");
      }

      const stream = captureStream.call(canvas, 30);
      const recorder = new RecordRTC(stream, {
        type: "video",
        mimeType: "video/webm;codecs=vp9",
        disableLogs: true,
      } as any);

      recorderRef.current = recorder;

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;

        stopAnimationOnly();

        const r = recorderRef.current;
        recorderRef.current = null;
        setIsExporting(false);

        if (!r) return;
        r.stopRecording(() => {
          try {
            const blob: Blob | undefined = r.getBlob?.();
            if (!blob) throw new Error("No se generó el video.");
            downloadBlob(blob, "webm");
          } catch (e: any) {
            setRecordError(e?.message ?? "No se pudo descargar la grabación.");
          }
        });
      };

      // Permite que el loop principal cierre/exporte cuando llegue al 100%.
      finishRecordRef.current = () => {
        finish();
      };

      recorder.startRecording();

      // Reproduce hasta el final (sin loop) y dibuja en el canvas.
      audioEl.loop = false;
      audioEl.currentTime = 0;
      audioEl.src = audioUrl;

      audioEl.onended = () => {
        finish();
      };

      await audioEl.play();
      startAnimation("record");
    } catch (e: any) {
      setIsExporting(false);
      setRecordError(e?.message ?? "No se pudo generar el video en tiempo real.");
      finishRecordRef.current = null;
      if (recorderRef.current) {
        try {
          recorderRef.current.stopRecording?.();
        } catch {
          // ignore
        }
        recorderRef.current = null;
      }
    }
  };

  const handleGenerateAndDownload = async () => {
    setError(null);
    setRecordError(null);
    if (isRecording || isExporting) return;
    if (!audioUrl) {
      setError("Primero carga un archivo de audio.");
      return;
    }
    if (!waveformReady) {
      setError(isDecoding ? "Decodificando audio..." : "Waveform no lista todavía.");
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);

      const ffmpeg = await ensureFFmpegLoaded();

      const fps = 30;
      const duration = durationRef.current;
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error("Duración inválida para exportación.");
      }

      const totalFrames = Math.max(1, Math.ceil(duration * fps));
      setExportStage("rendering-frames");

      const size = 1080;
      const { canvas: offCanvas, ctx: offCtx } = getOffscreenCanvas2D(size, size);
      if (!offCtx) throw new Error("No se pudo crear contexto 2D offline.");

      // Clean previous files (best-effort).
      try {
        // No directory ops; we just overwrite the same names.
      } catch {
        // ignore
      }

      for (let f = 0; f < totalFrames; f++) {
        const progress01 = totalFrames === 1 ? 1 : f / (totalFrames - 1);
        drawWaveFrameOffline(offCtx, size, progress01, { transparent: transparentBg });

        const png = await canvasToPngBytes(offCanvas);
        const name = `frame_${String(f).padStart(6, "0")}.png`;
        await ffmpeg.writeFile(name, png);

        if (f % 10 === 0 || f === totalFrames - 1) {
          setExportProgress((f + 1) / totalFrames);
        }
      }

      setExportStage("encoding");

      // Encode to MP4 (H.264). Alpha is not reliably supported in standard MP4/H.264;
      // we still attempt a best-effort encoding.
      await ffmpeg.exec([
        "-framerate",
        String(fps),
        "-i",
        "frame_%06d.png",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "out.mp4",
      ]);

      const data = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      downloadBlob(new Blob([data.buffer], { type: "video/mp4" }), "mp4");

      // Cleanup frame files + output (best-effort)
      try {
        await ffmpeg.deleteFile("out.mp4");
      } catch {
        // ignore
      }
      // Deleting all frames individually is expensive; leave them in FS for now.

      setExportStage("done");
    } catch (e: any) {
      setRecordError(e?.message ?? "No se pudo exportar el video offline.");
    }
    setIsExporting(false);
    setExportStage("idle");
  };

  const onPickFile = async (file: File | null) => {
    setError(null);
    setRecordError(null);

    stopAnimationOnly();
    setIsPreviewing(false);

    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }

    monoSamplesRef.current = null;
    totalSamplesRef.current = 0;
    durationRef.current = 0;
    precomputedCosRef.current = null;
    precomputedSinRef.current = null;
    sampleStepRef.current = 1;
    pointCountRef.current = 0;
    setWaveformReady(false);
    setIsDecoding(false);

    setFileName("");
    setFileSize(0);
    setAudioUrl(null);

    if (!file) return;

    const url = URL.createObjectURL(file);
    audioObjectUrlRef.current = url;
    setAudioUrl(url);
    setFileName(file.name);
    setFileSize(file.size);

    await decodeAudioToMono(file);
  };

  useEffect(() => {
    ensureCanvasContext();
    // Preload FFmpeg once to avoid "ffmpeg is not loaded" at export time.
    //void loadFFmpeg();
    return () => {
      stopAnimationOnly();
      if (recorderRef.current) {
        try {
          recorderRef.current.stopRecording?.();
        } catch {
          // ignore
        }
      }
      if (audioObjectUrlRef.current) {
        URL.revokeObjectURL(audioObjectUrlRef.current);
        audioObjectUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fileMeta = useMemo(() => {
    if (!fileName) return null;
    return `${fileName}${fileSize ? ` (${formatBytes(fileSize)})` : ""}`;
  }, [fileName, fileSize]);

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="w-full md:w-72">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Configuración</div>
              <div className="text-xs text-slate-300">
                Ajusta parámetros y mira el preview en vivo.
              </div>
            </div>

            <label className="block">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>Radio del círculo</span>
                <span className="tabular-nums">{radiusRatio.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.25}
                max={0.6}
                step={0.01}
                value={radiusRatio}
                onChange={(e) => setRadiusRatio(parseFloat(e.target.value))}
                disabled={isDecoding || isRecording}
                className="mt-1 w-full"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>Intensidad de onda</span>
                <span className="tabular-nums">{intensity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.01}
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                disabled={isDecoding || isRecording}
                className="mt-1 w-full"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                <span>Grosor del trazo</span>
                <span className="tabular-nums">{strokeWidth.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(parseFloat(e.target.value))}
                disabled={isDecoding || isRecording}
                className="mt-1 w-full"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="text-xs text-slate-300">Color de la onda</div>
                <input
                  type="color"
                  value={waveColor}
                  onChange={(e) => setWaveColor(e.target.value)}
                  disabled={isDecoding || isRecording}
                  className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-800 bg-slate-950/30"
                />
              </label>
              <label className="block">
                <div className="text-xs text-slate-300">Color de fondo</div>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  disabled={isDecoding || isRecording}
                  className="mt-1 h-9 w-full cursor-pointer rounded border border-slate-800 bg-slate-950/30"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isLoopingUI}
                onChange={(e) => {
                  const v = e.target.checked;
                  setIsLoopingUI(v);
                  if (audioRef.current) audioRef.current.loop = v;
                }}
                disabled={isRecording}
              />
              Loop (para la animación de preview)
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                disabled={isExporting || isRecording}
              />
              Fondo transparente (export offline)
            </label>

            <div className="flex flex-col gap-2">
              <label className="block">
                <div className="text-xs font-medium text-slate-300">Cargar audio</div>
                <input
                  type="file"
                  accept="audio/*"
                  disabled={isDecoding || isRecording || isPreviewing}
                  className="mt-1 block w-full rounded-lg border border-slate-800 bg-slate-950/40 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-500/20 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-200 hover:file:bg-indigo-500/30"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {fileMeta ? (
                <div className="text-xs text-slate-400">{fileMeta}</div>
              ) : (
                <div className="text-xs text-slate-400">
                  Sube un archivo para empezar.
                </div>
              )}
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}
            {recordError ? (
              <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-3 text-sm text-rose-200">
                {recordError}
              </div>
            ) : null}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handlePreview}
                disabled={
                  isDecoding ||
                  isRecording ||
                  isPreviewing ||
                  !audioUrl ||
                  !waveformReady
                }
                className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previsualizar
              </button>
              <button
                type="button"
                onClick={handleGenerateAndDownload}
                disabled={
                  isDecoding ||
                  isRecording ||
                  isExporting ||
                  !isFFmpegLoaded ||
                  !audioUrl ||
                  !waveformReady
                }
                className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generar y Descargar (Offline MP4)
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateAndDownloadRealtime()}
                disabled={
                  isDecoding ||
                  isRecording ||
                  isExporting ||
                  !audioUrl ||
                  !waveformReady
                }
                className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Generar y Descargar (Tiempo Real)
              </button>
              <button
                type="button"
                onClick={() => void stopAll()}
                disabled={(!isRecording && !isPreviewing) || isDecoding}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop
              </button>
              <div className="text-xs text-slate-400">
                Video cuadrado &gt;= 1080x1080. (Captura del canvas.)
              </div>

              {isExporting ? (
                <div className="space-y-1 pt-1">
                  <div className="text-xs text-slate-300">
                    {exportStage === "loading-ffmpeg"
                      ? "Cargando encoder (FFmpeg)..."
                      : exportStage === "rendering-frames"
                        ? "Renderizando frames..."
                        : exportStage === "encoding"
                          ? "Codificando MP4..."
                          : "Exportando..."}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded bg-slate-800">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.round(exportProgress * 100)}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {Math.round(exportProgress * 100)}%
                  </div>
                </div>
              ) : null}

              {!isFFmpegLoaded ? (
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>Cargando FFmpeg…</span>
                  <button
                    type="button"
                    onClick={() => void loadFFmpeg()}
                    disabled={isExporting}
                    className="rounded-md border border-slate-700 bg-slate-900/40 px-2 py-1 text-[11px] text-slate-200 disabled:opacity-50"
                  >
                    Reintentar
                  </button>
                </div>
              ) : null}
              {ffmpegLoadError ? (
                <div className="rounded-lg border border-rose-900/40 bg-rose-950/40 p-3 text-sm text-rose-200">
                  {ffmpegLoadError}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Waveform circular progresivo
            </div>
            <div className="text-xs text-slate-400">
              Reproduce el audio y el trazo avanza en 360 grados según el
              progreso temporal.
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <canvas ref={canvasRef} className="aspect-square w-full" />
            <audio ref={audioRef} className="hidden" />
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Consejo: para generar video social, sube un mp3/wav y usa{" "}
            <span className="font-medium text-slate-200">Generar y Descargar Video</span>.
          </div>
        </div>
      </div>
    </section>
  );
}

