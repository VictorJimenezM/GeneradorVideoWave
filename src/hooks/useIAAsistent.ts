import { useCallback, useEffect, useRef, useState } from "react";

export type IAIAssistantMode = "aggressive" | "sensitive";

export interface ControlSetters {
  setIntensity: (v: number) => void;
  setStrokeWidth: (v: number) => void;
  setWaveColor: (v: string) => void;
  setGlowIntensity: (v: number) => void;
  setWaveGradientMode: (v: "solid" | "gradient" | "rainbow") => void;
  setGradColor1: (v: string) => void;
  setGradColor2: (v: string) => void;
  setRadiusRatio: (v: number) => void;
  setBgMode: (v: "color" | "image" | "fractal") => void;
  setBgColor: (v: string) => void;
  setFractalEnabled: (v: boolean) => void;
  setFractalType: (v: "ripple" | "spiral" | "mandala") => void;
  setFractalLayerMode: (v: "replace" | "overlay") => void;
  setFractalOpacity: (v: number) => void;
  setRippleSpeed: (v: number) => void;
  setRippleAmplitude: (v: number) => void;
  setRippleThickness: (v: number) => void;
  setRippleColor1: (v: string) => void;
  setRippleColor2: (v: string) => void;
  setSpiralRotationSpeed: (v: number) => void;
  setSpiralTightness: (v: number) => void;
  setSpiralDotSize: (v: number) => void;
  setSpiralColor1: (v: string) => void;
  setMandalaRotationSpeed: (v: number) => void;
  setMandalaLineWidth: (v: number) => void;
  setMandalaColor1: (v: string) => void;
  setShowParticles: (v: boolean) => void;
  setParticleColor: (v: string) => void;
  setParticleOpacity: (v: number) => void;
}

export interface IAConfig {
  monoSamples: Float32Array | null;
  sampleRate: number;
  duration: number;
  setters: ControlSetters;
}

export interface IAReturn {
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  mode: IAIAssistantMode;
  setMode: (m: IAIAssistantMode) => void;
  bpm: number | null;
  currentBeatIndex: number;
  update: (currentTime: number, amplitude: number) => void;
}

function detectBPM(samples: Float32Array, sampleRate: number): number {
  const windowSize = 2048;
  const hopSize = 512;

  const energy: number[] = [];
  for (let i = 0; i < samples.length - windowSize; i += hopSize) {
    let sumSq = 0;
    for (let j = 0; j < windowSize; j++) {
      sumSq += samples[i + j] * samples[i + j];
    }
    energy.push(Math.sqrt(sumSq / windowSize));
  }

  if (energy.length < 10) return 120;

  const onset: number[] = [];
  for (let i = 1; i < energy.length; i++) {
    onset.push(Math.max(0, energy[i] - energy[i - 1]));
  }

  const minBPM = 70;
  const maxBPM = 200;
  const minLag = Math.max(1, Math.floor(((60 / maxBPM) * sampleRate) / hopSize));
  const maxLag = Math.min(onset.length - 1, Math.ceil(((60 / minBPM) * sampleRate) / hopSize));

  let bestLag = minLag;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < onset.length - lag; i++) {
      corr += onset[i] * onset[i + lag];
      count++;
    }
    corr /= count;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  const bpm = Math.round(60 / ((bestLag * hopSize) / sampleRate));
  return Math.max(70, Math.min(200, bpm));
}

const WAVE_COLORS = [
  "#00FFFF", "#FF00FF", "#FFFF00", "#00FF00", "#FF0000",
  "#FF8800", "#FF1493", "#BF00FF", "#32CD32", "#00CED1",
  "#FF4500", "#7FFF00", "#FF69B4", "#1E90FF", "#FFD700",
];

