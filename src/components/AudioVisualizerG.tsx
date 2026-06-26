import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import RecordRTC from "recordrtc";

function CollapsibleSection({
  title,
  icon,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  icon?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const sectionId = title.toLowerCase().replace(/[\s/]+/g, "-");
  const labelId = `${sectionId}-label`;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
        className="flex w-full items-center gap-1.5 py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 rounded-sm"
      >
        {icon}
        <span id={labelId} className="text-xs font-semibold tracking-wider text-slate-400 uppercase flex-1">
          {title}
        </span>
        <svg
          aria-hidden="true"
          className={`h-2.5 w-2.5 text-slate-500 transition-transform duration-200 ${
            collapsed ? "" : "rotate-90"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <div
        id={sectionId}
        role="region"
        aria-labelledby={labelId}
        className={`overflow-hidden transition-all duration-250 ease-in-out ${
          collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        }`}
      >
        <div className="pt-0.5">{children}</div>
      </div>
    </div>
  );
}

function FileDropZone({
  onDrop,
  children,
}: {
  onDrop: (file: File) => void;
  children: ReactNode;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onDrop(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative rounded-lg transition-all duration-200 ${
        isDragOver
          ? "border-2 border-dashed border-indigo-400/60 bg-indigo-500/10"
          : ""
      }`}
    >
      {children}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-950/70 text-xs font-medium text-indigo-300 z-10 pointer-events-none">
          Suelta el archivo aquí
        </div>
      )}
    </div>
  );
}

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

  const fractalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fractalCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const fractalPreviewRef = useRef<HTMLCanvasElement | null>(null);

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

  // Precomputed spiral geometry
  const spiralAnglesRef = useRef<Float32Array | null>(null);
  const spiralRadiiRef = useRef<Float32Array | null>(null);

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

  const [isExporting, setIsExporting] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((message: string, type: "success" | "info" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Reset all visual parameters to defaults
  const resetDefaults = useCallback(() => {
    setRadiusRatio(0.46);
    setIntensity(0.28);
    setStrokeWidth(4.5);
    setWaveColor("#6366f1");
    setBgColor("#020617");
    setGlowIntensity(0.4);
    setShowParticles(false);
    setParticleColor("#a78bfa");
    setParticleOpacity(0.7);
    setWaveGradientMode("solid");
    setGradColor1("#6366f1");
    setGradColor2("#a855f7");
    setVolume(0.7);
    setSongTitle("");
    setTitleColor("#ffffff");
    setTitlePreset("bottom-center");
    setBgMode("color");
    setActiveBgPreset("dark");
    setFractalEnabled(false);
    setFractalType("ripple");
    setFractalLayerMode("overlay");
    setFractalOpacity(0.8);
    setFractalAudioReactive(true);
    setRippleRingCount(8);
    setRippleSpeed(1);
    setRippleAmplitude(20);
    setRippleThickness(1.5);
    setRippleColor1("#6366f1");
    setRippleColor2("#a855f7");
    setSpiralDensity(200);
    setSpiralRotationSpeed(0.8);
    setSpiralTightness(0.5);
    setSpiralDotSize(2);
    setSpiralColor1("#6366f1");
    setSpiralColor2("#06b6d4");
    setMandalaSegments(8);
    setMandalaRotationSpeed(0.6);
    setMandalaComplexity(3);
    setMandalaLineWidth(1.5);
    setMandalaColor1("#a78bfa");
    setMandalaColor2("#f472b6");
    setBgImage(null);
    bgImageRef.current = null;
    setBgImagePreset("custom");
    setActivePreset(null);
    showToast("Valores restablecidos");
  }, [showToast]);

  // Background mode: color | image | fractal (mutually exclusive)
  const [bgMode, setBgMode] = useState<"color" | "image" | "fractal">("color");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [presetSavedKeys, setPresetSavedKeys] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("quickPreset_saved");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });

  // Collapsible sections (Fondo and Partículas start collapsed)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    () => new Set(["bg", "particles"])
  );
  const toggleSection = useCallback((name: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Song title overlay
  const [volume, setVolume] = useState(0.7);
  const [songTitle, setSongTitle] = useState("");
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [titlePreset, setTitlePreset] = useState("bottom-center");

  const TITLE_PRESETS = [
    { id: "bottom-center", label: "Inferior centro", font: "Arial, sans-serif", weight: "bold", size: 0.035, align: "center", valign: "bottom", y: 0.93 },
    { id: "bottom-left", label: "Inferior izquierda", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "left", valign: "bottom", y: 0.93, x: 0.04 },
    { id: "bottom-right", label: "Inferior derecha", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "right", valign: "bottom", y: 0.93, x: 0.96 },
    { id: "center-big", label: "Centro grande", font: "Georgia, serif", weight: "bold", size: 0.07, align: "center", valign: "middle", y: 0.5 },
    { id: "center-medium", label: "Centro medio", font: "Arial, sans-serif", weight: "bold", size: 0.045, align: "center", valign: "middle", y: 0.5 },
    { id: "top-center", label: "Superior centro", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "center", valign: "top", y: 0.06 },
    { id: "top-left", label: "Superior izquierda", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "left", valign: "top", y: 0.06, x: 0.04 },
    { id: "top-right", label: "Superior derecha", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "right", valign: "top", y: 0.06, x: 0.96 },
    { id: "center-elegant", label: "Centro elegante", font: "Georgia, serif", weight: "normal", size: 0.05, align: "center", valign: "middle", y: 0.5 },
    { id: "compact", label: "Compacto", font: "'Courier New', monospace", weight: "bold", size: 0.02, align: "center", valign: "bottom", y: 0.95 },
  ];

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

  // --- RESOLUTION ---
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4K">("1080p");
  const resMap: Record<string, number> = { "720p": 720, "1080p": 1080, "4K": 2160 };
  const bitrateMap: Record<string, number> = { "720p": 8_000_000, "1080p": 20_000_000, "4K": 50_000_000 };

  // --- VISUAL EFFECTS ---
  const [glowIntensity, setGlowIntensity] = useState(0.4);
  const [showParticles, setShowParticles] = useState(false);
  const [particleColor, setParticleColor] = useState("#a78bfa");
  const [particleOpacity, setParticleOpacity] = useState(0.7);
  const [waveGradientMode, setWaveGradientMode] = useState<"solid" | "gradient" | "rainbow">("solid");
  const [gradColor1, setGradColor1] = useState("#6366f1");
  const [gradColor2, setGradColor2] = useState("#a855f7");

  // --- BACKGROUND PRESETS ---
  const [activeBgPreset, setActiveBgPreset] = useState<string | null>(null);
  const bgPresets = [
    { id: "dark", label: "Oscuro", color: "#020617" },
    { id: "purple", label: "Púrpura", color: "#1e1b4b" },
    { id: "cyan", label: "Cian", color: "#164e63" },
    { id: "emerald", label: "Esmeralda", color: "#064e3b" },
    { id: "warm", label: "Cálido", color: "#451a03" },
  ];

  // --- FRACTAL ---
  const [fractalEnabled, setFractalEnabled] = useState(false);
  const [fractalType, setFractalType] = useState<"ripple" | "spiral" | "mandala">("ripple");
  const [fractalLayerMode, setFractalLayerMode] = useState<"replace" | "overlay">("overlay");
  const [fractalOpacity, setFractalOpacity] = useState(0.8);
  const [fractalAudioReactive, setFractalAudioReactive] = useState(true);

  const [rippleRingCount, setRippleRingCount] = useState(8);
  const [rippleSpeed, setRippleSpeed] = useState(1);
  const [rippleAmplitude, setRippleAmplitude] = useState(20);
  const [rippleThickness, setRippleThickness] = useState(1.5);
  const [rippleColor1, setRippleColor1] = useState("#6366f1");
  const [rippleColor2, setRippleColor2] = useState("#a855f7");

  const [spiralDensity, setSpiralDensity] = useState(200);
  const [spiralRotationSpeed, setSpiralRotationSpeed] = useState(0.8);
  const [spiralTightness, setSpiralTightness] = useState(0.5);
  const [spiralDotSize, setSpiralDotSize] = useState(2);
  const [spiralColor1, setSpiralColor1] = useState("#6366f1");
  const [spiralColor2, setSpiralColor2] = useState("#06b6d4");

  const [mandalaSegments, setMandalaSegments] = useState(8);
  const [mandalaRotationSpeed, setMandalaRotationSpeed] = useState(0.6);
  const [mandalaComplexity, setMandalaComplexity] = useState(3);
  const [mandalaLineWidth, setMandalaLineWidth] = useState(1.5);
  const [mandalaColor1, setMandalaColor1] = useState("#a78bfa");
  const [mandalaColor2, setMandalaColor2] = useState("#f472b6");

  // --- WAVEFORM PREVIEW ---
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // --- TELEMETRÍA DE IMAGEN DE FONDO ---
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  const BG_IMAGE_PRESETS = [
    { id: "1", label: "Muestra 1", src: "/fondo_muestra_1.png" },
    { id: "2", label: "Muestra 2", src: "/fondo_muestra_2.png" },
    { id: "3", label: "Muestra 3", src: "/fondo_muestra_3.png" },
    { id: "4", label: "Muestra 4", src: "/fondo_muestra_4.jpg" },
    { id: "5", label: "Muestra 5", src: "/fondo_muestra_5.png" },
  ];

  const [bgImagePreset, setBgImagePreset] = useState<string>("custom");

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
    songTitle,
    titleColor,
    titlePreset,
    glowIntensity,
    particleOpacity,
    waveGradientMode,
    gradColor1,
    gradColor2,
    fractalEnabled,
    fractalType,
    fractalLayerMode,
    fractalOpacity,
    fractalAudioReactive,
    rippleRingCount,
    rippleSpeed,
    rippleAmplitude,
    rippleThickness,
    rippleColor1,
    rippleColor2,
    spiralDensity,
    spiralRotationSpeed,
    spiralTightness,
    spiralDotSize,
    spiralColor1,
    spiralColor2,
    mandalaSegments,
    mandalaRotationSpeed,
    mandalaComplexity,
    mandalaLineWidth,
    mandalaColor1,
    mandalaColor2,
  });

  useEffect(() => {
    paramsRef.current = {
      radiusRatio, intensity, strokeWidth, waveColor, bgColor,
      songTitle, titleColor, titlePreset, glowIntensity, particleOpacity, waveGradientMode, gradColor1, gradColor2,
      fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
      rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
      spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
      mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
    };
    bgImageRef.current = bgImage;
    redrawBackgroundCanvas();
  }, [
    radiusRatio, intensity, strokeWidth, waveColor, bgColor, bgImage,
    songTitle, titleColor, titlePreset, glowIntensity, particleOpacity, waveGradientMode, gradColor1, gradColor2,
    fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
    rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
    spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
    mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
  ]);

  // Apply bg preset
  const applyBgPreset = useCallback((id: string) => {
    const preset = bgPresets.find(p => p.id === id);
    if (!preset) return;
    setBgMode("color");
    setFractalEnabled(false);
    setActiveBgPreset(id);
    setBgImage(null);
    bgImageRef.current = null;
    setBgColor(preset.color);
  }, []);

  const handleBgModeChange = useCallback((mode: "color" | "image" | "fractal") => {
    setBgMode(mode);
    if (mode === "color") {
      setFractalEnabled(false);
      setBgImage(null);
      bgImageRef.current = null;
      setBgImagePreset("custom");
    } else if (mode === "image") {
      setFractalEnabled(false);
    } else {
      setFractalEnabled(true);
    }
  }, []);

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
    isAnimatingRef.current = false;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const audioEl = audioRef.current;
    if (audioEl) {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch {
        // ignore
      }
    }

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
    if (ctxRef.current) ctxRef.current.imageSmoothingEnabled = false;
    const fc = fractalCanvasRef.current;
    if (fc && !fractalCtxRef.current) fractalCtxRef.current = fc.getContext("2d");
    if (fractalCtxRef.current) fractalCtxRef.current.imageSmoothingEnabled = false;
    return ctxRef.current;
  };

  const clearCanvasSolid = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasClearedRef.current = true;
  };

  const fadeCanvas = (alpha: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const syncCanvasSize = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (drawingModeRef.current === "record") return;

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

  const syncFractalCanvasSize = (w?: number, h?: number) => {
    const fc = fractalCanvasRef.current;
    const fctx = fractalCtxRef.current;
    if (!fc || !fctx) return;
    if (drawingModeRef.current === "record") return;
    if (w === undefined || h === undefined) {
      const dpr = window.devicePixelRatio || 1;
      const rect = fc.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width * dpr));
      h = Math.max(1, Math.floor(rect.height * dpr));
    }
    if (fc.width !== w || fc.height !== h) {
      fc.width = w;
      fc.height = h;
    }
  };

  const setCanvasVideoSize = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const size = Math.floor(resMap[resolution] || 1080);
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const fc = fractalCanvasRef.current;
    if (fc && (fc.width !== size || fc.height !== size)) {
      fc.width = size;
      fc.height = size;
    }
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
      const theta = (sampleIdx / totalSamples) * TWO_PI - Math.PI / 2;
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
      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
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
    const amp = monoSamples[sampleIdx] ?? 0;

    const radiusBase = rMin * radiusRatio;
    const radiusAmp = radiusBase * intensity;
    const r = radiusBase + amp * radiusAmp;

    return {
      x: cx + r * cosArr[pointIndex],
      y: cy + r * sinArr[pointIndex],
    };
  };

  const drawTip = (progress01: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const audioEl = audioRef.current;
    if (!ctx || !canvas || !audioEl) return;

    const monoSamples = monoSamplesRef.current;
    const totalSamples = totalSamplesRef.current;
    const duration = durationRef.current;
    if (!monoSamples || !totalSamples || !duration) return;

    const { intensity, radiusRatio, waveColor } = paramsRef.current;
    const img = bgImageRef.current;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rMin = Math.min(cx, cy);

    const headAngle = progress01 * TWO_PI - Math.PI / 2;
    const headSampleIndex = Math.floor(progress01 * (totalSamples - 1));
    const amp = monoSamples[headSampleIndex] ?? 0;

    const radiusBase = rMin * radiusRatio;
    const radiusAmp = radiusBase * intensity;
    const rTip = radiusBase + amp * radiusAmp;

    const x = cx + rTip * Math.cos(headAngle);
    const y = cy + rTip * Math.sin(headAngle);

    const tipRadius = Math.max(2, Math.min(10, (ctx.lineWidth || 4) * 0.9));

    // Limpiar el cursor anterior solo si partículas está activo
    if (lastTipRef.current && showParticles) {
      const prev = lastTipRef.current;
      const r = prev.r + 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(prev.x, prev.y, r, 0, TWO_PI);
      ctx.clip();
      ctx.clearRect(prev.x - r, prev.y - r, r * 2, r * 2);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = waveColor;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(x, y, tipRadius, 0, TWO_PI);
    ctx.fill();
    ctx.restore();

    if (showParticles && (drawingModeRef.current === "preview" || drawingModeRef.current === "record")) {
      emitParticles(x, y, 2);
    }

    lastTipRef.current = { x, y, r: tipRadius };
  };

  const drawTitle = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { songTitle, titleColor, titlePreset } = paramsRef.current;
    if (!songTitle) return;
    const preset = TITLE_PRESETS.find(p => p.id === titlePreset) || TITLE_PRESETS[0];
    ctx.save();
    ctx.fillStyle = titleColor;
    ctx.font = `${preset.weight} ${Math.floor(canvas.width * preset.size)}px ${preset.font}`;
    ctx.textAlign = preset.align as CanvasTextAlign;
    ctx.textBaseline = preset.valign as CanvasTextBaseline;
    const x = preset.x !== undefined ? canvas.width * preset.x : canvas.width / 2;
    ctx.fillText(songTitle, x, canvas.height * preset.y);
    ctx.restore();
  };

  // --- PARTICLES ---
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number };
  const particlesRef = useRef<Particle[]>([]);

  const emitParticles = (x: number, y: number, count: number) => {
    const particles = particlesRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TWO_PI;
      const speed = 0.5 + Math.random() * 2.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 3,
      });
    }
    if (particles.length > 300) particles.splice(0, particles.length - 300);
  };

  const updateAndDrawParticles = (ctx: CanvasRenderingContext2D) => {
    const dt = 1 / 60;
    const particles = particlesRef.current;
    const opacity = paramsRef.current.particleOpacity ?? 0.7;
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life * opacity;
      ctx.fillStyle = particleColor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  };

  // --- ENHANCED DRAW WITH GLOW & GRADIENT ---
  const drawAdditionalPath = (fromPoint: number, toPoint: number) => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    const monoSamples = monoSamplesRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    if (!ctx || !canvas || !monoSamples || !cosArr || !sinArr) return;
    if (toPoint <= fromPoint) return;

    const { strokeWidth, waveColor, glowIntensity, waveGradientMode, gradColor1, gradColor2 } = paramsRef.current;

    // Build point array for this segment
    const points: Point[] = [];
    let prev = lastCurvePointRef.current;
    if (!prev) {
      prev = getPointXY(fromPoint);
      lastCurvePointRef.current = prev;
    }
    points.push(prev);
    for (let i = fromPoint + 1; i <= toPoint; i++) {
      const p = getPointXY(i);
      const midX = (prev.x + p.x) / 2;
      const midY = (prev.y + p.y) / 2;
      points.push({ x: midX, y: midY });
      points.push(p);
      prev = p;
      lastCurvePointRef.current = prev;
    }

    // Glow pass (behind)
    if (glowIntensity > 0.01) {
      ctx.save();
      ctx.shadowBlur = 25 * glowIntensity;
      ctx.shadowColor = waveColor;
      ctx.lineWidth = Math.max(1, (strokeWidth + 2) * glowIntensity);
      ctx.strokeStyle = waveColor;
      ctx.globalAlpha = 0.25 * glowIntensity;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // Main stroke
    ctx.save();
    ctx.lineWidth = Math.max(1, strokeWidth);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (waveGradientMode === "gradient") {
      const grad = ctx.createLinearGradient(
        canvas.width * 0.2, canvas.height * 0.2,
        canvas.width * 0.8, canvas.height * 0.8
      );
      grad.addColorStop(0, gradColor1);
      grad.addColorStop(1, gradColor2);
      ctx.strokeStyle = grad;
    } else if (waveGradientMode === "rainbow") {
      const grad = ctx.createConicGradient(0, canvas.width / 2, canvas.height / 2);
      for (let h = 0; h <= 360; h += 30) {
        grad.addColorStop(h / 360, `hsl(${h}, 80%, 60%)`);
      }
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = waveColor;
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.restore();
  };

  // --- STATIC WAVEFORM PREVIEW ---
  const drawStaticWaveform = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = previewCtxRef.current;
    if (!ctx) {
      previewCtxRef.current = canvas.getContext("2d");
      if (!previewCtxRef.current) return;
    }
    const c = previewCtxRef.current;
    const monoSamples = monoSamplesRef.current;
    const cosArr = precomputedCosRef.current;
    const sinArr = precomputedSinRef.current;
    if (!monoSamples || !cosArr || !sinArr) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, rMin = Math.min(cx, cy);
    const step = sampleStepRef.current;
    const totalSamples = totalSamplesRef.current;
    if (!totalSamples) return;
    const radiusBase = rMin * 0.4;
    const radiusAmp = radiusBase * 0.3;
    const pc = pointCountRef.current;
    c.save();
    c.strokeStyle = "#6366f1";
    c.lineWidth = 1.5;
    c.globalAlpha = 0.6;
    c.beginPath();
    for (let i = 0; i < pc; i++) {
      const sampleIdx = Math.min(i * step, totalSamples - 1);
      const amp = monoSamples[sampleIdx] ?? 0;
      const r = radiusBase + amp * radiusAmp;
      const x = cx + r * cosArr[i];
      const y = cy + r * sinArr[i];
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.stroke();
    c.restore();
  };

  useEffect(() => {
    if (waveformReady && previewCanvasRef.current) {
      drawStaticWaveform();
    }
  }, [waveformReady, radiusRatio, intensity, waveColor]);

  // --- FRACTAL BACKGROUND ---
  const GOLDEN_ANGLE = 2.399963229728653;

  const getCurrentAmplitude = () => {
    const monoSamples = monoSamplesRef.current;
    const audioEl = audioRef.current;
    const totalSamples = totalSamplesRef.current;
    const duration = durationRef.current;
    if (!monoSamples || !audioEl || !totalSamples || !duration) return 0;
    const progress = clamp((audioEl.currentTime || 0) / duration, 0, 1);
    const centerIdx = Math.floor(progress * (totalSamples - 1));
    const halfWin = 256;
    const start = Math.max(0, centerIdx - halfWin);
    const end = Math.min(totalSamples - 1, centerIdx + halfWin);
    let sum = 0;
    for (let i = start; i <= end; i++) sum += Math.abs(monoSamples[i]);
    return sum / (end - start + 1);
  };

  const drawRippleFractal = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amp: number) => {
    const p = paramsRef.current;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.95;
    const now = performance.now() / 1000;

    const count = p.rippleRingCount;
    const speed = p.rippleSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.5) : 1);
    const amplitude = p.rippleAmplitude * (p.fractalAudioReactive ? (0.3 + amp * 0.7) : 1);
    const thickness = p.rippleThickness;

    ctx.save();
    ctx.lineCap = "round";

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const baseR = maxR * (0.05 + t * 0.95);
      const phase = now * speed * (0.8 + t * 0.4) + i * 1.5;
      const waveFreq = 4 + i * 1.8;

      ctx.lineWidth = thickness * (0.5 + t * 0.5);
      ctx.strokeStyle = hexToRgba(
        i % 2 === 0 ? p.rippleColor1 : p.rippleColor2,
        0.25 + t * 0.75
      );

      const steps = Math.max(48, Math.floor(baseR * 0.12));
      ctx.beginPath();
      for (let j = 0; j <= steps; j++) {
        const theta = (j / steps) * TWO_PI;
        const r = baseR + Math.sin(theta * waveFreq + phase) * amplitude;
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawSpiralFractal = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amp: number) => {
    const p = paramsRef.current;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.95;

    const density = p.spiralDensity;
    const now = performance.now() / 1000;

    const rotationSpeed = p.spiralRotationSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.375) : 1);
    const scale = p.spiralTightness * maxR * 0.06 * (p.fractalAudioReactive ? (0.6 + amp * 0.8) : 1);
    const dotSize = p.spiralDotSize * (p.fractalAudioReactive ? (0.5 + amp * 0.8) : 1);
    const rotationOffset = now * rotationSpeed;

    ctx.save();

    for (let i = 0; i < density; i++) {
      const angle = i * GOLDEN_ANGLE + rotationOffset;
      const r = Math.sqrt(i) * scale;
      if (r > maxR) break;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);

      const t = i / density;
      ctx.fillStyle = hexToRgba(
        t < 0.5 ? p.spiralColor1 : p.spiralColor2,
        0.2 + t * 0.8
      );
      const s = Math.max(0.5, dotSize * (0.2 + t * 0.8));
      ctx.beginPath();
      ctx.arc(x, y, s, 0, TWO_PI);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawMandalaFractal = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, amp: number) => {
    const p = paramsRef.current;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.9;

    const segments = p.mandalaSegments;
    const complexity = p.mandalaComplexity;
    const now = performance.now() / 1000;

    const rotationSpeed = p.mandalaRotationSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.375) : 1);
    const lineWidth = p.mandalaLineWidth;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(now * rotationSpeed);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const segAngle = TWO_PI / segments;

    for (let s = 0; s < segments; s++) {
      ctx.save();
      ctx.rotate(s * segAngle);

      for (let c = 0; c < complexity; c++) {
        const t = (c + 1) / complexity;
        const r = maxR * t;
        const halfArc = (segAngle * 0.4) * (0.5 + Math.sin(now * 0.5 + c * 1.2) * 0.3);

        ctx.lineWidth = lineWidth * (1 - t * 0.5);
        ctx.strokeStyle = hexToRgba(
          c % 2 === 0 ? p.mandalaColor1 : p.mandalaColor2,
          0.2 + t * 0.8
        );

        ctx.beginPath();
        ctx.arc(0, 0, r, -halfArc, halfArc);
        ctx.stroke();

        if (c > 0) {
          const innerR = r * 0.55;
          ctx.strokeStyle = hexToRgba(
            c % 2 === 0 ? p.mandalaColor2 : p.mandalaColor1,
            0.15 + t * 0.35
          );
          ctx.lineWidth = lineWidth * 0.5;
          ctx.beginPath();
          ctx.arc(0, 0, innerR, -halfArc * 1.5, halfArc * 1.5);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
    ctx.restore();
  };

  const drawFractalBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const p = paramsRef.current;
    if (!p.fractalEnabled) return;

    const amp = p.fractalAudioReactive ? getCurrentAmplitude() : 0;
    switch (p.fractalType) {
      case "ripple": drawRippleFractal(ctx, canvas, amp); break;
      case "spiral": drawSpiralFractal(ctx, canvas, amp); break;
      case "mandala": drawMandalaFractal(ctx, canvas, amp); break;
    }
  };

  const drawFractalPreview = useCallback(() => {
    const canvas = fractalPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const maxR = Math.min(cx, cy) * 0.9;

    ctx.clearRect(0, 0, w, h);

    if (fractalType === "ripple") {
      const count = rippleRingCount;
      const thick = rippleThickness;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const r = maxR * (0.1 + t * 0.9);
        ctx.lineWidth = Math.max(0.5, thick * (0.5 + t * 0.5) * (w / 200));
        ctx.strokeStyle = hexToRgba(i % 2 === 0 ? rippleColor1 : rippleColor2, 0.3 + t * 0.7);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TWO_PI);
        ctx.stroke();
      }
    } else if (fractalType === "spiral") {
      const density = spiralDensity;
      const scale = spiralTightness * maxR * 0.06;
      const dotSize = spiralDotSize;
      for (let i = 0; i < density; i++) {
        const angle = i * GOLDEN_ANGLE;
        const r = Math.sqrt(i) * scale;
        if (r > maxR) break;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const t = i / density;
        ctx.fillStyle = hexToRgba(t < 0.5 ? spiralColor1 : spiralColor2, 0.2 + t * 0.8);
        const s = Math.max(0.5, dotSize * (0.2 + t * 0.8)) * (w / 200);
        ctx.beginPath();
        ctx.arc(x, y, s, 0, TWO_PI);
        ctx.fill();
      }
    } else if (fractalType === "mandala") {
      const segments = mandalaSegments;
      const complexity = mandalaComplexity;
      const lineWidth = mandalaLineWidth;
      const segAngle = TWO_PI / segments;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let s = 0; s < segments; s++) {
        ctx.save();
        ctx.rotate(s * segAngle);
        for (let c = 0; c < complexity; c++) {
          const t = (c + 1) / complexity;
          const r = maxR * t;
          const halfArc = segAngle * 0.4 * 0.5;
          ctx.lineWidth = Math.max(0.5, lineWidth * (1 - t * 0.5)) * (w / 200);
          ctx.strokeStyle = hexToRgba(c % 2 === 0 ? mandalaColor1 : mandalaColor2, 0.2 + t * 0.8);
          ctx.beginPath();
          ctx.arc(0, 0, r, -halfArc, halfArc);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
  }, [fractalType, rippleRingCount, rippleThickness, rippleColor1, rippleColor2, spiralDensity, spiralTightness, spiralDotSize, spiralColor1, spiralColor2, mandalaSegments, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2]);

  useEffect(() => { drawFractalPreview(); }, [drawFractalPreview]);

  const redrawBackgroundCanvas = () => {
    const fc = fractalCanvasRef.current;
    const fctx = fractalCtxRef.current;
    if (!fc || !fctx) return;
    if (drawingModeRef.current !== "idle") return;

    syncFractalCanvasSize();
    fctx.clearRect(0, 0, fc.width, fc.height);

    const p = paramsRef.current;
    const img = bgImageRef.current;

    if (p.fractalEnabled && p.fractalLayerMode === "replace") {
      drawFractalBackground(fctx, fc);
    } else {
      if (img) {
        const scale = Math.max(fc.width / img.width, fc.height / img.height);
        const x = (fc.width - img.width * scale) / 2;
        const y = (fc.height - img.height * scale) / 2;
        fctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      } else {
        fctx.fillStyle = p.bgColor;
        fctx.fillRect(0, 0, fc.width, fc.height);
      }
      if (p.fractalEnabled && p.fractalLayerMode === "overlay") {
        fctx.save();
        fctx.globalAlpha = p.fractalOpacity;
        drawFractalBackground(fctx, fc);
        fctx.restore();
      }
    }
  };

  const tick = () => {
    const audioEl = audioRef.current;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const monoSamples = monoSamplesRef.current;
    if (!audioEl || !canvas || !ctx || !monoSamples) return;

    syncCanvasSize();
    syncFractalCanvasSize();

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

    const p = paramsRef.current;
    const isFractal = p.fractalEnabled;
    const layerMode = p.fractalLayerMode;
    const isRecording = drawingModeRef.current === "record";

    // --- 1. DRAW FRACTAL CANVAS (background layer, every frame) ---
    const fractalCanvas = fractalCanvasRef.current;
    const fractalCtx = fractalCtxRef.current;
    if (fractalCanvas && fractalCtx) {
      fractalCtx.clearRect(0, 0, fractalCanvas.width, fractalCanvas.height);
      if (isFractal && layerMode === "replace") {
        drawFractalBackground(fractalCtx, fractalCanvas);
      } else {
        const img = bgImageRef.current;
        if (img) {
          const scale = Math.max(fractalCanvas.width / img.width, fractalCanvas.height / img.height);
          const x = (fractalCanvas.width - img.width * scale) / 2;
          const y = (fractalCanvas.height - img.height * scale) / 2;
          fractalCtx.drawImage(img, x, y, img.width * scale, img.height * scale);
        } else {
          fractalCtx.fillStyle = p.bgColor;
          fractalCtx.fillRect(0, 0, fractalCanvas.width, fractalCanvas.height);
        }
        if (isFractal && layerMode === "overlay") {
          fractalCtx.save();
          fractalCtx.globalAlpha = p.fractalOpacity;
          drawFractalBackground(fractalCtx, fractalCanvas);
          fractalCtx.restore();
        }
      }
    }

    // --- 2. WAVEFORM CANVAS BACKGROUND (transparent + trail or recording composite) ---
    const shouldFade = audioEl.loop || (!isRecording && isLoopingUI);

    if (!hasClearedRef.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isRecording && fractalCanvas) ctx.drawImage(fractalCanvas, 0, 0);
      resetDrawingState();
      hasClearedRef.current = true;
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0);
    } else if (shouldFade) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else if (isRecording) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (fractalCanvas) ctx.drawImage(fractalCanvas, 0, 0);
      resetDrawingState();
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0);
    }

    if (head < lastDrawnPointIndexRef.current && shouldFade) {
      lastDrawnPointIndexRef.current = -1;
      lastCurvePointRef.current = null;
    }

    const last = lastDrawnPointIndexRef.current;
    if (last < 0) {
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0);
      if (head > 0) drawAdditionalPath(0, head);
    } else if (head > last) {
      drawAdditionalPath(last, head);
      lastDrawnPointIndexRef.current = head;
    }

    drawTip(progress01);
    drawTitle(ctx, canvas);
    if (showParticles) updateAndDrawParticles(ctx);

    if (!audioEl.loop && progress01 >= 1) {
      isAnimatingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      if (drawingModeRef.current !== "record") {
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

    audioEl.loop = opts.loop;
    audioEl.currentTime = 0;
    audioEl.src = audioUrl;
    audioEl.volume = volume;

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
      await stopAll();
      const audioEl = audioRef.current;
      if (!audioEl) return;
      await prepareAndPlay({ loop: isLoopingUI });
      ensureCanvasContext();
      clearCanvasSolid();
      syncFractalCanvasSize();
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
    showToast("Video exportado correctamente");
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
      setCanvasVideoSize();
      ensureCanvasContext();
      clearCanvasSolid();
      resetDrawingState();

      stopAnimationOnly();

      try {
        audioEl.pause();
      } catch {
        // ignore
      }

      audioEl.loop = false;
      audioEl.currentTime = 0;
      audioEl.src = audioUrl;
      audioEl.volume = 1;

      const canvasCaptureStream = (canvas as any).captureStream as ((fps: number) => MediaStream) | undefined;
      if (typeof canvasCaptureStream !== "function") {
        throw new Error("captureStream() no está soportado en este navegador.");
      }

      const canvasStream = canvasCaptureStream.call(canvas, 30);

      // Reproducimos primero para tener pistas de audio disponibles
      await audioEl.play();

      // Capturamos audio desde el elemento en reproducción
      let mediaStream: MediaStream = canvasStream;
      const audioCaptureFn = (audioEl as any).captureStream as (() => MediaStream) | undefined;
      if (typeof audioCaptureFn === "function") {
        try {
          const audioStream = audioCaptureFn.call(audioEl);
          const audioTracks = audioStream.getAudioTracks();
          if (audioTracks.length > 0) {
            mediaStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              ...audioTracks,
            ]);
          }
        } catch (e) {
          console.warn("Fallo captureStream de audio:", e);
        }
      }

      const recorder = new RecordRTC(mediaStream, {
        type: "video",
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: bitrateMap[resolution] ?? 20_000_000,
        numberOfVideoFrames: 30,
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

        if (!r) {
          setIsExporting(false);
          return;
        }
        r.stopRecording(() => {
          (async () => {
            try {
              const blob: Blob | undefined = r.getBlob?.();
              if (!blob) throw new Error("No se generó el video.");

              downloadBlob(blob, "webm");
            } catch (e: any) {
              setRecordError(e?.message ?? "No se pudo descargar la grabación.");
            }
            setIsExporting(false);
          })();
        });
      };

      finishRecordRef.current = () => {
        finish();
      };

      audioEl.onended = () => {
        finish();
      };

      recorder.startRecording();
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

  const drawBgToFractalCanvas = () => {
    const fc = fractalCanvasRef.current;
    const fctx = fractalCtxRef.current;
    if (!fc || !fctx) return;
    syncFractalCanvasSize();
    fctx.clearRect(0, 0, fc.width, fc.height);
    const img = bgImageRef.current;
    if (img) {
      const scale = Math.max(fc.width / img.width, fc.height / img.height);
      const x = (fc.width - img.width * scale) / 2;
      const y = (fc.height - img.height * scale) / 2;
      fctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    } else {
      fctx.fillStyle = paramsRef.current.bgColor;
      fctx.fillRect(0, 0, fc.width, fc.height);
    }
  };

  const onPickBgImage = (file: File | null) => {
    if (!file) {
      setBgImage(null);
      bgImageRef.current = null;
      setBgImagePreset("custom");
      drawBgToFractalCanvas();
      setTimeout(() => clearCanvasSolid(), 50);
      return;
    }
    setBgMode("image");
    setFractalEnabled(false);
    setBgImagePreset("custom");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        bgImageRef.current = img;
        drawBgToFractalCanvas();
        clearCanvasSolid();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleBgImagePresetChange = (presetId: string) => {
    setBgImagePreset(presetId);
    if (presetId === "custom") {
      setBgImage(null);
      bgImageRef.current = null;
      drawBgToFractalCanvas();
      return;
    }
    setBgMode("image");
    const preset = BG_IMAGE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      bgImageRef.current = img;
      drawBgToFractalCanvas();
      clearCanvasSolid();
    };
    img.src = preset.src;
  };

  const loadSampleBgImage = useCallback(() => {
    const loadFallback = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 640;
      const c = canvas.getContext("2d")!;
      const grad = c.createLinearGradient(0, 0, 640, 640);
      grad.addColorStop(0, "#1e1b4b");
      grad.addColorStop(0.5, "#0f172a");
      grad.addColorStop(1, "#1e1b4b");
      c.fillStyle = grad;
      c.fillRect(0, 0, 640, 640);
      c.strokeStyle = "rgba(99,102,241,0.15)";
      c.lineWidth = 2;
      for (let i = -640; i < 1280; i += 40) {
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i + 640, 640);
        c.stroke();
      }
      c.fillStyle = "rgba(99,102,241,0.5)";
      c.font = "bold 48px sans-serif";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("MUESTRA", 320, 320);
      const img = new Image();
      img.onload = () => {
        setBgImage(img);
        bgImageRef.current = img;
        drawBgToFractalCanvas();
        clearCanvasSolid();
      };
      img.src = canvas.toDataURL();
    };
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      bgImageRef.current = img;
      setBgImagePreset("1");
      drawBgToFractalCanvas();
      clearCanvasSolid();
    };
    img.onerror = loadFallback;
    img.src = "/fondo_muestra_1.png";
  }, []);

  const saveCurrentToActivePreset = useCallback(() => {
    const key = activePreset;
    if (!key) return;
    const data = {
      bgMode, bgColor, activeBgPreset,
      fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
      rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
      spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
      mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
      waveColor, waveGradientMode, gradColor1, gradColor2,
      glowIntensity, showParticles, particleColor, particleOpacity,
      radiusRatio, intensity, strokeWidth,
      songTitle, titleColor, titlePreset,
    };
    localStorage.setItem(`quickPreset_${key}`, JSON.stringify(data));
    showToast(`Preset "${key}" guardado`);
    setPresetSavedKeys((prev) => {
      const next = new Set(prev);
      next.add(key);
      localStorage.setItem("quickPreset_saved", JSON.stringify([...next]));
      return next;
    });
  }, [activePreset, bgMode, bgColor, activeBgPreset,
    fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
    rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
    spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
    mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
    waveColor, waveGradientMode, gradColor1, gradColor2,
    glowIntensity, showParticles, particleColor, particleOpacity,
    radiusRatio, intensity, strokeWidth,
    songTitle, titleColor, titlePreset, showToast]);

  const loadSavedPreset = useCallback((key: string) => {
    const raw = localStorage.getItem(`quickPreset_${key}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, []);

  const applyQuickPreset = useCallback((key: string) => {
    const expandBg = () => {
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        next.delete("bg");
        return next;
      });
    };
    setActivePreset(key);

    const saved = loadSavedPreset(key);
    if (saved) {
      expandBg();
      setBgMode(saved.bgMode);
      setBgColor(saved.bgColor);
      setActiveBgPreset(saved.activeBgPreset ?? null);
      setFractalEnabled(saved.fractalEnabled);
      setFractalType(saved.fractalType);
      setFractalLayerMode(saved.fractalLayerMode);
      setFractalOpacity(saved.fractalOpacity);
      setFractalAudioReactive(saved.fractalAudioReactive);
      setRippleRingCount(saved.rippleRingCount);
      setRippleSpeed(saved.rippleSpeed);
      setRippleAmplitude(saved.rippleAmplitude);
      setRippleThickness(saved.rippleThickness);
      setRippleColor1(saved.rippleColor1);
      setRippleColor2(saved.rippleColor2);
      setSpiralDensity(saved.spiralDensity);
      setSpiralRotationSpeed(saved.spiralRotationSpeed);
      setSpiralTightness(saved.spiralTightness);
      setSpiralDotSize(saved.spiralDotSize);
      setSpiralColor1(saved.spiralColor1);
      setSpiralColor2(saved.spiralColor2);
      setMandalaSegments(saved.mandalaSegments);
      setMandalaRotationSpeed(saved.mandalaRotationSpeed);
      setMandalaComplexity(saved.mandalaComplexity);
      setMandalaLineWidth(saved.mandalaLineWidth);
      setMandalaColor1(saved.mandalaColor1);
      setMandalaColor2(saved.mandalaColor2);
      setWaveColor(saved.waveColor);
      setWaveGradientMode(saved.waveGradientMode);
      setGradColor1(saved.gradColor1);
      setGradColor2(saved.gradColor2);
      setGlowIntensity(saved.glowIntensity);
      setShowParticles(saved.showParticles);
      setParticleColor(saved.particleColor);
      setParticleOpacity(saved.particleOpacity);
      setRadiusRatio(saved.radiusRatio);
      setIntensity(saved.intensity);
      setStrokeWidth(saved.strokeWidth);
      setSongTitle(saved.songTitle);
      setTitleColor(saved.titleColor);
      if (saved.titlePreset) setTitlePreset(saved.titlePreset);
      if (saved.bgMode === "image") {
        loadSampleBgImage();
      } else if (saved.bgMode === "color") {
        setBgImage(null);
        bgImageRef.current = null;
        setBgImagePreset("custom");
      }
      return;
    }

    switch (key) {
      case "croma":
        expandBg();
        setBgMode("color");
        setBgColor("#00d64f");
        setWaveColor("#ffffff");
        setFractalEnabled(false);
        setBgImage(null);
        bgImageRef.current = null;
        setBgImagePreset("custom");
        break;
      case "fractal1":
        expandBg();
        setBgMode("fractal");
        setFractalEnabled(true);
        setFractalType("ripple");
        setFractalLayerMode("overlay");
        setFractalAudioReactive(true);
        break;
      case "fractal2":
        expandBg();
        setBgMode("fractal");
        setFractalEnabled(true);
        setFractalType("mandala");
        setFractalLayerMode("overlay");
        setFractalOpacity(0.7);
        setFractalAudioReactive(true);
        break;
      case "fractal3":
        expandBg();
        setBgMode("fractal");
        setFractalEnabled(true);
        setFractalType("spiral");
        setFractalLayerMode("overlay");
        setFractalAudioReactive(true);
        break;
      case "image":
        expandBg();
        setBgMode("image");
        setFractalEnabled(false);
        loadSampleBgImage();
        break;
    }
  }, [loadSavedPreset, loadSampleBgImage]);

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
  }, []);

  const fileMeta = useMemo(() => {
    if (!fileName) return null;
    return `${fileName}${fileSize ? ` (${formatBytes(fileSize)})` : ""}`;
  }, [fileName, fileSize]);

  return (
    <section className="glass glass-hover animate-fade-in overflow-hidden p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <aside className="w-full md:w-72 space-y-1 max-h-[calc(100vh-10rem)] overflow-y-auto sidebar-surface">
          <div className="space-y-2 pr-1">
            {/* Reset defaults */}
            <button type="button" onClick={resetDefaults}
              aria-label="Restablecer valores predeterminados"
              className="w-full rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-[11px] font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              ← Resetear valores
            </button>
            {/* Quick presets */}
            {(() => {
              const presets = [
                { label: "Croma", key: "croma" },
                { label: "Imagen", key: "image" },
                { label: "Fractal 1", key: "fractal1" },
                { label: "Fractal 2", key: "fractal2" },
                { label: "Fractal 3", key: "fractal3" },
              ];
              return (
                <>
                  <div className="grid grid-cols-5 gap-1">
                    {presets.map((p) => (
                      <button key={p.key} type="button" onClick={() => applyQuickPreset(p.key)}
                        aria-label={`Preset ${p.label}`}
                        className={`rounded-lg px-1 py-0.5 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                          activePreset === p.key
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                            : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-indigo-500/50 hover:text-indigo-300"
                        }`}
                      >
                        {p.label}{presetSavedKeys.has(p.key) ? "*" : ""}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={saveCurrentToActivePreset}
                    disabled={!activePreset}
                    aria-label="Guardar preset activo"
                    className="w-full rounded-lg px-1 py-0.5 text-[11px] font-medium bg-slate-800/60 text-amber-400 border border-slate-700/50 hover:border-amber-500/50 hover:text-amber-300 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                  >
                    Guardar preset
                  </button>
                </>
              );
            })()}

            <CollapsibleSection
              title="Audio"
              collapsed={collapsedSections.has("audio")}
              onToggle={() => toggleSection("audio")}
              icon={<div aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />}
            >
              <div className="flex flex-col gap-1">
                <FileDropZone onDrop={(file) => onPickFile(file)}>
                  <input
                    type="file"
                    accept="audio/*"
                    aria-label="Seleccionar archivo de audio"
                    disabled={isDecoding || isRecording || isPreviewing}
                    className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 transition-all duration-200 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-indigo-200 hover:file:bg-indigo-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                    onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                  />
                </FileDropZone>
                {fileMeta ? (
                  <div className="text-xs text-slate-400">{fileMeta}</div>
                ) : (
                  <div className="text-xs text-slate-400">Selecciona un archivo de audio</div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Onda"
              collapsed={collapsedSections.has("wave")}
              onToggle={() => toggleSection("wave")}
              icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />}
            >
              <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase pb-0.5">Forma</div>
              <label className="block">
                <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                  <span>Radio</span>
                  <span className="tabular-nums text-slate-300">{radiusRatio.toFixed(2)}</span>
                </div>
                <input type="range" min={0.25} max={0.6} step={0.01} value={radiusRatio} onChange={(e) => setRadiusRatio(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
              </label>

              <label className="block pt-1">
                <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                  <span>Intensidad</span>
                  <span className="tabular-nums text-slate-300">{intensity.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={0.8} step={0.01} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
              </label>

              <label className="block pt-1">
                <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                  <span>Grosor</span>
                  <span className="tabular-nums text-slate-300">{strokeWidth.toFixed(1)}</span>
                </div>
                <input type="range" min={1} max={10} step={0.5} value={strokeWidth} onChange={(e) => setStrokeWidth(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
              </label>

              <div className="border-t border-slate-800/60 pt-1.5 mt-1.5">
                <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase pb-0.5">Color</div>
                <label className="block">
                  <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Onda</div>
                  <div className="flex items-center gap-1.5">
                    <input type="color" value={waveColor} onChange={(e) => setWaveColor(e.target.value)} disabled={isDecoding || isRecording} aria-label="Color de onda" className="mt-0.5 h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                    <span className="text-[11px] font-mono text-slate-500">{waveColor}</span>
                  </div>
                </label>

                <div className="pt-1">
                  <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Gradiente</div>
                  <select value={waveGradientMode} onChange={(e) => setWaveGradientMode(e.target.value as any)} disabled={isDecoding || isRecording} aria-label="Modo de gradiente" className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950">
                    <option value="solid">Sólido</option>
                    <option value="gradient">Gradiente</option>
                    <option value="rainbow">Arcoíris</option>
                  </select>
                </div>

                {waveGradientMode === "gradient" && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <label className="block">
                      <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                      <div className="flex items-center gap-1">
                        <input type="color" value={gradColor1} onChange={(e) => setGradColor1(e.target.value)} aria-label="Color de gradiente 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                        <span className="text-[10px] font-mono text-slate-500">{gradColor1}</span>
                      </div>
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                      <div className="flex items-center gap-1">
                        <input type="color" value={gradColor2} onChange={(e) => setGradColor2(e.target.value)} aria-label="Color de gradiente 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                        <span className="text-[10px] font-mono text-slate-500">{gradColor2}</span>
                      </div>
                    </label>
                  </div>
                )}

                <label className="block pt-1">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Brillo</span>
                    <span className="tabular-nums text-slate-300">{glowIntensity.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={glowIntensity} onChange={(e) => setGlowIntensity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
              </div>

              <div className="border-t border-slate-800/60 pt-1.5 mt-1.5">
                <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase pb-0.5">Texto</div>
                <input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Mi canción..."
                  aria-label="Título de la canción"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                />
                <select value={titlePreset} onChange={(e) => setTitlePreset(e.target.value)}
                  aria-label="Estilo de título"
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                >
                  {TITLE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1.5 mt-1">
                  <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} aria-label="Color de título" className="h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                  <span className="text-[11px] font-mono text-slate-500">{titleColor}</span>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title="Partículas"
              collapsed={collapsedSections.has("particles")}
              onToggle={() => toggleSection("particles")}
              icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]" />}
            >
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
                <input type="checkbox" checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} disabled={isDecoding || isRecording} aria-label="Mostrar partículas" className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                Activar partículas
              </label>
              {showParticles && (
                <>
                  <label className="block pt-1">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color</div>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={particleColor} onChange={(e) => setParticleColor(e.target.value)} aria-label="Color de partículas" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[11px] font-mono text-slate-500">{particleColor}</span>
                    </div>
                  </label>
                  <label className="block pt-1">
                    <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                      <span>Opacidad</span>
                      <span className="tabular-nums text-slate-300">{particleOpacity.toFixed(2)}</span>
                    </div>
                    <input type="range" min={0} max={1} step={0.05} value={particleOpacity} onChange={(e) => setParticleOpacity(parseFloat(e.target.value))} className="mt-0.5 w-full" />
                  </label>
                </>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Fondo"
              collapsed={collapsedSections.has("bg")}
              onToggle={() => toggleSection("bg")}
              icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />}
            >
              {/* Mode selector: Color | Imagen | Fractal */}
              <div className="grid grid-cols-3 gap-1 pb-1.5">
                {(["color", "image", "fractal"] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => handleBgModeChange(mode)}
                    disabled={isDecoding || isRecording}
                    aria-label={`Modo fondo: ${mode === "color" ? "Color" : mode === "image" ? "Imagen" : "Fractal"}`}
                    className={`rounded-lg px-1.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                      bgMode === mode
                        ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                        : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
                    }`}
                  >
                    {mode === "color" ? "Color" : mode === "image" ? "Imagen" : "Fractal"}
                  </button>
                ))}
              </div>

              {/* COLOR sub-menu */}
              <div className={`overflow-hidden transition-all duration-250 ease-in-out ${
                bgMode === "color" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="pt-0.5 space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {bgPresets.map((p) => (
                      <button key={p.id} type="button" onClick={() => applyBgPreset(p.id)} disabled={isDecoding || isRecording}
                        aria-label={`Fondo preset: ${p.label}`}
                        className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                          activeBgPreset === p.id
                            ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                            : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Personalizado</div>
                    <div className="flex items-center gap-1.5">
                      <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActiveBgPreset(null); }}
                        disabled={isDecoding || isRecording} aria-label="Color de fondo personalizado" className="h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[11px] font-mono text-slate-500">{bgColor}</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* IMAGE sub-menu */}
              <div className={`overflow-hidden transition-all duration-250 ease-in-out ${
                bgMode === "image" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="pt-0.5 space-y-1">
                  <select value={bgImagePreset} onChange={(e) => handleBgImagePresetChange(e.target.value)}
                    aria-label="Imagen de fondo predefinida"
                    disabled={isDecoding || isRecording}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                  >
                    <option value="custom">Ninguna</option>
                    {BG_IMAGE_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <FileDropZone onDrop={(file) => onPickBgImage(file)}>
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Seleccionar imagen de fondo"
                      disabled={isDecoding || isRecording || isPreviewing}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 transition-all duration-200 file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-cyan-200 hover:file:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                      onChange={(e) => onPickBgImage(e.target.files?.[0] ?? null)}
                    />
                  </FileDropZone>
                  {bgImage && (
                    <button
                      type="button"
                      onClick={() => onPickBgImage(null)}
                      aria-label="Remover imagen de fondo"
                      className="self-start rounded-lg px-1.5 py-0.5 text-xs text-rose-400 transition-all duration-200 hover:bg-rose-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              {/* FRACTAL sub-menu */}
              <div className={`overflow-hidden transition-all duration-250 ease-in-out ${
                bgMode === "fractal" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                <div className="pt-0.5 space-y-1">
                  <div className="text-xs text-slate-400 italic">Fractal activado</div>

                  <select value={fractalType} onChange={(e) => setFractalType(e.target.value as any)}
                    disabled={isDecoding || isRecording}
                    aria-label="Tipo de fractal"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-fuchsia-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                  >
                    <option value="ripple">Ondas (Ripple)</option>
                    <option value="spiral">Espiral (Phyllotaxis)</option>
                    <option value="mandala">Mandala</option>
                  </select>

                  <select value={fractalLayerMode} onChange={(e) => setFractalLayerMode(e.target.value as any)}
                    disabled={isDecoding || isRecording}
                    aria-label="Modo de capa fractal"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-fuchsia-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                  >
                    <option value="overlay">Superposición</option>
                    <option value="replace">Fondo completo</option>
                  </select>

                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
                    <input type="checkbox" checked={fractalAudioReactive} onChange={(e) => setFractalAudioReactive(e.target.checked)}
                      disabled={isDecoding || isRecording} aria-label="Fractal reactivo al audio"
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-fuchsia-500 accent-fuchsia-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                    />
                    Reactivo al audio
                  </label>

                  {fractalLayerMode === "overlay" && (
                    <label className="block">
                      <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                        <span>Opacidad</span>
                        <span className="tabular-nums text-slate-300">{fractalOpacity.toFixed(2)}</span>
                      </div>
                      <input type="range" min={0.1} max={1} step={0.05} value={fractalOpacity} onChange={(e) => setFractalOpacity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                    </label>
                  )}

                  <div className="flex justify-center pt-0.5 pb-1">
                    <canvas ref={fractalPreviewRef} width={80} height={80}
                      className="w-[80px] h-[80px] rounded-lg border border-slate-700/50 bg-slate-950/80"
                      aria-label="Vista previa del fractal" />
                  </div>

                  {/* RIPPLE CONTROLS */}
                  {fractalType === "ripple" && (
                    <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                      <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Ondas</div>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Anillos</span>
                          <span className="tabular-nums text-slate-300">{rippleRingCount}</span>
                        </div>
                        <input type="range" min={3} max={20} step={1} value={rippleRingCount} onChange={(e) => setRippleRingCount(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Velocidad</span>
                          <span className="tabular-nums text-slate-300">{rippleSpeed.toFixed(1)}</span>
                        </div>
                        <input type="range" min={0.1} max={3} step={0.1} value={rippleSpeed} onChange={(e) => setRippleSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Amplitud</span>
                          <span className="tabular-nums text-slate-300">{rippleAmplitude}</span>
                        </div>
                        <input type="range" min={2} max={60} step={1} value={rippleAmplitude} onChange={(e) => setRippleAmplitude(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Grosor</span>
                          <span className="tabular-nums text-slate-300">{rippleThickness.toFixed(1)}</span>
                        </div>
                        <input type="range" min={0.5} max={6} step={0.5} value={rippleThickness} onChange={(e) => setRippleThickness(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={rippleColor1} onChange={(e) => setRippleColor1(e.target.value)} aria-label="Color de ripple 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{rippleColor1}</span>
                          </div>
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={rippleColor2} onChange={(e) => setRippleColor2(e.target.value)} aria-label="Color de ripple 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{rippleColor2}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* SPIRAL CONTROLS */}
                  {fractalType === "spiral" && (
                    <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                      <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Espiral</div>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Densidad</span>
                          <span className="tabular-nums text-slate-300">{spiralDensity}</span>
                        </div>
                        <input type="range" min={50} max={500} step={10} value={spiralDensity} onChange={(e) => setSpiralDensity(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Rotación</span>
                          <span className="tabular-nums text-slate-300">{spiralRotationSpeed.toFixed(1)}</span>
                        </div>
                        <input type="range" min={-3} max={3} step={0.1} value={spiralRotationSpeed} onChange={(e) => setSpiralRotationSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Apertura</span>
                          <span className="tabular-nums text-slate-300">{spiralTightness.toFixed(2)}</span>
                        </div>
                        <input type="range" min={0.1} max={1.5} step={0.05} value={spiralTightness} onChange={(e) => setSpiralTightness(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Tamaño punto</span>
                          <span className="tabular-nums text-slate-300">{spiralDotSize.toFixed(1)}</span>
                        </div>
                        <input type="range" min={0.5} max={6} step={0.5} value={spiralDotSize} onChange={(e) => setSpiralDotSize(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={spiralColor1} onChange={(e) => setSpiralColor1(e.target.value)} aria-label="Color de espiral 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{spiralColor1}</span>
                          </div>
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={spiralColor2} onChange={(e) => setSpiralColor2(e.target.value)} aria-label="Color de espiral 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{spiralColor2}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* MANDALA CONTROLS */}
                  {fractalType === "mandala" && (
                    <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                      <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Mandala</div>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Segmentos</span>
                          <span className="tabular-nums text-slate-300">{mandalaSegments}</span>
                        </div>
                        <input type="range" min={3} max={24} step={1} value={mandalaSegments} onChange={(e) => setMandalaSegments(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Rotación</span>
                          <span className="tabular-nums text-slate-300">{mandalaRotationSpeed.toFixed(1)}</span>
                        </div>
                        <input type="range" min={-3} max={3} step={0.1} value={mandalaRotationSpeed} onChange={(e) => setMandalaRotationSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Complejidad</span>
                          <span className="tabular-nums text-slate-300">{mandalaComplexity}</span>
                        </div>
                        <input type="range" min={1} max={6} step={1} value={mandalaComplexity} onChange={(e) => setMandalaComplexity(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <label className="block">
                        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                          <span>Grosor línea</span>
                          <span className="tabular-nums text-slate-300">{mandalaLineWidth.toFixed(1)}</span>
                        </div>
                        <input type="range" min={0.5} max={5} step={0.5} value={mandalaLineWidth} onChange={(e) => setMandalaLineWidth(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={mandalaColor1} onChange={(e) => setMandalaColor1(e.target.value)} aria-label="Color de mandala 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{mandalaColor1}</span>
                          </div>
                        </label>
                        <label className="block">
                          <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                          <div className="flex items-center gap-1">
                            <input type="color" value={mandalaColor2} onChange={(e) => setMandalaColor2(e.target.value)} aria-label="Color de mandala 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                            <span className="text-[10px] font-mono text-slate-500">{mandalaColor2}</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleSection>



            {/* Waveform preview */}
            {waveformReady && (
              <div>
                <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Waveform</div>
                <canvas ref={previewCanvasRef} className="w-full h-14 rounded-lg border border-slate-800/60 bg-slate-950/40" />
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
              <input type="checkbox" checked={isLoopingUI} onChange={(e) => { const v = e.target.checked; setIsLoopingUI(v); if (audioRef.current) audioRef.current.loop = v; }}
                disabled={isRecording} aria-label="Activar loop de preview"
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              />
              Loop preview
            </label>

            <label className="block pt-1">
              <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                <span>Volumen</span>
                <span className="tabular-nums text-slate-300">{Math.round(volume * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={volume}
                onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
                aria-label="Volumen de preview"
                className="mt-0.5 w-full" />
            </label>

            <button type="button" onClick={handlePreview}
              disabled={isDecoding || isRecording || isPreviewing || !audioUrl || !waveformReady}
              aria-label="Previsualizar audio"
              className="w-full rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {isDecoding ? (
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Decodificando...
                </span>
              ) : (
                "Previsualizar"
              )}
            </button>

            <button type="button" onClick={() => void stopAll()}
              disabled={(!isRecording && !isPreviewing) || isDecoding}
              aria-label="Detener preview o grabación"
              className="w-full rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-700/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Detener
            </button>

            {error ? (
              <div role="alert" className="rounded-lg border border-rose-800/50 bg-rose-950/30 backdrop-blur-sm p-2 text-xs text-rose-200 shadow-lg shadow-rose-900/10">
                {error}
              </div>
            ) : null}
            {recordError ? (
              <div role="alert" className="rounded-lg border border-rose-800/50 bg-rose-950/30 backdrop-blur-sm p-2 text-xs text-rose-200 shadow-lg shadow-rose-900/10">
                {recordError}
              </div>
            ) : null}

            <CollapsibleSection
              title="Exportar"
              collapsed={collapsedSections.has("export")}
              onToggle={() => toggleSection("export")}
              icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />}
            >
              <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Resolución</div>
              <div className="grid grid-cols-3 gap-1">
                {(["720p", "1080p", "4K"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setResolution(r)} disabled={isExporting || isRecording}
                    aria-label={`Resolución ${r}`}
                    className={`rounded-lg px-1.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                      resolution === r
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button type="button" onClick={() => void handleGenerateAndDownloadRealtime()}
                disabled={isDecoding || isRecording || isExporting || !audioUrl || !waveformReady}
                aria-label="Generar y descargar video"
                className="mt-2 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Generar y descargar video
              </button>

              <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 px-2 py-1 mt-1.5 text-xs leading-relaxed text-amber-300/70">
                Mantén la pestaña en primer plano.
              </div>

              {isExporting ? (
                <div className="pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-indigo-300">
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Exportando...
                  </div>
                </div>
              ) : null}
            </CollapsibleSection>
            {/* Toast notification */}
            {toast && (
              <div
                role="status"
                aria-live="polite"
                className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-2 text-xs font-medium shadow-lg transition-all duration-300 ${
                  toast.type === "success"
                    ? "bg-emerald-900/80 text-emerald-200 border border-emerald-700/50"
                    : "bg-indigo-900/80 text-indigo-200 border border-indigo-700/50"
                }`}
              >
                {toast.message}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-bold text-gradient-soft tracking-tight">Visualizador</div>
            <div className="text-xs text-slate-400">Ajusta parámetros en vivo</div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-2 shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.18)]">
            <div className="relative w-full aspect-square">
              <canvas ref={fractalCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ zIndex: 0 }} />
              <canvas ref={canvasRef}
                className="relative w-full h-full rounded-lg"
                style={{ zIndex: 1 }} />
            </div>
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}