import type { IAIAssistantMode } from "../hooks/useIAAsistent";

interface Props {
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  mode: IAIAssistantMode;
  setMode: (m: IAIAssistantMode) => void;
  bpm: number | null;
  currentBeatIndex: number;
  audioLoaded: boolean;
}

export default function IAAsistentPanel({
  isActive,
  setIsActive,
  mode,
  setMode,
  bpm,
  currentBeatIndex,
  audioLoaded,
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
          IA Asistent
        </span>
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
    </div>
  );
}
