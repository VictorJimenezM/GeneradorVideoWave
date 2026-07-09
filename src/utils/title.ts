export type TitlePreset = {
  id: string;
  label: string;
  font: string;
  weight: string;
  size: number;
  align: string;
  valign: string;
  y: number;
  x?: number;
};

export const TITLE_PRESETS: TitlePreset[] = [
  { id: "bottom-center", label: "Inferior centro", font: "Arial, sans-serif", weight: "bold", size: 0.035, align: "center", valign: "bottom", y: 0.93 },
  { id: "bottom-left", label: "Inferior izquierda", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "left", valign: "bottom", y: 0.93, x: 0.04 },
  { id: "bottom-right", label: "Inferior derecha", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "right", valign: "bottom", y: 0.93, x: 0.96 },
  { id: "center-big", label: "Centro grande", font: "Verdana, sans-serif", weight: "bold", size: 0.07, align: "center", valign: "middle", y: 0.5 },
  { id: "center-medium", label: "Centro medio", font: "Arial, sans-serif", weight: "bold", size: 0.045, align: "center", valign: "middle", y: 0.5 },
  { id: "top-center", label: "Superior centro", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "center", valign: "top", y: 0.06 },
  { id: "top-left", label: "Superior izquierda", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "left", valign: "top", y: 0.06, x: 0.04 },
  { id: "top-right", label: "Superior derecha", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "right", valign: "top", y: 0.06, x: 0.96 },
  { id: "center-elegant", label: "Centro elegante", font: "Verdana, sans-serif", weight: "normal", size: 0.05, align: "center", valign: "middle", y: 0.5 },
  { id: "compact", label: "Compacto", font: "'Courier New', monospace", weight: "bold", size: 0.02, align: "center", valign: "bottom", y: 0.95 },
];

export type TitleFontGroup = "clasicas" | "extremas";

export const TITLE_FONTS: { id: string; label: string; family: string; group: TitleFontGroup }[] = [
  { id: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif", group: "clasicas" },
  { id: "times", label: "Times New Roman", family: "'Times New Roman', Times, serif", group: "clasicas" },
  { id: "verdana", label: "Verdana", family: "Verdana, sans-serif", group: "clasicas" },
  { id: "courier", label: "Courier New", family: "'Courier New', monospace", group: "clasicas" },
  { id: "pacifico", label: "Pacifico", family: "Pacifico, cursive", group: "extremas" },
  { id: "bungee", label: "Bungee", family: "Bungee, sans-serif", group: "extremas" },
  { id: "monoton", label: "Monoton", family: "Monoton, cursive", group: "extremas" },
  { id: "rubik", label: "Rubik Wet Paint", family: "'Rubik Wet Paint', cursive", group: "extremas" },
];

export type TitleMotion = "none" | "pulse" | "float" | "zoom" | "rotate";

export interface TitleStyle {
  presetId: string;
  family: string;
  weight: "normal" | "bold";
  italic: boolean;
  align: CanvasTextAlign;
  valign: CanvasTextBaseline;
  sizeScale: number;
  curve: number;
  motion: TitleMotion;
  motionAmount: number;
  color: string;
}

export function resolveTitleFamily(fontId: string): string {
  const f = TITLE_FONTS.find((x) => x.id === fontId);
  return f ? f.family : "Arial, sans-serif";
}

function drawCurvedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  sizePx: number,
  curve: number,
  rot: number
) {
  const chars = Array.from(text);
  const n = chars.length;
  if (n === 0) return;
  const spread = curve * Math.PI * 0.6;
  const radius = sizePx * 6;
  const centerY = cy + radius;
  const startAngle = -Math.PI / 2 - spread / 2;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (rot !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.translate(-cx, -cy);
  }
  for (let i = 0; i < n; i++) {
    const a = n === 1 ? Math.PI / 2 : startAngle + (spread * i) / (n - 1);
    const px = cx + Math.cos(a) * radius;
    const py = centerY + Math.sin(a) * radius;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(chars[i], 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  songTitle: string,
  style: TitleStyle,
  timeSec = 0
) {
  if (!songTitle) return;
  const preset = TITLE_PRESETS.find((p) => p.id === style.presetId) || TITLE_PRESETS[0];

  const baseSizePx = canvas.width * preset.size * style.sizeScale;
  const t = timeSec;
  const amt = style.motionAmount;

  let motionScale = 1;
  let yOffset = 0;
  let rot = 0;
  switch (style.motion) {
    case "pulse":
      motionScale = 1 + amt * 0.25 * Math.sin(t * 4);
      break;
    case "float":
      yOffset = canvas.height * 0.03 * amt * Math.sin(t * 2);
      break;
    case "zoom":
      motionScale = 1 + amt * 0.4 * Math.sin(t * 1.5);
      break;
    case "rotate":
      rot = amt * 0.25 * Math.sin(t * 2);
      break;
    case "none":
    default:
      break;
  }

  const sizePx = Math.max(4, Math.floor(baseSizePx * motionScale));

  ctx.save();
  ctx.fillStyle = style.color;
  ctx.font = `${style.italic ? "italic " : ""}${style.weight} ${sizePx}px ${style.family}`;
  ctx.textAlign = style.align;
  ctx.textBaseline = style.valign;

  const x = style.align === "left" ? canvas.width * 0.04
          : style.align === "right" ? canvas.width * 0.96
          : canvas.width / 2;
  const y = style.valign === "top" ? canvas.height * 0.06
          : style.valign === "bottom" ? canvas.height * 0.93
          : canvas.height / 2;

  if (style.curve === 0) {
    if (rot !== 0) {
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.translate(-x, -y);
    }
    ctx.fillText(songTitle, x, y);
  } else {
    drawCurvedText(ctx, songTitle, x, y, sizePx, style.curve, rot);
  }
  ctx.restore();
}
