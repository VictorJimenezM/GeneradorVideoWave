import CollapsibleSection from "../CollapsibleSection";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  showParticles: boolean;
  setShowParticles: (v: boolean) => void;
  particleColor: string;
  setParticleColor: (v: string) => void;
  particleOpacity: number;
  setParticleOpacity: (v: number) => void;
  isDecoding: boolean;
  isRecording: boolean;
}

export default function ParticlesSection({
  collapsed,
  onToggle,
  showParticles,
  setShowParticles,
  particleColor,
  setParticleColor,
  particleOpacity,
  setParticleOpacity,
  isDecoding,
  isRecording,
}: Props) {
  return (
    <CollapsibleSection
      title="Partículas"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.6)]" />}
      sectionBg="bg-sky-950/30"
    >
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
        <input type="checkbox" checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} disabled={isDecoding || isRecording} aria-label="Mostrar partículas" className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
        Activar partículas
      </label>
      {showParticles && (
        <>
          <label className="block pt-1">
            <div className="text-xs font-medium text-slate-400 tracking-wide">Color</div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={particleColor} onChange={(e) => setParticleColor(e.target.value)} aria-label="Color de partículas" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
              <span className="text-[11px] font-mono text-slate-500">{particleColor}</span>
            </div>
          </label>
          <label className="block pt-1">
            <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
              <span>Opacidad</span>
              <span className="tabular-nums text-slate-300">{particleOpacity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={particleOpacity} onChange={(e) => setParticleOpacity(parseFloat(e.target.value))} className="mt-0.5 w-full" />
          </label>
        </>
      )}
    </CollapsibleSection>
  );
}
