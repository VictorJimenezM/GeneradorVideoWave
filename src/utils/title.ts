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
  { id: "center-big", label: "Centro grande", font: "Georgia, serif", weight: "bold", size: 0.07, align: "center", valign: "middle", y: 0.5 },
  { id: "center-medium", label: "Centro medio", font: "Arial, sans-serif", weight: "bold", size: 0.045, align: "center", valign: "middle", y: 0.5 },
  { id: "top-center", label: "Superior centro", font: "Arial, sans-serif", weight: "bold", size: 0.03, align: "center", valign: "top", y: 0.06 },
  { id: "top-left", label: "Superior izquierda", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "left", valign: "top", y: 0.06, x: 0.04 },
  { id: "top-right", label: "Superior derecha", font: "Arial, sans-serif", weight: "normal", size: 0.025, align: "right", valign: "top", y: 0.06, x: 0.96 },
  { id: "center-elegant", label: "Centro elegante", font: "Georgia, serif", weight: "normal", size: 0.05, align: "center", valign: "middle", y: 0.5 },
  { id: "compact", label: "Compacto", font: "'Courier New', monospace", weight: "bold", size: 0.02, align: "center", valign: "bottom", y: 0.95 },
];

export function drawTitle(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  songTitle: string,
  titleColor: string,
  titlePresetId: string
) {
  if (!songTitle) return;
  const preset = TITLE_PRESETS.find(p => p.id === titlePresetId) || TITLE_PRESETS[0];
  ctx.save();
  ctx.fillStyle = titleColor;
  ctx.font = `${preset.weight} ${Math.floor(canvas.width * preset.size)}px ${preset.font}`;
  ctx.textAlign = preset.align as CanvasTextAlign;
  ctx.textBaseline = preset.valign as CanvasTextBaseline;
  const x = preset.x !== undefined ? canvas.width * preset.x : canvas.width / 2;
  ctx.fillText(songTitle, x, canvas.height * preset.y);
  ctx.restore();
}
