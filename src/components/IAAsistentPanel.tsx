import type { RefObject } from "react";
import type { IAIAssistantMode } from "../hooks/useIAAsistent";

interface Props {
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  mode: IAIAssistantMode;
  setMode: (m: IAIAssistantMode) => void;
  bpm: number | null;
  currentBeatIndex: number;
  audioLoaded: boolean;
  waveformReady: boolean;
  previewCanvasRef: RefObject<HTMLCanvasElement | null>;
  volume: number;
  setVolume: (v: number) => void;
  isPreviewing: boolean;
  isRecording: boolean;
  isDecoding: boolean;
  handlePreview: () => void;
  stopAll: () => void | Promise<void>;
  isLoopingUI: boolean;
  setIsLoopingUI: (v: boolean) => void;
  audioUrl: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onCollapseAll: () => void;
  onResetDefaults?: () => void;
}

export default function IAAsistentPanel({
  isActive,
  setIsActive,
  mode,
  setMode,
  bpm,
  currentBeatIndex,
  audioLoaded,
  waveformReady,
  previewCanvasRef,
  volume,
  setVolume,
  isPreviewing,
  isRecording,
  isDecoding,
  handlePreview,
  stopAll,
  isLoopingUI,
  setIsLoopingUI,
  audioUrl,
  audioRef,
  onCollapseAll,
  onResetDefaults,
}: Props) {
  return (
    <div className="rounded-lg border border-violet-700/40 bg-violet-950/20 p-2 space-y-1.5">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={!audioLoaded}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-500 focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-1 focus:ring-offset-slate-950"
        />
        <span className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
          IA Assistant
        </span>
        {onResetDefaults && (
          <button type="button" onClick={onResetDefaults}
            className="ml-auto rounded px-1.5 py-0.5 text-[11px] text-slate-600 hover:text-slate-300 hover:bg-slate-800/40 transition-all"
            title="Restablecer valores de fábrica"
          >
            ↺
          </button>
        )}
      </label>

      {!audioLoaded && (
        <p className="text-[10px] text-slate-500">Carga un audio primero</p>
      )}

      {isActive && audioLoaded && (
        <>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setMode("aggressive")}
              className={`flex-1 rounded px-1 py-0.5 text-[11px] font-medium transition-all ${
                mode === "aggressive"
                  ? "bg-violet-500/30 text-violet-200 border border-violet-500/50"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-violet-500/30"
              }`}
            >
              Agresivo
            </button>
            <button
              type="button"
              onClick={() => setMode("sensitive")}
              className={`flex-1 rounded px-1 py-0.5 text-[11px] font-medium transition-all ${
                mode === "sensitive"
                  ? "bg-violet-500/30 text-violet-200 border border-violet-500/50"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-violet-500/30"
              }`}
            >
              Sensible
            </button>
          </div>

          <div className="flex justify-between text-[11px] text-slate-500">
            <span>
              BPM:{" "}
              <span className="text-violet-300 font-medium">{bpm ?? "—"}</span>
            </span>
            <span>
              Compás:{" "}
              <span className="text-violet-300 font-medium">
                {Math.max(0, Math.floor(currentBeatIndex / 4) + 1)}
              </span>
            </span>
          </div>
        </>
      )}

      {waveformReady && (
        <div>
          <canvas ref={previewCanvasRef} className="w-full h-14 rounded-lg border border-slate-800/60 bg-slate-950/40" />
        </div>
      )}

      <label className="block">
        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
          <span>Volumen</span>
          <span className="tabular-nums text-slate-300">{Math.round(volume * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
          aria-label="Volumen de preview"
          className="mt-0.5 w-full" />
      </label>

      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={handlePreview}
          disabled={isDecoding || isRecording || isPreviewing || !audioUrl || !waveformReady}
          aria-label="Previsualizar audio"
          className="w-full rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {isDecoding ? (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Decodificando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Previsualizar
            </span>
          )}
        </button>
        <button type="button" onClick={() => void stopAll()}
          disabled={(!isRecording && !isPreviewing) || isDecoding}
          aria-label="Detener preview o grabación"
          className="w-full rounded-lg bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-700/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Detener
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
          <input type="checkbox" checked={isLoopingUI} onChange={(e) => { const v = e.target.checked; setIsLoopingUI(v); if (audioRef.current) audioRef.current.loop = v; }}
            disabled={isRecording} aria-label="Activar loop de preview"
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
          />
          Loop preview
        </label>
        <button type="button" onClick={onCollapseAll}
          aria-label="Colapsar todos los menús"
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-800/60 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Colapsar
        </button>
      </div>
    </div>
  );
}
