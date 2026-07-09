import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RecordRTC from "recordrtc";
import IAAsistentPanel from "./IAAsistentPanel";
import { useIAAsistent } from "../hooks/useIAAsistent";
import type { ControlSetters } from "../hooks/useIAAsistent";
import { initFFmpeg, isFFmpegLoaded, isFFmpegLoading, waitForFFmpeg, convertToMp4 } from "../utils/convertWebmToMp4";
import ConversionProgress from "./ConversionProgress";
import CollapsibleSection from "./CollapsibleSection";
import FileDropZone from "./FileDropZone";
import AudioSection from "./sidebar/AudioSection";
import PresetsSection from "./sidebar/PresetsSection";
import WaveSection from "./sidebar/WaveSection";
import BgSection from "./sidebar/BgSection";
import FractalSection from "./sidebar/FractalSection";
import InstinctSection from "./sidebar/InstinctSection";

import TextSection from "./sidebar/TextSection";
import ExportSection from "./sidebar/ExportSection";
import type { FractalType, FractalParams } from "../utils/fractals";
import type { InstinctMode, InstinctParams } from "../utils/instinct";
import { drawFractalBackground as drawFractalBg, drawFractalPreview as drawFractalPrev, TWO_PI, clamp, hexToRgba } from "../utils/fractals";
import { drawInstinctFractal, drawInstinctPreview } from "../utils/instinct";
import { fftLikePointsPerCircle, getPointXY, drawAdditionalPath, drawTip, drawStaticWaveform, type Point, type WaveStyle } from "../utils/wave";
import { emitParticles, updateAndDrawParticles } from "../utils/particles";
import { TITLE_PRESETS, drawTitle } from "../utils/title";
import { bgPresets, drawFondoCanvas } from "../utils/fondo";
import { syncAllCanvasSizes as syncSizes, setCanvasVideoSize as setVideoSize, clearCanvasSolid as clearCanvas } from "../utils/canvas";
import { buildPrecomputedGeometry as buildGeo, getCurrentAmplitude as getAmp } from "../utils/audio";



