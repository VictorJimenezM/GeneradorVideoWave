import { clamp, hexToRgba, TWO_PI, GOLDEN_ANGLE } from "./fractals";

export type InstinctMode = "water" | "organic" | "fragments" | "ifs";

export interface InstinctParams {
  instinctMode: InstinctMode;
  instinctSpeed: number;
  instinctStrength: number;
  instinctFrequency: number;
  bgColor: string;
  fractalAudioReactive: boolean;
}

function drawInstinctWater(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: InstinctParams,
  amp: number,
  bgCanvas: HTMLCanvasElement | null
) {
  if (!bgCanvas) return;
  ctx.drawImage(bgCanvas, 0, 0);

  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  const now = performance.now() / 1000;
  const speed = p.instinctSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.5) : 1);
  const strength = p.instinctStrength * (p.fractalAudioReactive ? (0.3 + amp * 0.7) : 1);
  const freq = p.instinctFrequency;

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      const dx = Math.sin(y * freq + now * speed) * strength
        + Math.cos(x * freq * 0.5 + now * speed * 0.7) * strength * 0.6
        + Math.sin((x + y) * freq * 0.3 + now * speed * 0.4) * strength * 0.4;
      const dy = Math.cos(x * freq + now * speed * 0.9) * strength
        + Math.sin(y * freq * 0.6 + now * speed * 0.5) * strength * 0.6
        + Math.cos((x - y) * freq * 0.3 + now * speed * 1.1) * strength * 0.4;

      const srcX = clamp(Math.round(x + dx), 0, w - 1);
      const srcY = clamp(Math.round(y + dy), 0, h - 1);

      const srcIdx = (srcY * w + srcX) * 4;
      const dstIdx = (rowOff + x) * 4;

      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = 255;
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(new ImageData(output, w, h), 0, 0);
}

function drawInstinctOrganic(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: InstinctParams,
  amp: number,
  bgCanvas: HTMLCanvasElement | null
) {
  if (!bgCanvas) return;
  ctx.drawImage(bgCanvas, 0, 0);

  const w = canvas.width, h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  const now = performance.now() / 1000;
  const speed = p.instinctSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.5) : 1);
  const attract = p.instinctStrength * 2 * (p.fractalAudioReactive ? (0.3 + amp * 0.7) : 1);
  const blobCount = Math.floor(4 + p.instinctFrequency * 60);

  const blobs: Array<{ x: number; y: number; r: number }> = [];
  for (let i = 0; i < blobCount; i++) {
    const phase = i * GOLDEN_ANGLE + now * speed * 0.3;
    blobs.push({
      x: w * (0.5 + 0.45 * Math.sin(phase * 0.7 + i * 0.5)),
      y: h * (0.5 + 0.45 * Math.cos(phase * 0.5 + i * 0.7)),
      r: attract * (0.3 + 0.7 * Math.abs(Math.sin(phase * 0.2 + i))),
    });
  }

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    for (let x = 0; x < w; x++) {
      let dx = 0, dy = 0;
      for (const b of blobs) {
        const rx = b.x - x;
        const ry = b.y - y;
        const dist = Math.sqrt(rx * rx + ry * ry);
        if (dist < b.r && dist > 0.5) {
          const force = (1 - dist / b.r) * attract * 0.3;
          dx += (rx / dist) * force;
          dy += (ry / dist) * force;
        }
      }

      const srcX = clamp(Math.round(x + dx), 0, w - 1);
      const srcY = clamp(Math.round(y + dy), 0, h - 1);

      const srcIdx = (srcY * w + srcX) * 4;
      const dstIdx = (rowOff + x) * 4;

      output[dstIdx] = data[srcIdx];
      output[dstIdx + 1] = data[srcIdx + 1];
      output[dstIdx + 2] = data[srcIdx + 2];
      output[dstIdx + 3] = 255;
    }
  }

  ctx.clearRect(0, 0, w, h);
  ctx.putImageData(new ImageData(output, w, h), 0, 0);
}

