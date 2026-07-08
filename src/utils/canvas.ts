export interface CanvasRefs {
  onda: HTMLCanvasElement | null;
  fondo: HTMLCanvasElement | null;
  fractal: HTMLCanvasElement | null;
  instinct: HTMLCanvasElement | null;
  letras: HTMLCanvasElement | null;
  temp?: HTMLCanvasElement | null;
}

export function clearCanvasSolid(canvas: HTMLCanvasElement | null, ctx: CanvasRenderingContext2D | null) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function fadeCanvas(ctx: CanvasRenderingContext2D | null, canvas: HTMLCanvasElement | null, alpha: number) {
  if (!canvas || !ctx) return;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

export function syncAllCanvasSizes(refs: CanvasRefs, dpr: number, isRecord: boolean) {
  if (isRecord) return;

  const resize = (ref: HTMLCanvasElement | null) => {
    if (!ref) return;
    const rect = ref.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (ref.width !== w || ref.height !== h) {
      ref.width = w;
      ref.height = h;
    }
  };

  resize(refs.fondo);
  resize(refs.fractal);
  resize(refs.instinct);
  resize(refs.onda);
  resize(refs.letras);
}

export function setCanvasVideoSize(refs: CanvasRefs, size: number) {
  const resize = (ref: HTMLCanvasElement | null) => {
    if (!ref) return;
    if (ref.width !== size || ref.height !== size) {
      ref.width = size;
      ref.height = size;
    }
  };
  resize(refs.onda);
  resize(refs.fondo);
  resize(refs.fractal);
  resize(refs.instinct);
  resize(refs.letras);
}