function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AudioVisualizer() {
  const ondaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ondaCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const fondoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fondoCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const fractalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fractalCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const instinctCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const instinctCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const fractalPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const instinctPreviewRef = useRef<HTMLCanvasElement | null>(null);

  const letrasCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const letrasCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Waveform (decoded) for deterministic circular mapping.
  const monoSamplesRef = useRef<Float32Array | null>(null);
  const totalSamplesRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const sampleRateRef = useRef<number>(0);

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
  const lastFrameTimeRef = useRef<number | null>(null);

  // Recording
  const recorderRef = useRef<any | null>(null);
  const finishRecordRef = useRef<(() => void) | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);

  // FFmpeg conversion
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convProgress, setConvProgress] = useState(0);
  const [convLogs, setConvLogs] = useState<string[]>([]);
  const [convCurrentFrame, setConvCurrentFrame] = useState(0);
  const [convTotalFrames, setConvTotalFrames] = useState(0);

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
    setShowWave(true);
    setRadiusRatio(0.50);
    setIntensity(0.17);
    setStrokeWidth(0.3);
    setWaveColor("#ffffff");
    setBgColor("#000000");
    setGlowIntensity(0.40);
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
    setRippleSpeed(0.1);
    setRippleAmplitude(60);
    setRippleThickness(14.5);
    setRippleColor1("#1bff0a");
    setRippleColor2("#1119e8");
    setSpiralDensity(320);
    setSpiralRotationSpeed(0.0);
    setSpiralTightness(0.95);
    setSpiralDotSize(11.5);
    setSpiralColor1("#e3e3f2");
    setSpiralColor2("#ee8c2f");
    setMandalaSegments(14);
    setMandalaRotationSpeed(0.0);
    setMandalaComplexity(6);
    setMandalaLineWidth(19.5);
    setMandalaColor1("#4910f4");
    setMandalaColor2("#fbff24");
    setInstinctMode("water");
    setInstinctSpeed(1.0);
    setInstinctStrength(25);
    setInstinctFrequency(0.01);
    setInstinctEnabled(false);
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
    () => new Set(["presets", "wave", "bg", "fractal", "instinct", "text"])
  );
  const toggleSection = useCallback((name: string) => {
    setCollapsedSections((prev) => {
      const wasCollapsed = prev.has(name);
      const next = new Set(prev);
      if (wasCollapsed) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Song title overlay
  const [volume, setVolume] = useState(0.7);
  const [songTitle, setSongTitle] = useState("");
  const [titleColor, setTitleColor] = useState("#ffffff");
  const [titlePreset, setTitlePreset] = useState("bottom-center");

  // UI / audio
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobile] = useState(() =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );
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
  const [glowIntensity, setGlowIntensity] = useState(0.40);
  const [showParticles, setShowParticles] = useState(false);
  const [particleColor, setParticleColor] = useState("#a78bfa");
  const [particleOpacity, setParticleOpacity] = useState(0.7);
  const [waveGradientMode, setWaveGradientMode] = useState<"solid" | "gradient" | "rainbow">("solid");
  const [gradColor1, setGradColor1] = useState("#6366f1");
  const [gradColor2, setGradColor2] = useState("#a855f7");

  // --- BACKGROUND PRESETS ---
  const [activeBgPreset, setActiveBgPreset] = useState<string | null>(null);

  // --- FRACTAL ---
  const [fractalEnabled, setFractalEnabled] = useState(false);
  const [fractalType, setFractalType] = useState<FractalType>("ripple");
  const [fractalLayerMode, setFractalLayerMode] = useState<"replace" | "overlay">("overlay");
  const [fractalOpacity, setFractalOpacity] = useState(0.8);
  const [fractalAudioReactive, setFractalAudioReactive] = useState(true);

  const [rippleRingCount, setRippleRingCount] = useState(8);
  const [rippleSpeed, setRippleSpeed] = useState(0.1);
  const [rippleAmplitude, setRippleAmplitude] = useState(60);
  const [rippleThickness, setRippleThickness] = useState(14.5);
  const [rippleColor1, setRippleColor1] = useState("#1bff0a");
  const [rippleColor2, setRippleColor2] = useState("#1119e8");

  const [spiralDensity, setSpiralDensity] = useState(320);
  const [spiralRotationSpeed, setSpiralRotationSpeed] = useState(0.0);
  const [spiralTightness, setSpiralTightness] = useState(0.95);
  const [spiralDotSize, setSpiralDotSize] = useState(11.5);
  const [spiralColor1, setSpiralColor1] = useState("#e3e3f2");
  const [spiralColor2, setSpiralColor2] = useState("#ee8c2f");

  const [mandalaSegments, setMandalaSegments] = useState(14);
  const [mandalaRotationSpeed, setMandalaRotationSpeed] = useState(0.0);
  const [mandalaComplexity, setMandalaComplexity] = useState(6);
  const [mandalaLineWidth, setMandalaLineWidth] = useState(19.5);
  const [mandalaColor1, setMandalaColor1] = useState("#4910f4");
  const [mandalaColor2, setMandalaColor2] = useState("#fbff24");

  // --- INSTINCT ---
  const [instinctMode, setInstinctMode] = useState<InstinctMode>("water");
  const [instinctSpeed, setInstinctSpeed] = useState(1.0);
  const [instinctStrength, setInstinctStrength] = useState(25);
  const [instinctFrequency, setInstinctFrequency] = useState(0.01);
  const [instinctEnabled, setInstinctEnabled] = useState(false);

  // --- LAYER ORDER (excluding fondo - it's always bottom) ---
  const [layerOrder, setLayerOrder] = useState<string[]>(["fractal", "instinct", "onda", "letras"]);

  const moveLayer = useCallback((layer: string, dir: number) => {
    setLayerOrder(prev => {
      const idx = prev.indexOf(layer);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      next.splice(newIdx, 0, layer);
      return next;
    });
  }, []);

  const layerZIndex = useMemo(() => {
    const map: Record<string, number> = { fondo: 0 };
    layerOrder.forEach((name, idx) => {
      map[name] = idx + 1;
    });
    return map;
  }, [layerOrder]);

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
  const [showWave, setShowWave] = useState(true);
  const [radiusRatio, setRadiusRatio] = useState(0.50); // radio base = min(cx,cy) * ratio
  const [intensity, setIntensity] = useState(0.17); // amp radius = radiusBase * intensity
  const [strokeWidth, setStrokeWidth] = useState(0.3);
  const [waveColor, setWaveColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#000000");

  const paramsRef = useRef({
    showWave,
    radiusRatio,
    intensity,
    strokeWidth,
    waveColor,
    bgColor,
    songTitle,
    titleColor,
    titlePreset,
    glowIntensity,
    showParticles,
    particleColor,
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

  const instinctParamsRef = useRef({
    enabled: false,
    mode: "water" as InstinctMode,
    speed: 1.0,
    strength: 25,
    frequency: 0.01,
  });

  useEffect(() => {
    paramsRef.current = {
      showWave, radiusRatio, intensity, strokeWidth, waveColor, bgColor,
      songTitle, titleColor, titlePreset, glowIntensity, showParticles, particleColor, particleOpacity, waveGradientMode, gradColor1, gradColor2,
      fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
      rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
      spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
      mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
    };
    bgImageRef.current = bgImage;
    redrawFondoCanvas();
    redrawFractalCanvas();
  }, [
    showWave, radiusRatio, intensity, strokeWidth, waveColor, bgColor, bgImage,
    songTitle, titleColor, titlePreset, glowIntensity, showParticles, particleColor, particleOpacity, waveGradientMode, gradColor1, gradColor2,
    fractalEnabled, fractalType, fractalLayerMode, fractalOpacity, fractalAudioReactive,
    rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
    spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
    mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
  ]);

  useEffect(() => {
    instinctParamsRef.current = {
      enabled: instinctEnabled,
      mode: instinctMode,
      speed: instinctSpeed,
      strength: instinctStrength,
      frequency: instinctFrequency,
    };
    redrawFractalCanvas();
  }, [instinctEnabled, instinctMode, instinctSpeed, instinctStrength, instinctFrequency]);

  // --- IA Asistent ---
  const {
    isActive: isIAAsistentActive,
    setIsActive: setIsIAAsistentActive,
    mode: iaMode,
    setMode: setIAMode,
    bpm: iaBpm,
    currentBeatIndex: iaBeatIndex,
    update: iaUpdate,
  } = useIAAsistent({
    monoSamples: monoSamplesRef.current,
    sampleRate: sampleRateRef.current,
    duration: durationRef.current,
    setters: {
      setIntensity, setStrokeWidth, setWaveColor, setGlowIntensity,
      setWaveGradientMode, setGradColor1, setGradColor2, setRadiusRatio,
      setBgMode, setBgColor,
      setFractalEnabled, setFractalType, setFractalLayerMode, setFractalOpacity,
      setRippleSpeed, setRippleAmplitude, setRippleThickness, setRippleColor1, setRippleColor2,
      setSpiralRotationSpeed, setSpiralTightness, setSpiralDotSize, setSpiralColor1,
      setMandalaRotationSpeed, setMandalaLineWidth, setMandalaColor1,
      setShowParticles, setParticleColor, setParticleOpacity,
      setInstinctMode, setInstinctSpeed, setInstinctStrength, setInstinctFrequency, setInstinctEnabled,
    } as ControlSetters,
  });

  const iaStateRef = useRef({ active: false, update: (_t: number, _a: number) => {} });
  iaStateRef.current.active = isIAAsistentActive;
  iaStateRef.current.update = iaUpdate;

  // When IA activates, set background to static black
  useEffect(() => {
    if (isIAAsistentActive) {
      setBgMode("fractal");
      setBgColor("#000000");
      setActiveBgPreset(null);
      setBgImage(null);
      bgImageRef.current = null;
      setFractalEnabled(true);
      setFractalLayerMode("overlay");
      setRadiusRatio(0.50);
      setIntensity(0.70);
      setStrokeWidth(1.0);
      setParticleOpacity(0.10);
    }
  }, [isIAAsistentActive]);

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
    const canvas = ondaCanvasRef.current;
    if (!canvas) return null;
    if (!ondaCtxRef.current) ondaCtxRef.current = canvas.getContext("2d");
    if (ondaCtxRef.current) ondaCtxRef.current.imageSmoothingEnabled = false;

    const fc = fondoCanvasRef.current;
    if (fc && !fondoCtxRef.current) fondoCtxRef.current = fc.getContext("2d");
    if (fondoCtxRef.current) fondoCtxRef.current.imageSmoothingEnabled = false;

    const fxc = fractalCanvasRef.current;
    if (fxc && !fractalCtxRef.current) fractalCtxRef.current = fxc.getContext("2d");
    if (fractalCtxRef.current) fractalCtxRef.current.imageSmoothingEnabled = false;

    const ic = instinctCanvasRef.current;
    if (ic && !instinctCtxRef.current) instinctCtxRef.current = ic.getContext("2d");
    if (instinctCtxRef.current) instinctCtxRef.current.imageSmoothingEnabled = false;

    const tc = tempCanvasRef.current;
    if (tc && !tempCtxRef.current) tempCtxRef.current = tc.getContext("2d");
    if (tempCtxRef.current) tempCtxRef.current.imageSmoothingEnabled = true;

    const lc = letrasCanvasRef.current;
    if (lc && !letrasCtxRef.current) letrasCtxRef.current = lc.getContext("2d");
    if (letrasCtxRef.current) letrasCtxRef.current.imageSmoothingEnabled = false;

    return ondaCtxRef.current;
  };

  const clearCanvasSolid = () => {
    clearCanvas(ondaCanvasRef.current, ondaCtxRef.current);
    hasClearedRef.current = true;
  };

  const syncAllCanvasSizes = () => {
    syncSizes({
      onda: ondaCanvasRef.current,
      fondo: fondoCanvasRef.current,
      fractal: fractalCanvasRef.current,
      instinct: instinctCanvasRef.current,
      letras: letrasCanvasRef.current,
    }, window.devicePixelRatio || 1, drawingModeRef.current === "record");
  };

  const setCanvasVideoSize = () => {
    setVideoSize({
      onda: ondaCanvasRef.current,
      fondo: fondoCanvasRef.current,
      fractal: fractalCanvasRef.current,
      instinct: instinctCanvasRef.current,
      letras: letrasCanvasRef.current,
    }, Math.floor(resMap[resolution] || 1080));
  };

  const buildPrecomputedGeometry = () => {
    const result = buildGeo(totalSamplesRef.current, fftLikePointsPerCircle);
    if (!result) return;
    sampleStepRef.current = result.step;
    pointCountRef.current = result.pointCount;
    precomputedCosRef.current = result.cosArr;
    precomputedSinRef.current = result.sinArr;
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
          // for (let i = 0; i < length; i++) mono[i] += ch[i] / channels; // mezcla mono promedio (atenuaba picos paneados)
          for (let i = 0; i < length; i++) mono[i] += ch[i]; // suma directa L+R
        }
      }

      monoSamplesRef.current = mono;
      totalSamplesRef.current = length;
      durationRef.current = audioBuffer.duration;
      sampleRateRef.current = audioBuffer.sampleRate;

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

  const particlesRef = useRef<import("../utils/particles").Particle[]>([]);

  useEffect(() => {
    if (!waveformReady || !previewCanvasRef.current) return;

    const redraw = () => requestAnimationFrame(() => {
      const c = previewCanvasRef.current;
      if (!c) return;
      let pCtx = previewCtxRef.current;
      if (!pCtx || pCtx.canvas !== c) {
        pCtx = c.getContext("2d");
        if (!pCtx) return;
        previewCtxRef.current = pCtx;
      }
      const ms = monoSamplesRef.current;
      const ca = precomputedCosRef.current;
      const sa = precomputedSinRef.current;
      if (!ms || !ca || !sa) return;
      drawStaticWaveform(c, pCtx, {
        monoSamples: ms, cosArr: ca, sinArr: sa,
        totalSamples: totalSamplesRef.current,
        sampleStep: sampleStepRef.current,
        pointCount: pointCountRef.current,
      });
    });

    const observer = new ResizeObserver(redraw);
    observer.observe(previewCanvasRef.current.parentElement ?? previewCanvasRef.current);

    redraw();

    return () => observer.disconnect();
  }, [waveformReady, radiusRatio, intensity, waveColor]);

  // --- FRACTAL BACKGROUND ---

  const getCurrentAmplitude = () => {
    return getAmp(monoSamplesRef.current, audioRef.current, totalSamplesRef.current, durationRef.current);
  };

  const drawFractalPreviewWrapped = useCallback(() => {
    const canvas = fractalPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const p: FractalParams = {
      fractalType,
      bgColor,
      fractalAudioReactive,
      rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
      spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
      mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
    };
    drawFractalPrev(ctx, w, h, fractalType, p);
  }, [fractalType,
    bgColor,
    fractalAudioReactive,
    rippleRingCount, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2,
    spiralDensity, spiralRotationSpeed, spiralTightness, spiralDotSize, spiralColor1, spiralColor2,
    mandalaSegments, mandalaRotationSpeed, mandalaComplexity, mandalaLineWidth, mandalaColor1, mandalaColor2,
  ]);

  useEffect(() => { drawFractalPreviewWrapped(); }, [drawFractalPreviewWrapped]);

  const drawInstinctPreviewWrapped = useCallback(() => {
    const canvas = instinctPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const p: InstinctParams = {
      instinctMode,
      instinctSpeed,
      instinctStrength,
      instinctFrequency,
      bgColor,
      fractalAudioReactive: false,
    };
    drawInstinctPreview(ctx, w, h, p);
  }, [
    bgColor,
    instinctMode, instinctSpeed, instinctStrength, instinctFrequency,
  ]);

  useEffect(() => { drawInstinctPreviewWrapped(); }, [drawInstinctPreviewWrapped]);

  const redrawFondoCanvas = () => {
    const fc = fondoCanvasRef.current;
    const fctx = fondoCtxRef.current;
    if (!fc || !fctx) return;
    if (drawingModeRef.current !== "idle") return;

    syncAllCanvasSizes();
    drawFondoCanvas(fctx, fc, paramsRef.current.bgColor, bgImageRef.current);
  };

  const redrawFractalCanvas = () => {
    const fxc = fractalCanvasRef.current;
    const fxctx = fractalCtxRef.current;
    if (!fxc || !fxctx) return;

    syncAllCanvasSizes();
    fxctx.clearRect(0, 0, fxc.width, fxc.height);

    const p = paramsRef.current;
    if (p.fractalEnabled) {
      fxctx.save();
      fxctx.globalAlpha = p.fractalOpacity;
      const amp = p.fractalAudioReactive ? getCurrentAmplitude() : 0;
      drawFractalBg(fxctx, fxc, p as FractalParams, amp);
      fxctx.restore();
    }
  };

  const tick = () => {
    const audioEl = audioRef.current;
    const canvas = ondaCanvasRef.current;
    const ctx = ondaCtxRef.current;
    const monoSamples = monoSamplesRef.current;
    if (!audioEl || !canvas || !ctx || !monoSamples) return;

    syncAllCanvasSizes();

    const duration = durationRef.current;
    if (!duration) return;

    const currentTime = audioEl.currentTime || 0;
    const now = performance.now();
    const frameElapsed = lastFrameTimeRef.current !== null
      ? (now - lastFrameTimeRef.current) / 1000
      : 0.016;
    lastFrameTimeRef.current = now;
    const LOOK_AHEAD = frameElapsed * 4;
    const adjustedTime = Math.min(currentTime + LOOK_AHEAD, duration);
    const progress01 = clamp(adjustedTime / duration, 0, 1);

    const pointCount = pointCountRef.current;
    if (!pointCount) return;

    const step = sampleStepRef.current;
    const headSampleIndex = Math.floor(progress01 * (totalSamplesRef.current - 1));
    const headPointIndex = Math.floor(headSampleIndex / step);
    const head = clamp(headPointIndex, 0, pointCount - 1);

    const p = paramsRef.current;
    const isRecording = drawingModeRef.current === "record";

    const ia = iaStateRef.current;
    if (ia.active) {
      ia.update(currentTime, getCurrentAmplitude());
    }

    const waveData = {
      monoSamples,
      cosArr: precomputedCosRef.current!,
      sinArr: precomputedSinRef.current!,
      totalSamples: totalSamplesRef.current,
      sampleStep: step,
      pointCount,
    };
    const waveStyle: WaveStyle = {
      radiusRatio: p.radiusRatio,
      intensity: p.intensity,
      strokeWidth: p.strokeWidth,
      waveColor: p.waveColor,
      glowIntensity: p.glowIntensity,
      waveGradientMode: p.waveGradientMode,
      gradColor1: p.gradColor1,
      gradColor2: p.gradColor2,
    };

    // --- 1. FONDO CANVAS (z0) — solid color or bg image ---
    const fondoCanvas = fondoCanvasRef.current;
    const fondoCtx = fondoCtxRef.current;
    if (fondoCanvas && fondoCtx) {
      drawFondoCanvas(fondoCtx, fondoCanvas, p.bgColor, bgImageRef.current);
    }

    // --- 2. FRACTAL CANVAS (z1) — ripple/spiral/mandala ---
    const fractalCanvas = fractalCanvasRef.current;
    const fractalCtx = fractalCtxRef.current;
    if (fractalCanvas && fractalCtx) {
      if (p.fractalEnabled) {
        fractalCtx.clearRect(0, 0, fractalCanvas.width, fractalCanvas.height);
        fractalCtx.save();
        fractalCtx.globalAlpha = p.fractalOpacity;
        drawFractalBg(fractalCtx, fractalCanvas, p as FractalParams, getCurrentAmplitude());
        fractalCtx.restore();
      } else {
        fractalCtx.clearRect(0, 0, fractalCanvas.width, fractalCanvas.height);
      }
    }

    // --- 2b. INSTINCT CANVAS — instinct modes ---
    const instinctCanvas = instinctCanvasRef.current;
    const instinctCtx = instinctCtxRef.current;
    if (instinctCanvas && instinctCtx) {
      const ip = instinctParamsRef.current;
      if (ip.enabled) {
        const tempCanvas = tempCanvasRef.current;
        const tempCtx = tempCtxRef.current;
        if (tempCanvas && tempCtx) {
          const tw = instinctCanvas.width, th = instinctCanvas.height;
          if (tempCanvas.width !== tw || tempCanvas.height !== th) {
            tempCanvas.width = tw;
            tempCanvas.height = th;
          }
          tempCtx.clearRect(0, 0, tw, th);
          const fondoCanvasLocal = fondoCanvasRef.current;
          if (fondoCanvasLocal) tempCtx.drawImage(fondoCanvasLocal, 0, 0);
          const instIdx = layerOrder.indexOf("instinct");
          for (let i = 0; i < instIdx; i++) {
            const layer = layerOrder[i];
            if (layer === "fractal" && p.fractalEnabled) {
              const fc = fractalCanvasRef.current;
              if (fc) tempCtx.drawImage(fc, 0, 0);
            }
          }
        }
        instinctCtx.clearRect(0, 0, instinctCanvas.width, instinctCanvas.height);
        drawInstinctFractal(instinctCtx, instinctCanvas, {
          instinctMode: ip.mode,
          instinctSpeed: ip.speed,
          instinctStrength: ip.strength,
          instinctFrequency: ip.frequency,
          bgColor: p.bgColor,
          fractalAudioReactive: p.fractalAudioReactive,
        }, getCurrentAmplitude(), tempCanvasRef.current);
      } else {
        instinctCtx.clearRect(0, 0, instinctCanvas.width, instinctCanvas.height);
      }
    }

    // --- 3. WAVEFORM CANVAS (z2) — onda + tip + particles ---
    const shouldFade = audioEl.loop || (!isRecording && isLoopingUI);

    if (!hasClearedRef.current) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isRecording) {
        if (fondoCanvas) ctx.drawImage(fondoCanvas, 0, 0);
        for (const layer of layerOrder) {
          if (layer === "fractal" && p.fractalEnabled) {
            if (fractalCanvas) ctx.drawImage(fractalCanvas, 0, 0);
          } else if (layer === "instinct" && instinctParamsRef.current.enabled) {
            if (instinctCanvas) ctx.drawImage(instinctCanvas, 0, 0);
          }
        }
      }
      resetDrawingState();
      hasClearedRef.current = true;
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0, canvas, p, waveData);
    } else if (shouldFade) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isRecording) {
        if (fondoCanvas) ctx.drawImage(fondoCanvas, 0, 0);
        for (const layer of layerOrder) {
          if (layer === "fractal" && p.fractalEnabled) {
            if (fractalCanvas) ctx.drawImage(fractalCanvas, 0, 0);
          } else if (layer === "instinct" && instinctParamsRef.current.enabled) {
            if (instinctCanvas) ctx.drawImage(instinctCanvas, 0, 0);
          }
        }
      }
      resetDrawingState();
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0, canvas, p, waveData);
    } else if (isRecording) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (fondoCanvas) ctx.drawImage(fondoCanvas, 0, 0);
      for (const layer of layerOrder) {
        if (layer === "fractal" && p.fractalEnabled) {
          if (fractalCanvas) ctx.drawImage(fractalCanvas, 0, 0);
        } else if (layer === "instinct" && instinctParamsRef.current.enabled) {
          if (instinctCanvas) ctx.drawImage(instinctCanvas, 0, 0);
        }
      }
      resetDrawingState();
      lastDrawnPointIndexRef.current = 0;
      lastCurvePointRef.current = getPointXY(0, canvas, p, waveData);
    }

    if (head < lastDrawnPointIndexRef.current && shouldFade) {
      lastDrawnPointIndexRef.current = -1;
      lastCurvePointRef.current = null;
    }

    if (paramsRef.current.showWave) {
      const last = lastDrawnPointIndexRef.current;
      if (last < 0) {
        lastDrawnPointIndexRef.current = 0;
        lastCurvePointRef.current = getPointXY(0, canvas, p, waveData);
        if (head > 0) {
          lastCurvePointRef.current = drawAdditionalPath(ctx, canvas, 0, head, lastCurvePointRef.current, waveStyle, waveData);
        }
      } else if (head > last) {
        lastCurvePointRef.current = drawAdditionalPath(ctx, canvas, last, head, lastCurvePointRef.current, waveStyle, waveData);
        lastDrawnPointIndexRef.current = head;
      }
      lastTipRef.current = drawTip(ctx, canvas, progress01,
        { intensity: p.intensity, radiusRatio: p.radiusRatio, waveColor: p.waveColor },
        { monoSamples, totalSamples: totalSamplesRef.current, duration: durationRef.current },
        lastTipRef.current, p.showParticles);
      if (p.showParticles && (drawingModeRef.current === "preview" || drawingModeRef.current === "record") && lastTipRef.current) {
        emitParticles(particlesRef.current, lastTipRef.current.x, lastTipRef.current.y, 2);
      }
    }

    // --- 4. LETRAS CANVAS (z3) — Title ---
    const letrasCanvas = letrasCanvasRef.current;
    const letrasCtx = letrasCtxRef.current;
    if (letrasCanvas && letrasCtx) {
      if (isRecording) {
        drawTitle(ctx, canvas, p.songTitle, p.titleColor, p.titlePreset);
      } else {
        letrasCtx.clearRect(0, 0, letrasCanvas.width, letrasCanvas.height);
        drawTitle(letrasCtx, letrasCanvas, p.songTitle, p.titleColor, p.titlePreset);
      }
    }

    if (paramsRef.current.showParticles) updateAndDrawParticles(ctx, particlesRef.current, p.particleColor, p.particleOpacity);

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
    lastFrameTimeRef.current = performance.now();
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

      // Clear canvases inmediatamente para evitar destello de la onda anterior
      ensureCanvasContext();
      clearCanvasSolid();
      const fc = fondoCanvasRef.current;
      const fctx = fondoCtxRef.current;
      if (fc && fctx) {
        fctx.fillStyle = paramsRef.current.bgColor;
        fctx.fillRect(0, 0, fc.width, fc.height);
      }
      const fxc = fractalCanvasRef.current;
      const fxctx = fractalCtxRef.current;
      if (fxc && fxctx) {
        fxctx.clearRect(0, 0, fxc.width, fxc.height);
      }
      const lc = letrasCanvasRef.current;
      const lctx = letrasCtxRef.current;
      if (lc && lctx) {
        lctx.clearRect(0, 0, lc.width, lc.height);
      }

      // Forzar flush visual: asegura que el canvas limpio se pinte antes de continuar
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          ondaCtxRef.current?.getImageData(0, 0, 1, 1);
          resolve();
        });
      });

      await prepareAndPlay({ loop: isLoopingUI });
      syncAllCanvasSizes();
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

  const downloadBlob = (blob: Blob, extension = "webm", customName?: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = customName
      ? `${customName}.${extension}`
      : `audio-visualizer-${Date.now()}.${extension}`;
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
      const canvas = ondaCanvasRef.current;
      const audioEl = audioRef.current;
      const ctx = ondaCtxRef.current;
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

      const outName = fileName.replace(/\.[^.]+$/, '') + '_swr';
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

              if (isFFmpegLoaded()) {
                setConverting(true);
                setConvProgress(0);
                setConvLogs([]);
                setConvCurrentFrame(0);
                setConvTotalFrames(Math.ceil(durationRef.current * 30));
                try {
                  const mp4 = await convertToMp4(blob, {
                    onProgress: (pct) => setConvProgress(pct),
                    onLog: (msg) => {
                      setConvLogs(prev => [...prev.slice(-200), msg]);
                      const m = msg.match(/frame=\s*(\d+)/);
                      if (m) setConvCurrentFrame(parseInt(m[1], 10));
                    },
                  });
                  downloadBlob(mp4.blob, "mp4", outName);
                } catch (convertErr) {
                  console.warn("Fallback a webm por error en conversión:", convertErr);
                  downloadBlob(blob, "webm", outName);
                }
                setConverting(false);
              } else if (isFFmpegLoading()) {
                setConverting(true);
                setConvLogs(prev => [...prev, "⏳ FFmpeg está cargando, esperando..."]);
                setConvCurrentFrame(0);
                setConvTotalFrames(Math.ceil(durationRef.current * 30));
                console.log("[app] FFmpeg cargando, esperamos...");
                const ready = await waitForFFmpeg();
                if (ready) {
                  setConvLogs(prev => [...prev, "✓ FFmpeg listo, iniciando conversión..."]);
                  try {
                    const mp4 = await convertToMp4(blob, {
                      onProgress: (pct) => setConvProgress(pct),
                      onLog: (msg) => {
                        setConvLogs(prev => [...prev.slice(-200), msg]);
                        const m = msg.match(/frame=\s*(\d+)/);
                        if (m) setConvCurrentFrame(parseInt(m[1], 10));
                      },
                    });
                    downloadBlob(mp4.blob, "mp4", outName);
                  } catch (convertErr) {
                    console.warn("Fallback a webm:", convertErr);
                    downloadBlob(blob, "webm", outName);
                  }
                } else {
                  console.warn("[app] FFmpeg no pudo cargarse, fallback a webm");
                  downloadBlob(blob, "webm", outName);
                }
                setConverting(false);
              } else {
                console.warn("[app] FFmpeg no disponible, fallback a webm");
                downloadBlob(blob, "webm", outName);
              }
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

  const drawBgToFondoCanvas = () => {
    const fc = fondoCanvasRef.current;
    const fctx = fondoCtxRef.current;
    if (!fc || !fctx) return;
    syncAllCanvasSizes();
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
      drawBgToFondoCanvas();
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
        drawBgToFondoCanvas();
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
      drawBgToFondoCanvas();
      return;
    }
    setBgMode("image");
    const preset = BG_IMAGE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      bgImageRef.current = img;
      drawBgToFondoCanvas();
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
        drawBgToFondoCanvas();
        clearCanvasSolid();
      };
      img.src = canvas.toDataURL();
    };
    const img = new Image();
    img.onload = () => {
      setBgImage(img);
      bgImageRef.current = img;
      setBgImagePreset("1");
      drawBgToFondoCanvas();
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
      instinctMode, instinctSpeed, instinctStrength, instinctFrequency, instinctEnabled,
      showWave, waveColor, waveGradientMode, gradColor1, gradColor2,
      glowIntensity, showParticles, particleColor, particleOpacity,
      radiusRatio, intensity, strokeWidth,
      songTitle, titleColor, titlePreset,
      layerOrder,
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
    instinctMode, instinctSpeed, instinctStrength, instinctFrequency, instinctEnabled,
    showWave, waveColor, waveGradientMode, gradColor1, gradColor2,
    glowIntensity, showParticles, particleColor, particleOpacity,
    radiusRatio, intensity, strokeWidth,
    songTitle, titleColor, titlePreset, layerOrder, showToast]);

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
      if (saved.instinctMode !== undefined) setInstinctMode(saved.instinctMode);
      if (saved.instinctSpeed !== undefined) setInstinctSpeed(saved.instinctSpeed);
      if (saved.instinctStrength !== undefined) setInstinctStrength(saved.instinctStrength);
      if (saved.instinctFrequency !== undefined) setInstinctFrequency(saved.instinctFrequency);
      if (saved.instinctEnabled !== undefined) setInstinctEnabled(saved.instinctEnabled);
      if (saved.layerOrder !== undefined) setLayerOrder(saved.layerOrder);
      setWaveColor(saved.waveColor);
      setWaveGradientMode(saved.waveGradientMode);
      setGradColor1(saved.gradColor1);
      setGradColor2(saved.gradColor2);
      setGlowIntensity(saved.glowIntensity);
      setShowWave(saved.showWave ?? true);
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
    const validAudioExts = ["mp3", "wav", "ogg", "m4a", "flac", "aac", "wma", "aiff", "opus"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validAudioExts.includes(ext || "")) {
      setError("Formato no soportado. Usa MP3, WAV, OGG, M4A, FLAC, AAC, WMA, AIFF u OPUS.");
      return;
    }
    const url = URL.createObjectURL(file);
    audioObjectUrlRef.current = url;
    setAudioUrl(url);
    setFileName(file.name);
    setFileSize(file.size);

    await decodeAudioToMono(file);
  };

  useEffect(() => {
    ensureCanvasContext();
    initFFmpeg()
      .then(() => { console.log("[app] ✓ FFmpeg listo"); setFfmpegReady(true); })
      .catch(e => console.warn("[app] ✗ FFmpeg no disponible:", e));
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
        <aside className="w-full md:w-72 sidebar-surface flex flex-col">
            <IAAsistentPanel
              isActive={isIAAsistentActive}
              setIsActive={setIsIAAsistentActive}
              mode={iaMode}
              setMode={setIAMode}
              bpm={iaBpm}
              currentBeatIndex={iaBeatIndex}
              audioLoaded={waveformReady}
              waveformReady={waveformReady}
              previewCanvasRef={previewCanvasRef}
              volume={volume}
              setVolume={setVolume}
              isPreviewing={isPreviewing}
              isRecording={isRecording}
              isDecoding={isDecoding}
              handlePreview={handlePreview}
              stopAll={stopAll}
              isLoopingUI={isLoopingUI}
              setIsLoopingUI={setIsLoopingUI}
              audioUrl={audioUrl}
              audioRef={audioRef}
              onCollapseAll={() => setCollapsedSections(new Set(["audio", "presets", "wave", "bg", "fractal", "instinct", "particles", "text"]))}
              onResetDefaults={resetDefaults}
            />
          <div className="space-y-2 pr-1 overflow-y-auto flex-1 min-h-0">
            <AudioSection
              collapsed={collapsedSections.has("audio")}
              onToggle={() => toggleSection("audio")}
              fileInputRef={fileInputRef}
              isMobile={isMobile}
              isDecoding={isDecoding}
              isRecording={isRecording}
              isPreviewing={isPreviewing}
              onPickFile={onPickFile}
              fileMeta={fileMeta}
            />

            <PresetsSection
              collapsed={collapsedSections.has("presets")}
              onToggle={() => toggleSection("presets")}
              applyQuickPreset={applyQuickPreset}
              activePreset={activePreset}
              presetSavedKeys={presetSavedKeys}
              resetDefaults={resetDefaults}
              saveCurrentToActivePreset={saveCurrentToActivePreset}
            />

            <BgSection
              collapsed={collapsedSections.has("bg")}
              onToggle={() => toggleSection("bg")}
              bgMode={bgMode}
              handleBgModeChange={handleBgModeChange}
              activeBgPreset={activeBgPreset}
              applyBgPreset={applyBgPreset}
              bgColor={bgColor}
              setBgColor={setBgColor}
              setActiveBgPreset={setActiveBgPreset}
              bgImagePreset={bgImagePreset}
              handleBgImagePresetChange={handleBgImagePresetChange}
              bgImage={bgImage}
              onPickBgImage={onPickBgImage}
              BG_IMAGE_PRESETS={BG_IMAGE_PRESETS}
              isDecoding={isDecoding}
              isRecording={isRecording}
              isPreviewing={isPreviewing}
            />

            {layerOrder.map(layer => {
              switch (layer) {
                case "onda":
                  return (
                    <WaveSection key="onda"
                      collapsed={collapsedSections.has("wave")}
                      onToggle={() => toggleSection("wave")}
                      showWave={showWave}
                      setShowWave={setShowWave}
                      radiusRatio={radiusRatio}
                      setRadiusRatio={setRadiusRatio}
                      intensity={intensity}
                      setIntensity={setIntensity}
                      strokeWidth={strokeWidth}
                      setStrokeWidth={setStrokeWidth}
                      glowIntensity={glowIntensity}
                      setGlowIntensity={setGlowIntensity}
                      waveColor={waveColor}
                      setWaveColor={setWaveColor}
                      waveGradientMode={waveGradientMode}
                      setWaveGradientMode={setWaveGradientMode}
                      gradColor1={gradColor1}
                      setGradColor1={setGradColor1}
                      gradColor2={gradColor2}
                      setGradColor2={setGradColor2}
                      showParticles={showParticles}
                      setShowParticles={setShowParticles}
                      particleColor={particleColor}
                      setParticleColor={setParticleColor}
                      particleOpacity={particleOpacity}
                      setParticleOpacity={setParticleOpacity}
                      isDecoding={isDecoding}
                      isRecording={isRecording}
                      moveLayer={moveLayer}
                      layerOrder={layerOrder}
                    />
                  );
                case "fractal":
                  return (
                    <FractalSection key="fractal"
                      collapsed={collapsedSections.has("fractal")}
                      onToggle={() => toggleSection("fractal")}
                      fractalEnabled={fractalEnabled}
                      setFractalEnabled={setFractalEnabled}
                      fractalType={fractalType}
                      setFractalType={setFractalType}
                      fractalLayerMode={fractalLayerMode}
                      fractalOpacity={fractalOpacity}
                      setFractalOpacity={setFractalOpacity}
                      fractalAudioReactive={fractalAudioReactive}
                      setFractalAudioReactive={setFractalAudioReactive}
                      rippleRingCount={rippleRingCount}
                      setRippleRingCount={setRippleRingCount}
                      rippleSpeed={rippleSpeed}
                      setRippleSpeed={setRippleSpeed}
                      rippleAmplitude={rippleAmplitude}
                      setRippleAmplitude={setRippleAmplitude}
                      rippleThickness={rippleThickness}
                      setRippleThickness={setRippleThickness}
                      rippleColor1={rippleColor1}
                      setRippleColor1={setRippleColor1}
                      rippleColor2={rippleColor2}
                      setRippleColor2={setRippleColor2}
                      spiralDensity={spiralDensity}
                      setSpiralDensity={setSpiralDensity}
                      spiralRotationSpeed={spiralRotationSpeed}
                      setSpiralRotationSpeed={setSpiralRotationSpeed}
                      spiralTightness={spiralTightness}
                      setSpiralTightness={setSpiralTightness}
                      spiralDotSize={spiralDotSize}
                      setSpiralDotSize={setSpiralDotSize}
                      spiralColor1={spiralColor1}
                      setSpiralColor1={setSpiralColor1}
                      spiralColor2={spiralColor2}
                      setSpiralColor2={setSpiralColor2}
                      mandalaSegments={mandalaSegments}
                      setMandalaSegments={setMandalaSegments}
                      mandalaRotationSpeed={mandalaRotationSpeed}
                      setMandalaRotationSpeed={setMandalaRotationSpeed}
                      mandalaComplexity={mandalaComplexity}
                      setMandalaComplexity={setMandalaComplexity}
                      mandalaLineWidth={mandalaLineWidth}
                      setMandalaLineWidth={setMandalaLineWidth}
                      mandalaColor1={mandalaColor1}
                      setMandalaColor1={setMandalaColor1}
                      mandalaColor2={mandalaColor2}
                      setMandalaColor2={setMandalaColor2}
                      fractalPreviewRef={fractalPreviewRef}
                      isDecoding={isDecoding}
                      isRecording={isRecording}
                      moveLayer={moveLayer}
                      layerOrder={layerOrder}
                    />
                  );
                case "instinct":
                  return (
                    <InstinctSection key="instinct"
                      collapsed={collapsedSections.has("instinct")}
                      onToggle={() => toggleSection("instinct")}
                      instinctEnabled={instinctEnabled}
                      setInstinctEnabled={setInstinctEnabled}
                      instinctMode={instinctMode}
                      setInstinctMode={setInstinctMode}
                      instinctSpeed={instinctSpeed}
                      setInstinctSpeed={setInstinctSpeed}
                      instinctStrength={instinctStrength}
                      setInstinctStrength={setInstinctStrength}
                      instinctFrequency={instinctFrequency}
                      setInstinctFrequency={setInstinctFrequency}
                      instinctPreviewRef={instinctPreviewRef}
                      isDecoding={isDecoding}
                      isRecording={isRecording}
                      moveLayer={moveLayer}
                      layerOrder={layerOrder}
                    />
                  );
                case "letras":
                  return (
                    <TextSection key="letras"
                      collapsed={collapsedSections.has("text")}
                      onToggle={() => toggleSection("text")}
                      songTitle={songTitle}
                      setSongTitle={setSongTitle}
                      titlePreset={titlePreset}
                      setTitlePreset={setTitlePreset}
                      titleColor={titleColor}
                      setTitleColor={setTitleColor}
                      moveLayer={moveLayer}
                      layerOrder={layerOrder}
                    />
                  );
                default:
                  return null;
              }
            })}

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

            {/* Conversion progress overlay */}
            <ConversionProgress
              progress={convProgress}
              logs={convLogs}
              visible={converting}
              currentFrame={convCurrentFrame}
              totalFrames={convTotalFrames}
            />
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
          <ExportSection
            resolution={resolution}
            setResolution={setResolution}
            isExporting={isExporting}
            isDecoding={isDecoding}
            isRecording={isRecording}
            audioUrl={audioUrl}
            waveformReady={waveformReady}
            handleGenerateAndDownloadRealtime={handleGenerateAndDownloadRealtime}
          />
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-bold text-gradient-soft tracking-tight">Visualizador</div>
            <div className="text-xs text-slate-400">Ajusta parámetros en vivo</div>
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-2 shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.18)]">
            <div className="relative w-full aspect-square">
              <canvas ref={fondoCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ zIndex: 0 }} />
              <canvas ref={fractalCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ zIndex: layerZIndex["fractal"] ?? 1 }} />
              <canvas ref={instinctCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ zIndex: layerZIndex["instinct"] ?? 1 }} />
              <canvas ref={ondaCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg"
                style={{ zIndex: layerZIndex["onda"] ?? 2 }} />
              <canvas ref={letrasCanvasRef}
                className="absolute inset-0 w-full h-full rounded-lg pointer-events-none"
                style={{ zIndex: layerZIndex["letras"] ?? 3 }} />
              <canvas ref={tempCanvasRef} className="hidden" />
            </div>
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
      </div>
    </section>
  );
}