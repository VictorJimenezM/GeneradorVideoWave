import { useState, type RefObject } from "react";
import type { IAIAssistantMode } from "../hooks/useIAAsistent";
import ConfirmModal from "./ConfirmModal";

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  return (
    <div className="rounded-lg border border-violet-700/40 bg-violet-950/20 p-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        {/* COLUMNA 1 */}
        <div className="flex flex-col gap-1.5">
          {waveformReady ? (
            <canvas ref={previewCanvasRef as any} className="w-full aspect-square rounded-lg border border-slate-800/60 bg-slate-950/40" />
          ) : (
            <div className="flex w-full aspect-square items-center justify-center rounded-lg border border-slate-800/60 bg-slate-950/40 px-2 text-center text-[10px] text-slate-500">
              Carga un audio primero
            </div>
          )}
        </div>

        {/* COLUMNA 2 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-1.5">
            <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded px-1.5 py-1 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-800/60 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={!audioLoaded}
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-violet-500 accent-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              />
              <span>IA Assistant</span>
            </label>
            <label className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded px-1.5 py-1 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-800/60 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950">
              <input type="checkbox" checked={isLoopingUI} onChange={(e) => { const v = e.target.checked; setIsLoopingUI(v); if (audioRef.current) audioRef.current.loop = v; }}
                disabled={isRecording} aria-label="Activar loop de preview"
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              />
              Loop preview
            </label>
            <div className="grid grid-cols-2 gap-1">
              <button type="button" onClick={onCollapseAll}
                aria-label="Colapsar todos los menús"
                className="flex w-full items-center justify-center gap-1 rounded px-1.5 py-1 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-800/60 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                Colap.
              </button>
              {onResetDefaults && (
              <button type="button" onClick={() => setShowResetConfirm(true)}
                className="flex w-full items-center justify-center gap-1 rounded px-1.5 py-1 text-xs text-slate-500 transition-all duration-200 hover:bg-slate-800/60 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                title="Restablecer valores de fábrica"
              >
                ↺ Reset
              </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={handlePreview}
              disabled={isDecoding || isRecording || isPreviewing || !audioUrl || !waveformReady}
              aria-label="Previsualizar audio"
              aria-busy={isDecoding}
              className="group w-full rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {isDecoding ? (
                <span className="flex items-center justify-center">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </span>
              ) : (
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </span>
                  <span className="hidden group-hover:block text-[10px] leading-none">Previsualizar</span>
                </span>
              )}
            </button>
            <button type="button" onClick={() => void stopAll()}
              disabled={(!isRecording && !isPreviewing) || isDecoding}
              aria-label="Detener preview o grabación"
              className="w-full rounded-lg bg-slate-950 px-2 py-1 transition-all duration-200 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <span className="flex items-center justify-center">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>

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

      <label className="flex items-center gap-2 text-xs font-medium text-slate-400 tracking-wide">
        <span className="whitespace-nowrap">Volumen</span>
        <input type="range" min={0} max={1} step={0.05} value={volume}
          onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }}
          aria-label="Volumen de preview"
          className="flex-1" />
        <span className="tabular-nums text-slate-300 whitespace-nowrap">{Math.round(volume * 100)}%</span>
      </label>

      <ConfirmModal
        open={showResetConfirm}
        title="Restablecer valores"
        message="¿Seguro que deseas restablecer todos los valores a fábrica?"
        confirmLabel="Restablecer"
        cancelLabel="Cancelar"
        onConfirm={() => {
          onResetDefaults?.();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
