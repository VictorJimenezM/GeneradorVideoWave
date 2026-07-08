import CollapsibleSection from "../CollapsibleSection";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  exportSectionRef: React.Ref<HTMLDivElement>;
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
  collapsed, onToggle,
  exportSectionRef,
  resolution, setResolution,
  isExporting, isDecoding, isRecording,
  audioUrl, waveformReady,
  handleGenerateAndDownloadRealtime,
}: Props) {
  return (
    <div ref={exportSectionRef}>
      <CollapsibleSection
        title="Exportar"
        collapsed={collapsed}
        onToggle={onToggle}
        icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />}
        sectionBg="bg-emerald-950/30"
      >
        <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5 mt-1">Resolución</div>
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
          className="mt-2 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            Grabar y descargar
          </span>
        </button>

        <div className="rounded-lg border border-amber-900/30 bg-amber-950/20 px-2 py-1 mt-1.5 text-xs leading-relaxed text-amber-300/70">
          Mantén la pestaña en primer plano.
        </div>

        {isExporting ? (
          <div className="pt-1">
            <div className="flex items-center gap-1.5 text-xs text-indigo-300">
              Exportando...
            </div>
          </div>
        ) : null}
      </CollapsibleSection>
    </div>
  );
}
