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

export function drawFondoCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  bgColor: string,
  bgImage: HTMLImageElement | null
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgImage) {
    const scale = Math.max(canvas.width / bgImage.width, canvas.height / bgImage.height);
    const x = (canvas.width - bgImage.width * scale) / 2;
    const y = (canvas.height - bgImage.height * scale) / 2;
    ctx.drawImage(bgImage, x, y, bgImage.width * scale, bgImage.height * scale);
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
