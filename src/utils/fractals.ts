export type FractalType = "ripple" | "spiral" | "mandala";

export interface FractalParams {
  fractalType: FractalType;
  fractalAudioReactive: boolean;
  rippleRingCount: number;
  rippleSpeed: number;
  rippleAmplitude: number;
  rippleThickness: number;
  rippleColor1: string;
  rippleColor2: string;
  spiralDensity: number;
  spiralRotationSpeed: number;
  spiralTightness: number;
  spiralDotSize: number;
  spiralColor1: string;
  spiralColor2: string;
  mandalaSegments: number;
  mandalaRotationSpeed: number;
  mandalaComplexity: number;
  mandalaLineWidth: number;
  mandalaColor1: string;
  mandalaColor2: string;
  bgColor: string;
}

export const TWO_PI = Math.PI * 2;
export const GOLDEN_ANGLE = 2.399963229728653;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "").trim();
  const full =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = clamp(alpha, 0, 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function drawRippleFractal(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: FractalParams,
  amp: number
) {
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
    const waveFreq = Math.round(4 + i * 1.8);

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
}

export function drawSpiralFractal(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: FractalParams,
  amp: number
) {
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy) * 0.95;

  const density = p.spiralDensity;
  const now = performance.now() / 1000;

  const rotationSpeed = p.spiralRotationSpeed * (p.fractalAudioReactive ? (0.7 + amp * 0.15) : 1);
  const scale = p.spiralTightness * maxR * 0.06 * (0.6 + amp * 0.8);
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
}

export function drawMandalaFractal(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: FractalParams,
  amp: number
) {
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
  ctx.rotate(now * rotationSpeed * 0.15);
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
}

export function drawFractalBackground(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: FractalParams,
  amp: number
) {
  switch (p.fractalType) {
    case "ripple":
      drawRippleFractal(ctx, canvas, p, amp);
      break;
    case "spiral":
      drawSpiralFractal(ctx, canvas, p, amp);
      break;
    case "mandala":
      drawMandalaFractal(ctx, canvas, p, amp);
      break;
  }
}

export function drawFractalPreview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fractalType: FractalType,
  p: FractalParams
) {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy) * 0.9;

  ctx.clearRect(0, 0, w, h);

  switch (fractalType) {
    case "ripple": {
      const count = p.rippleRingCount;
      const thick = p.rippleThickness;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const r = maxR * (0.1 + t * 0.9);
        ctx.lineWidth = Math.max(0.5, thick * (0.5 + t * 0.5) * (w / 200));
        ctx.strokeStyle = hexToRgba(i % 2 === 0 ? p.rippleColor1 : p.rippleColor2, 0.3 + t * 0.7);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TWO_PI);
        ctx.stroke();
      }
      break;
    }
    case "spiral": {
      const density = p.spiralDensity;
      const s = p.spiralTightness * maxR * 0.06;
      const dotSize = p.spiralDotSize;
      for (let i = 0; i < density; i++) {
        const angle = i * GOLDEN_ANGLE;
        const r = Math.sqrt(i) * s;
        if (r > maxR) break;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const t = i / density;
        ctx.fillStyle = hexToRgba(t < 0.5 ? p.spiralColor1 : p.spiralColor2, 0.2 + t * 0.8);
        const sz = Math.max(0.5, dotSize * (0.2 + t * 0.8)) * (w / 200);
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, TWO_PI);
        ctx.fill();
      }
      break;
    }
    case "mandala": {
      const segments = p.mandalaSegments;
      const complexity = p.mandalaComplexity;
      const lineWidth = p.mandalaLineWidth;
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
          ctx.strokeStyle = hexToRgba(c % 2 === 0 ? p.mandalaColor1 : p.mandalaColor2, 0.2 + t * 0.8);
          ctx.beginPath();
          ctx.arc(0, 0, r, -halfArc, halfArc);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
      break;
    }
  }
}
