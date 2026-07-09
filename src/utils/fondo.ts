export type BgMode = "color" | "image" | "fractal";

export type BgPreset = {
  id: string;
  label: string;
  color: string;
};

export const bgPresets: BgPreset[] = [
  { id: "dark", label: "Oscuro", color: "#020617" },
  { id: "purple", label: "Púrpura", color: "#1e1b4b" },
  { id: "cyan", label: "Cian", color: "#164e63" },
  { id: "emerald", label: "Esmeralda", color: "#064e3b" },
  { id: "warm", label: "Cálido", color: "#451a03" },
];

export type BgImageFilter = "none" | "grayscale" | "sepia" | "invert" | "vivid" | "cool";

export const BG_IMAGE_FILTERS: { value: BgImageFilter; label: string; css: string }[] = [
  { value: "none", label: "Normal", css: "none" },
  { value: "grayscale", label: "Gris", css: "grayscale(1)" },
  { value: "sepia", label: "Sepia", css: "sepia(1)" },
  { value: "invert", label: "Invertir", css: "invert(1)" },
  { value: "vivid", label: "Vívido", css: "saturate(1.8)" },
  { value: "cool", label: "Frío", css: "hue-rotate(180deg)" },
];

export function getBgFilterCss(filter: BgImageFilter): string {
  return BG_IMAGE_FILTERS.find((f) => f.value === filter)?.css ?? "none";
}

export function drawFondoCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  bgColor: string,
  bgImage: HTMLImageElement | null,
  filterCss: string = "none"
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgImage) {
    const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
    const x = (canvas.width - bgImage.width * scale) / 2;
    const y = (canvas.height - bgImage.height * scale) / 2;
    ctx.filter = filterCss;
    ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
    ctx.filter = "none";
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
