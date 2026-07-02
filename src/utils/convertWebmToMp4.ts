let ffmpeg: FFmpegInstance | null = null;
let loadingPromise: Promise<void> | null = null;
let loaded = false;
let loadError: string | null = null;

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FFmpeg) {
      console.log("[ffmpeg] Script ya estaba cargado");
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js";
    s.onload = () => {
      console.log("[ffmpeg] Script cargado desde CDN");
      resolve();
    };
    s.onerror = () => {
      const msg = "No se pudo cargar FFmpeg desde CDN (jsdelivr)";
      console.error("[ffmpeg]", msg);
      reject(new Error(msg));
    };
    document.head.appendChild(s);
  });
}

export async function initFFmpeg(): Promise<void> {
  if (loaded) {
    console.log("[ffmpeg] Ya inicializado, saltando");
    return;
  }
  if (loadingPromise) {
    console.log("[ffmpeg] Ya está cargando, esperando...");
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      await loadScript();

      console.log("[ffmpeg] Creando instancia con corePath = jsdelivr...");
      ffmpeg = window.FFmpeg.createFFmpeg({
        log: true,
        corePath:
          "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
      });

      console.log("[ffmpeg] Descargando core WASM (~31 MB desde jsdelivr)...");
      await ffmpeg.load();
      loaded = true;
      loadError = null;
      console.log("[ffmpeg] ✓ FFmpeg listo");
    } catch (e: any) {
      loadError = e?.message ?? "Error desconocido";
      console.error("[ffmpeg] ✗ Error al inicializar:", loadError);
      loadingPromise = null;
      throw e;
    }
  })();

  return loadingPromise;
}

export function isFFmpegLoaded(): boolean {
  return loaded;
}

export function isFFmpegLoading(): boolean {
  return !loaded && loadingPromise !== null;
}

export function getLoadError(): string | null {
  return loadError;
}

export async function waitForFFmpeg(): Promise<boolean> {
  if (loaded) {
    console.log("[ffmpeg] waitForFFmpeg: ya listo");
    return true;
  }
  if (loadingPromise) {
    console.log("[ffmpeg] waitForFFmpeg: esperando carga en progreso...");
    try {
      await loadingPromise;
      console.log("[ffmpeg] waitForFFmpeg: carga completada");
      return true;
    } catch (e: any) {
      console.warn("[ffmpeg] waitForFFmpeg: carga falló:", e?.message);
      return false;
    }
  }
  console.log("[ffmpeg] waitForFFmpeg: nunca se inició la carga");
  return false;
}

export interface ConversionCallbacks {
  onProgress?: (pct: number) => void;
  onLog?: (msg: string) => void;
}

export async function convertToMp4(
  webmBlob: Blob,
  callbacks?: ConversionCallbacks
): Promise<{ blob: Blob; filename: string }> {
  if (!ffmpeg) throw new Error("FFmpeg no está inicializado");

  ffmpeg.setLogger?.(({ type, message }) => {
    if (type === "fferr" && callbacks?.onLog) {
      callbacks.onLog(message);
    }
  });

  ffmpeg.setProgress?.((event) => {
    const raw = (event as any)?.ratio ?? (event as any)?.progress ?? 0;
    const pct = Math.round(Number(raw) * 100);
    callbacks?.onProgress?.(Number.isFinite(pct) ? pct : 0);
  });

  console.log("[ffmpeg] Escribiendo input.webm en MEMFS...");
  const { fetchFile } = window.FFmpeg;
  ffmpeg.FS("writeFile", "input.webm", await fetchFile(webmBlob));

  console.log("[ffmpeg] Ejecutando conversión...");
  await ffmpeg.run(
    "-i",
    "input.webm",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-vsync",
    "cfr",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-movflags",
    "+faststart",
    "output.mp4"
  );

  console.log("[ffmpeg] Leyendo output.mp4...");
  const data = ffmpeg.FS("readFile", "output.mp4");

  try {
    ffmpeg.FS("unlink", "input.webm");
  } catch { /* ignore */ }
  try {
    ffmpeg.FS("unlink", "output.mp4");
  } catch { /* ignore */ }

  const blob = new Blob([data.buffer], { type: "video/mp4" });
  console.log("[ffmpeg] ✓ Conversión completada");
  return { blob, filename: `audio-visualizer-${Date.now()}.mp4` };
}
