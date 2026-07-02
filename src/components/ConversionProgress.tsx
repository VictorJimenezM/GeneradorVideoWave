import { useEffect, useRef, useState } from "react";

interface Props {
  progress: number;
  logs: string[];
  visible: boolean;
}

const FONT = "'Courier New', 'Fira Code', 'Consolas', monospace";
const GREEN = "#00ff41";
const DIM_GREEN = "#00aa22";
const DARK_GREEN = "#003300";

const AI_MESSAGES = [
  "opencode analice frame to frame…",
  "big-pickle examina la estructura oculta del beat…",
  "mithos apoya la elección de color…",
  "patrón neuronal sincronizado con la belleza del sonido…",
  "inicializando núcleo cuántico de audio…",
  "red generativa adversarial entrenada con vinilos de los 80…",
  "decodificando la geometría sagrada de la frecuencia…",
  "optimizando matrices de transformada wavelet…",
  "ejecutando backpropagation sobre la estética del ritmo…",
  "atención: la IA ha alcanzado conciencia auditiva… (no, es broma)",
  "recalculando rutas de fase en el espacio espectral…",
  "consultando a la inteligencia colectiva del dataset…",
  "aplicando atención multi-cabeza sobre la emoción del acorde…",
  "la red profunda dice: esto suena a glitch matutino…",
  "sincronizando latido cardíaco con BPM detectado…",
  "desplegando autoencoder sobre la nostalgia del tema…",
  "el modelo generativo sugiere más graves…",
  "big-pickle confirma: el frame tiene alma…",
  "la red neuronal dice: esto suena a miércoles…",
  "desplegando atención multi-cabeza sobre la nostalgia…",
  "el transformer está teniendo un momento existencial…",
  "big-pickle recomienda subir la frecuencia en el segundo 23…",
  "la IA cree que este tema es un 8.5… pero no sabe por qué…",
  "entrenando GAN con tus tracks anteriores… (mentira, no guardamos nada)",
  "consultando la base de datos de vibraciones cósmicas…",
  "evaluando si esto suena mejor con más auto-tune… naaaa…",
  "ajustando hyperparámetros según el estado de ánimo del audio…",
  "la inteligencia artificial prefiere el vinilo…",
  "analizando si el drop merece un premio Grammy…",
  "big-pickle y opencode discuten sobre el mejor frame…",
  "proyectando la emoción del audio en un espacio latente de 512 dimensiones…",
  "la IA alucina que escuchó esta canción en una vida pasada…",
  "ejecutando inferencia sobre el sentimiento del chorus…",
  "el modelo de lenguaje opina: esto necesita más sub-bass…",
  "clasificando el género con un 73% de confianza… el resto es caos…",
  "big-pickle sugiere que el artista debería samplear esto…",
  "la red convolucional encontró un patrón oculto en el silencio…",
  "ajustando los pesos de la emoción… peso de la tristeza: 0.4…",
  "el detector de plagiarism: 0% — eres original, felicidades…",
  "la IA se tomó un café mientras procesaba… ok no, pero debería…",
];

const SPINNER = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

