import { type ReactNode } from "react";
import CollapsibleSection from "../CollapsibleSection";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  allCollapsed?: boolean;
  showWave: boolean;
  setShowWave: (v: boolean) => void;
  radiusRatio: number;
  setRadiusRatio: (v: number) => void;
  intensity: number;
  setIntensity: (v: number) => void;
  strokeWidth: number;
  setStrokeWidth: (v: number) => void;
  glowIntensity: number;
  setGlowIntensity: (v: number) => void;
  waveColor: string;
  setWaveColor: (v: string) => void;
  waveGradientMode: string;
  setWaveGradientMode: (v: "solid" | "gradient" | "rainbow") => void;
  gradColor1: string;
  setGradColor1: (v: string) => void;
  gradColor2: string;
  setGradColor2: (v: string) => void;
  showParticles: boolean;
  setShowParticles: (v: boolean) => void;
  particleColor: string;
  setParticleColor: (v: string) => void;
  particleOpacity: number;
  setParticleOpacity: (v: number) => void;
  isDecoding: boolean;
  isRecording: boolean;
  titleButtons?: ReactNode;
  headerBg?: string;
  wavePresets: { icon: string; label: string }[];
  wavePresetIdx: number;
  onApplyWavePreset: (idx: number) => void;
}

export default function WaveSection({
  collapsed, onToggle,
  allCollapsed,
  showWave, setShowWave,
  radiusRatio, setRadiusRatio,
  intensity, setIntensity,
  strokeWidth, setStrokeWidth,
  glowIntensity, setGlowIntensity,
  waveColor, setWaveColor,
  waveGradientMode, setWaveGradientMode,
  gradColor1, setGradColor1,
  gradColor2, setGradColor2,
  showParticles, setShowParticles,
  particleColor, setParticleColor,
  particleOpacity, setParticleOpacity,
  isDecoding, isRecording,
  titleButtons,
  headerBg,
  wavePresets,
  wavePresetIdx,
  onApplyWavePreset,
}: Props) {
  const currentWavePreset = wavePresets[wavePresetIdx] ?? wavePresets[0];
  const waveHeaderCenter = (
    <span className="flex items-center justify-between" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => onApplyWavePreset((wavePresetIdx - 1 + wavePresets.length) % wavePresets.length)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Preset de onda anterior"
      >‹</button>
      <span className="text-xs leading-none text-slate-300 px-1">
        {currentWavePreset.icon} {currentWavePreset.label}
      </span>
      <button type="button" onClick={() => onApplyWavePreset((wavePresetIdx + 1) % wavePresets.length)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Siguiente preset de onda"
      >›</button>
    </span>
  );
  return (
    <CollapsibleSection
      title="Onda"
      titleButtons={titleButtons}
      headerCenter={waveHeaderCenter}
      enabled={showWave}
      onToggleEnabled={setShowWave}
      collapsed={collapsed}
      onToggle={onToggle}
      allCollapsed={allCollapsed}
      headerBg={headerBg}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />}
      sectionBg="bg-cyan-950/30"
    >
      <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase pb-0.5">Forma</div>
      <label className="block">
        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
          <span>Radio</span>
          <span className="tabular-nums text-slate-300">{radiusRatio.toFixed(2)}</span>
        </div>
        <input type="range" min={0.25} max={0.6} step={0.01} value={radiusRatio} onChange={(e) => setRadiusRatio(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
      </label>

      <label className="block pt-1">
        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
          <span>Intensidad</span>
          <span className="tabular-nums text-slate-300">{intensity.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={0.8} step={0.01} value={intensity} onChange={(e) => setIntensity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
      </label>

      <label className="block pt-1">
        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
          <span>Grosor</span>
          <span className="tabular-nums text-slate-300">{strokeWidth.toFixed(1)}</span>
        </div>
        <input type="range" min={0.2} max={10} step={0.1} value={strokeWidth} onChange={(e) => setStrokeWidth(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
      </label>

      <label className="block pt-1">
        <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
          <span>Brillo</span>
          <span className="tabular-nums text-slate-300">{glowIntensity.toFixed(2)}</span>
        </div>
        <input type="range" min={0} max={1} step={0.05} value={glowIntensity} onChange={(e) => setGlowIntensity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
      </label>

      <div className="border-t border-slate-800/60 pt-1.5 mt-1.5">
        <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase pb-0.5">Color</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Onda</div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={waveColor} onChange={(e) => setWaveColor(e.target.value)} disabled={isDecoding || isRecording} aria-label="Color de onda" className="mt-0.5 h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
              <span className="text-[11px] font-mono text-slate-500">{waveColor}</span>
            </div>
          </label>
          <div>
            <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Gradiente</div>
            <select value={waveGradientMode} onChange={(e) => setWaveGradientMode(e.target.value as any)} disabled={isDecoding || isRecording} aria-label="Modo de gradiente" className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950">
              <option value="solid">Sólido</option>
              <option value="gradient">Gradiente</option>
              <option value="rainbow">Arcoíris</option>
            </select>
          </div>
        </div>

        {waveGradientMode === "gradient" && (
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <label className="block">
              <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
              <div className="flex items-center gap-1">
                <input type="color" value={gradColor1} onChange={(e) => setGradColor1(e.target.value)} aria-label="Color de gradiente 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                <span className="text-[10px] font-mono text-slate-500">{gradColor1}</span>
              </div>
            </label>
            <label className="block">
              <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
              <div className="flex items-center gap-1">
                <input type="color" value={gradColor2} onChange={(e) => setGradColor2(e.target.value)} aria-label="Color de gradiente 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                <span className="text-[10px] font-mono text-slate-500">{gradColor2}</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/60 pt-1.5 mt-1.5">
        <div className="flex items-center justify-between pb-0.5">
          <div className="text-[11px] font-semibold tracking-wider text-cyan-400/50 uppercase">Partículas</div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
            <input type="checkbox" checked={showParticles} onChange={(e) => setShowParticles(e.target.checked)} disabled={isDecoding || isRecording} aria-label="Mostrar partículas" className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-indigo-500 accent-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
            Activar
          </label>
        </div>
        <div className={`transition-all duration-200 ${showParticles ? "" : "opacity-40 pointer-events-none select-none"}`}>
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
        </div>
      </div>
    </CollapsibleSection>
  );
}