const BG_COLORS = [
  "#020617", "#0f172a", "#1e1b4b", "#2d1b2e", "#1c1917",
  "#042f2e", "#1a0a2e", "#0a1628", "#2e0a1a", "#2e1a0a",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function applyBeatChanges(
  beatIndex: number,
  mode: IAIAssistantMode,
  s: ControlSetters,
) {
  const per2 = mode === "aggressive" ? 0.7 : 0.25;
  const per4 = mode === "aggressive" ? 0.85 : 0.45;
  const per8 = mode === "aggressive" ? 1.0 : 0.7;
  const per16 = mode === "aggressive" ? 1.0 : 0.9;

  if (beatIndex % 4 === 0 && Math.random() < per4) {
    s.setWaveColor(pick(WAVE_COLORS));
    if (Math.random() < 0.5) {
      s.setWaveGradientMode(pick(["solid", "gradient", "rainbow"]) as "solid" | "gradient" | "rainbow");
    }
    if (Math.random() < 0.4) {
      s.setGradColor1(pick(WAVE_COLORS));
      s.setGradColor2(pick(WAVE_COLORS));
    }
    if (Math.random() < 0.5) {
      s.setShowParticles(Math.random() > 0.4);
    }
    if (Math.random() < 0.4) {
      s.setParticleColor(pick(WAVE_COLORS));
    }
  }

  if (beatIndex > 0 && beatIndex % 8 === 0 && Math.random() < per8) {
    s.setFractalEnabled(Math.random() > 0.2);
    s.setFractalType(pick(["ripple", "spiral", "mandala"]));
    s.setRippleSpeed(rnd(0.3, 1.5));
    s.setRippleAmplitude(rnd(10, 50));
    s.setRippleThickness(rnd(3.0, 6.0));
    s.setRippleColor1(pick(WAVE_COLORS));
  }

  if (beatIndex > 0 && beatIndex % 16 === 0 && Math.random() < per16) {
    s.setSpiralRotationSpeed(rnd(0.1, 0.6));
    s.setSpiralTightness(rnd(0.1, 0.4));
    s.setSpiralDotSize(rnd(4, 6));
    s.setMandalaRotationSpeed(rnd(0.3, 1.5));
    s.setMandalaLineWidth(rnd(3.0, 5.0));
    s.setFractalOpacity(rnd(0.4, 1.0));
    if (Math.random() < 0.4) {
      s.setSpiralColor1(pick(WAVE_COLORS));
      s.setMandalaColor1(pick(WAVE_COLORS));
    }
  }
}

export function useIAAsistent(config: IAConfig): IAReturn {
  const { monoSamples, sampleRate, duration, setters } = config;

  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<IAIAssistantMode>("aggressive");
  const [bpm, setBpm] = useState<number | null>(null);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1);

  const settersRef = useRef(setters);
  settersRef.current = setters;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const bpmRef = useRef(120);
  const beatCountRef = useRef(-1);
  const lastBeatTimeRef = useRef(-1);

  useEffect(() => {
    if (!isActive || !monoSamples || !sampleRate || !duration) {
      setBpm(null);
      setCurrentBeatIndex(-1);
      beatCountRef.current = -1;
      lastBeatTimeRef.current = -1;
      return;
    }

    const detectedBpm = detectBPM(monoSamples, sampleRate);
    setBpm(detectedBpm);
    bpmRef.current = detectedBpm;
    beatCountRef.current = -1;
    lastBeatTimeRef.current = -1;
    setCurrentBeatIndex(-1);
  }, [isActive, monoSamples, sampleRate, duration]);

  const update = useCallback((currentTime: number, amplitude: number) => {
    const b = bpmRef.current;
    if (b <= 0) return;

    const baseInterval = 60 / b;

    let beatInterval = baseInterval;
    if (amplitude > 0.5) {
      beatInterval = baseInterval / 2;
    } else if (amplitude < 0.2) {
      beatInterval = baseInterval * 2;
    }

    if (lastBeatTimeRef.current < 0) {
      lastBeatTimeRef.current = currentTime;
      return;
    }

    if (currentTime < lastBeatTimeRef.current - 0.5) {
      lastBeatTimeRef.current = currentTime;
      beatCountRef.current = -1;
      setCurrentBeatIndex(-1);
      return;
    }

    if (currentTime - lastBeatTimeRef.current >= beatInterval) {
      beatCountRef.current += 1;
      lastBeatTimeRef.current += beatInterval;
      const beatIdx = beatCountRef.current;

      setCurrentBeatIndex(beatIdx);
      applyBeatChanges(beatIdx, modeRef.current, settersRef.current);
    }
  }, []);

  return {
    isActive,
    setIsActive,
    mode,
    setMode,
    bpm,
    currentBeatIndex,
    update,
  };
}
