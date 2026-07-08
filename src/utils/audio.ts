import { clamp, TWO_PI } from "./fractals";

export interface PrecomputedGeometry {
  cosArr: Float32Array;
  sinArr: Float32Array;
  step: number;
  pointCount: number;
}

export function buildPrecomputedGeometry(totalSamples: number, fftLikePointsPerCircle: number): PrecomputedGeometry | null {
  if (!totalSamples || totalSamples < 2) return null;

  const step = Math.max(1, Math.floor(totalSamples / fftLikePointsPerCircle));
  const pc = Math.max(1, Math.ceil(totalSamples / step));

  const cosArr = new Float32Array(pc);
  const sinArr = new Float32Array(pc);
  for (let i = 0; i < pc; i++) {
    const sampleIdx = i * step;
    const theta = (sampleIdx / totalSamples) * TWO_PI - Math.PI / 2;
    cosArr[i] = Math.cos(theta);
    sinArr[i] = Math.sin(theta);
  }

  return { cosArr, sinArr, step, pointCount: pc };
}

export function getCurrentAmplitude(
  monoSamples: Float32Array | null,
  audioEl: HTMLAudioElement | null,
  totalSamples: number,
  duration: number
): number {
  if (!monoSamples || !audioEl || !totalSamples || !duration) return 0;
  const progress = clamp((audioEl.currentTime || 0) / duration, 0, 1);
  const centerIdx = Math.floor(progress * (totalSamples - 1));
  const halfWin = 256;
  const start = Math.max(0, centerIdx - halfWin);
  const end = Math.min(totalSamples - 1, centerIdx + halfWin);
  let sum = 0;
  for (let i = start; i <= end; i++) sum += Math.abs(monoSamples[i]);
  return sum / (end - start + 1);
}
