import { useCallback, useEffect, useRef, useState } from "react";
import type { FractalType } from "../utils/fractals";
import type { InstinctMode } from "../utils/instinct";
import { detectBPM } from "../utils/audio";

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
