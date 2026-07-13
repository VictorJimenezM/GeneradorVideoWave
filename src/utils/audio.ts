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

export function detectBPM(samples: Float32Array, sampleRate: number): number {
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