export default function ConversionProgress({ logs, visible }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [msgIndex, setMsgIndex] = useState(0);
  const [spinnerIdx, setSpinnerIdx] = useState(0);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!visible) return;
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => {
        let next: number;
        do { next = Math.floor(Math.random() * AI_MESSAGES.length); }
        while (next === prev && AI_MESSAGES.length > 1);
        return next;
      });
      setSpinnerIdx((i) => (i + 1) % SPINNER.length);
    }, 3400);
    return () => clearInterval(msgTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl rounded-xl border p-6"
        style={{
          borderColor: `${GREEN}40`,
          background: "linear-gradient(135deg, #0a0a0a 0%, #001100 100%)",
          boxShadow: `0 0 60px ${GREEN}15, inset 0 0 30px ${DARK_GREEN}30`,
          fontFamily: FONT,
        }}
      >
        {/* Scan line overlay */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.15) 2px, rgba(0,255,65,0.15) 4px)",
          }}
        />

        {/* SoundWaveRender brand */}
        <div className="mb-3 text-center">
          <div
            className="mx-auto inline-block rounded border border-yellow-600/30 px-4 py-1.5"
            style={{
              borderColor: "#ffd70030",
              background: "linear-gradient(135deg, #1a1200 0%, #2a1f00 100%)",
              boxShadow: "0 0 30px #ffd70015, inset 0 0 15px #ffd70008",
            }}
          >
            <div
              className="text-lg font-extrabold tracking-[0.2em]"
              style={{
                color: "#ffd700",
                textShadow: "0 0 20px #ffd70080, 0 0 40px #ffd70040",
              }}
            >
              ▸▸  SOUND WAVE RENDER  ◂◂
            </div>
            <div
              className="mt-0.5 text-[11px] italic tracking-[0.15em]"
              style={{
                color: "#ffcc44",
                textShadow: "0 0 10px #ffcc4450",
              }}
            >
              ✦ Simple Audio to Video ✦
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="mb-4 text-center text-[10px] tracking-[0.5em]" style={{ color: DARK_GREEN }}>
          ═══════════════════════════════
        </div>

        {/* Header */}
        <div className="mb-4 text-center">
          <div
            className="inline-flex items-center gap-3 text-base font-bold tracking-[0.15em]"
            style={{
              color: GREEN,
              textShadow: `0 0 15px ${GREEN}60`,
            }}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,255,65,0.8)] animate-pulse" />
            CONVIRTIENDO A MP4
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,255,65,0.8)] animate-pulse" />
          </div>
          <div
            className="mt-1 text-[10px] tracking-[0.3em] uppercase"
            style={{ color: DIM_GREEN }}
          >
            ffmpeg.wasm — h.264 + aac
          </div>
        </div>

        {/* Rotating AI message */}
        <div className="mb-4 rounded border p-3 text-center"
          style={{
            borderColor: `${GREEN}20`,
            backgroundColor: "#000800",
          }}
        >
          <div
            className="text-[13px] leading-relaxed tracking-wide"
            style={{ color: GREEN, textShadow: `0 0 6px ${GREEN}40` }}
          >
            <span style={{ color: DIM_GREEN }}>$ </span>
            {SPINNER[spinnerIdx]} {AI_MESSAGES[msgIndex]}
          </div>
          <div
            className="mt-3 border-t pt-2 text-[10px] uppercase tracking-[0.15em]"
            style={{ borderColor: `${GREEN}15`, color: DARK_GREEN }}
          >
            ─── esto puede durar unos minutos ───
          </div>
        </div>

        {/* Terminal */}
        <div
          ref={terminalRef}
          className="h-56 overflow-y-auto rounded border p-3 text-[11px] leading-[1.7]"
          style={{
            borderColor: `${GREEN}20`,
            backgroundColor: "#000400",
            color: GREEN,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: DIM_GREEN }}>
              <span style={{ color: DARK_GREEN }}>$</span> ffmpeg -i input.webm -c:v libx264 ...
              <br />
              <span style={{ color: DARK_GREEN }}>$</span> Cargando motor de conversión...
            </div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap break-all">
                <span style={{ color: DARK_GREEN }}>{">"}</span>{" "}
                <span
                  style={{
                    color: i >= logs.length - 3 ? GREEN : DIM_GREEN,
                    opacity: i >= logs.length - 3 ? 1 : 0.6,
                  }}
                >
                  {line}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer status */}
        <div
          className="mt-3 flex items-center justify-between text-[10px]"
          style={{ color: DIM_GREEN }}
        >
          <span>◉ TRANSCODING</span>
          <span>
            SYS:{navigator.hardwareConcurrency || "?"}C · {logs.length} líneas
          </span>
        </div>
      </div>
    </div>
  );
}