function drawInstinctFragments(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: InstinctParams,
  amp: number,
  bgCanvas: HTMLCanvasElement | null
) {
  if (!bgCanvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;
  const now = performance.now() / 1000;
  const speed = p.instinctSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.5) : 1);
  const strength = p.instinctStrength * 1.5;
  const stripCount = Math.max(4, Math.floor(6 + p.instinctFrequency * 200));
  const stripW = Math.ceil(w / stripCount);

  for (let i = 0; i < stripCount; i++) {
    const phase = i * 1.1 + now * speed;
    const offsetY = Math.sin(phase) * strength;
    const offsetX = Math.cos(phase * 0.7 + i * 0.5) * strength * 0.3;

    const sx = clamp(i * stripW + offsetX, 0, w - stripW);
    const sw = Math.min(stripW, w - sx);
    const drawX = i * stripW;

    ctx.drawImage(bgCanvas, sx, 0, sw, h, drawX, offsetY, sw, h);
  }
}

function drawInstinctIFS(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: InstinctParams,
  amp: number,
  bgCanvas: HTMLCanvasElement | null
) {
  if (!bgCanvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2;
  const now = performance.now() / 1000;
  const speed = p.instinctSpeed * (p.fractalAudioReactive ? (0.5 + amp * 0.5) : 1);
  const spread = p.instinctStrength;
  const levels = clamp(Math.floor(2 + p.instinctFrequency * 30), 2, 5);

  function drawLevel(lvl: number, tx: number, ty: number, sc: number, rot: number) {
    if (lvl <= 0 || sc < 0.05) return;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(cx, cy) * 0.95, 0, TWO_PI);
    ctx.clip();
    ctx.drawImage(bgCanvas!, 0, 0);
    ctx.restore();

    const ns = sc * 0.45;
    const nr = rot + 0.3 + Math.sin(now * speed * 0.2 + lvl) * 0.2;
    const s = spread * 0.5 * lvl;
    const angle = now * speed * 0.15 + lvl;

    drawLevel(lvl - 1, tx + s * Math.cos(angle), ty + s * Math.sin(angle), ns, nr);
    drawLevel(lvl - 1, tx - s * Math.cos(angle + 1), ty - s * Math.sin(angle + 1), ns, -nr);
  }

  drawLevel(levels, cx, cy, 1, now * speed * 0.1);
}

export function drawInstinctFractal(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  p: InstinctParams,
  amp: number,
  bgCanvas: HTMLCanvasElement | null
) {
  switch (p.instinctMode) {
    case "water":
      drawInstinctWater(ctx, canvas, p, amp, bgCanvas);
      break;
    case "organic":
      drawInstinctOrganic(ctx, canvas, p, amp, bgCanvas);
      break;
    case "fragments":
      drawInstinctFragments(ctx, canvas, p, amp, bgCanvas);
      break;
    case "ifs":
      drawInstinctIFS(ctx, canvas, p, amp, bgCanvas);
      break;
  }
}

export function drawInstinctPreview(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: InstinctParams
) {
  const cx = w / 2, cy = h / 2;
  const maxR = Math.min(cx, cy) * 0.9;

  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
  gradient.addColorStop(0, hexToRgba("#6366f1", 0.8));
  gradient.addColorStop(0.5, hexToRgba("#a855f7", 0.5));
  gradient.addColorStop(1, hexToRgba(p.bgColor, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  const mode = p.instinctMode;
  ctx.save();
  ctx.font = "6px monospace";
  ctx.fillStyle = "#ffffff88";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const labels: Record<string, string> = {
    water: "~W~",
    organic: "\u2668",
    fragments: "\u2225",
    ifs: "\u25C3",
  };
  ctx.fillText(labels[mode] || "?", cx, cy);

  ctx.strokeStyle = hexToRgba("#ffffff", 0.3);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.restore();
}
