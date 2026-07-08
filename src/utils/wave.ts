import { clamp, TWO_PI } from "./fractals";

export type Point = { x: number; y: number };

export type WaveData = {
  monoSamples: Float32Array;
  cosArr: Float32Array;
  sinArr: Float32Array;
  totalSamples: number;
  sampleStep: number;
  pointCount: number;
};

export type WaveStyle = {
  radiusRatio: number;
  intensity: number;
  strokeWidth: number;
  waveColor: string;
  glowIntensity: number;
  waveGradientMode: "solid" | "gradient" | "rainbow";
  gradColor1: string;
  gradColor2: string;
};

export const fftLikePointsPerCircle = 2600;

export function getPointXY(
  pointIndex: number,
  canvas: HTMLCanvasElement,
  style: { radiusRatio: number; intensity: number },
  data: { monoSamples: Float32Array; cosArr: Float32Array; sinArr: Float32Array; totalSamples: number; sampleStep: number }
): Point {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const rMin = Math.min(cx, cy);

  const step = data.sampleStep;
  const sampleIdx = clamp(pointIndex * step, 0, data.totalSamples - 1);
  const amp = data.monoSamples[sampleIdx] ?? 0;

  const radiusBase = rMin * style.radiusRatio;
  const radiusAmp = radiusBase * style.intensity;
  const r = radiusBase + amp * radiusAmp;

  return {
    x: cx + r * data.cosArr[pointIndex],
    y: cy + r * data.sinArr[pointIndex],
  };
}

export function drawAdditionalPath(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  fromPoint: number,
  toPoint: number,
  lastCurvePoint: Point | null,
  style: WaveStyle,
  data: WaveData
): Point | null {
  if (toPoint <= fromPoint) return lastCurvePoint;

  const buildPoints = () => {
    const points: Point[] = [];
    let prev = lastCurvePoint;
    if (!prev) {
      prev = getPointXY(fromPoint, canvas, style, data);
    }
    points.push(prev);
    for (let i = fromPoint + 1; i <= toPoint; i++) {
      const p = getPointXY(i, canvas, style, data);
      const midX = (prev.x + p.x) / 2;
      const midY = (prev.y + p.y) / 2;
      points.push({ x: midX, y: midY });
      points.push(p);
      prev = p;
    }
    return { points, last: prev };
  };

  const { points, last } = buildPoints();

  // Glow pass (behind)
  if (style.glowIntensity > 0.01) {
    ctx.save();
    ctx.shadowBlur = 25 * style.glowIntensity;
    ctx.shadowColor = style.waveColor;
    ctx.lineWidth = Math.max(1, (style.strokeWidth + 2) * style.glowIntensity);
    ctx.strokeStyle = style.waveColor;
    ctx.globalAlpha = 0.25 * style.glowIntensity;
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
  ctx.lineWidth = Math.max(0.1, style.strokeWidth);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (style.waveGradientMode === "gradient") {
    const grad = ctx.createLinearGradient(
      canvas.width * 0.2, canvas.height * 0.2,
      canvas.width * 0.8, canvas.height * 0.8
    );
    grad.addColorStop(0, style.gradColor1);
    grad.addColorStop(1, style.gradColor2);
    ctx.strokeStyle = grad;
  } else if (style.waveGradientMode === "rainbow") {
    const grad = ctx.createConicGradient(0, canvas.width / 2, canvas.height / 2);
    for (let h = 0; h <= 360; h += 30) {
      grad.addColorStop(h / 360, `hsl(${h}, 80%, 60%)`);
    }
    ctx.strokeStyle = grad;
  } else {
    ctx.strokeStyle = style.waveColor;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();

  return last;
}

export type TipState = { x: number; y: number; r: number };

export function drawTip(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  progress01: number,
  style: { intensity: number; radiusRatio: number; waveColor: string },
  data: { monoSamples: Float32Array; totalSamples: number; duration: number },
  lastTip: TipState | null,
  showParticles: boolean
): TipState {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const rMin = Math.min(cx, cy);

  const headAngle = progress01 * TWO_PI - Math.PI / 2;
  const headSampleIndex = Math.floor(progress01 * (data.totalSamples - 1));
  const amp = data.monoSamples[headSampleIndex] ?? 0;

  const radiusBase = rMin * style.radiusRatio;
  const radiusAmp = radiusBase * style.intensity;
  const rTip = radiusBase + amp * radiusAmp;

  const x = cx + rTip * Math.cos(headAngle);
  const y = cy + rTip * Math.sin(headAngle);

  const tipRadius = Math.max(2, Math.min(10, (ctx.lineWidth || 4) * 0.9));

  // Clear previous tip only if particles are active
  if (lastTip && showParticles) {
    const prev = lastTip;
    const r = prev.r + 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(prev.x, prev.y, r, 0, TWO_PI);
    ctx.clip();
    ctx.clearRect(prev.x - r, prev.y - r, r * 2, r * 2);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = style.waveColor;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(x, y, tipRadius, 0, TWO_PI);
  ctx.fill();
  ctx.restore();

  return { x, y, r: tipRadius };
}

export function drawStaticWaveform(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  data: { monoSamples: Float32Array; cosArr: Float32Array; sinArr: Float32Array; totalSamples: number; sampleStep: number; pointCount: number }
) {
  const monoSamples = data.monoSamples;
  const cosArr = data.cosArr;
  const sinArr = data.sinArr;
  if (!monoSamples || !cosArr || !sinArr) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, rMin = Math.min(cx, cy);
  const step = data.sampleStep;
  const totalSamples = data.totalSamples;
  if (!totalSamples) return;
  const radiusBase = rMin * 0.4;
  const radiusAmp = radiusBase * 0.3;
  const pc = data.pointCount;
  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (let i = 0; i < pc; i++) {
    const sampleIdx = Math.min(i * step, totalSamples - 1);
    const amp = monoSamples[sampleIdx] ?? 0;
    const r = radiusBase + amp * radiusAmp;
    const x = cx + r * cosArr[i];
    const y = cy + r * sinArr[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}
