interface Props {
  resolution: "720p" | "1080p" | "4K";
  setResolution: (v: "720p" | "1080p" | "4K") => void;
  isExporting: boolean;
  isDecoding: boolean;
  isRecording: boolean;
  audioUrl: string | null;
  waveformReady: boolean;
  handleGenerateAndDownloadRealtime: () => void;
}

export default function ExportSection({
  resolution, setResolution,
  isExporting, isDecoding, isRecording,
  audioUrl, waveformReady,
  handleGenerateAndDownloadRealtime,
}: Props) {
  return (
    <div className="rounded-lg border border-emerald-700/40 bg-emerald-950/20 p-2 mx-2 mb-2">
      <div className="flex items-center gap-1.5 pb-0.5">
        <span className="text-xs font-medium text-slate-400 tracking-wide">Resolución</span>
        <span className="text-[10px] font-medium text-amber-300/80">Mantén la pestaña en primer plano</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {(["720p", "1080p", "4K"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setResolution(r)} disabled={isExporting || isRecording}
            aria-label={`Resolución ${r}`}
            className={`rounded-lg px-1.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
              resolution === r
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <button type="button" onClick={() => void handleGenerateAndDownloadRealtime()}
        disabled={isDecoding || isRecording || isExporting || !audioUrl || !waveformReady}
        aria-label="Grabar y descargar video"
        className="mt-2 w-full rounded-lg bg-indigo-500 px-2 py-1 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
      >
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" />
          </svg>
          Grabar y descargar
        </span>
      </button>

      {isExporting ? (
        <div className="pt-1">
          <div className="flex items-center gap-1.5 text-xs text-indigo-300">
            Exportando...
          </div>
        </div>
      ) : null}
    </div>
  );
}
