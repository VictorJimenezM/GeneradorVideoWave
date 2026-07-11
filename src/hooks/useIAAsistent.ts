import { useCallback, useEffect, useRef, useState } from "react";
import type { FractalType } from "../utils/fractals";
import type { InstinctMode } from "../utils/instinct";

export type IAIAssistantMode = "aggressive" | "sensitive";

export interface ControlSetters {
  onApplyWavePreset: (idx: number) => void;
  wavePresetCount: number;
  onApplyTextPreset: (idx: number) => void;
  textPresetCount: number;
  setFractalType: (v: FractalType) => void;
  fractalTypeCount: number;
  setInstinctMode: (v: InstinctMode) => void;
  instinctModeCount: number;
  setFractalEnabled: (v: boolean) => void;
  setInstinctEnabled: (v: boolean) => void;
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

function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function applyBeatChanges(
  beatIndex: number,
  mode: IAIAssistantMode,
  s: ControlSetters,
) {
  const per4 = mode === "aggressive" ? 0.85 : 0.45;
  const per8 = mode === "aggressive" ? 1.0 : 0.7;

  if (beatIndex % 4 === 0 && Math.random() < per4) {
    s.onApplyWavePreset(randInt(s.wavePresetCount));
    s.onApplyTextPreset(randInt(s.textPresetCount));
  }

  if (beatIndex > 0 && beatIndex % 8 === 0 && Math.random() < per8) {
    s.setFractalType(["ripple", "spiral", "mandala"][randInt(s.fractalTypeCount)] as FractalType);
    s.setInstinctEnabled(true);
    s.setInstinctMode(["water", "organic", "fragments", "ifs"][randInt(s.instinctModeCount)] as InstinctMode);
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
