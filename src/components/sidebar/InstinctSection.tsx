import { type Ref } from "react";
import CollapsibleSection from "../CollapsibleSection";
import type { InstinctMode } from "../../utils/instinct";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  instinctEnabled: boolean;
  setInstinctEnabled: (v: boolean) => void;
  instinctMode: InstinctMode;
  setInstinctMode: (v: InstinctMode) => void;
  instinctSpeed: number;
  setInstinctSpeed: (v: number) => void;
  instinctStrength: number;
  setInstinctStrength: (v: number) => void;
  instinctFrequency: number;
  setInstinctFrequency: (v: number) => void;
  instinctPreviewRef: Ref<HTMLCanvasElement>;
  isDecoding: boolean;
  isRecording: boolean;
  moveLayer: (layer: string, dir: number) => void;
  layerOrder: string[];
}

export default function InstinctSection({
  collapsed, onToggle,
  instinctEnabled, setInstinctEnabled,
  instinctMode, setInstinctMode,
  instinctSpeed, setInstinctSpeed,
  instinctStrength, setInstinctStrength,
  instinctFrequency, setInstinctFrequency,
  instinctPreviewRef,
  isDecoding, isRecording,
  moveLayer, layerOrder,
}: Props) {
  const instinctTitleButtons = (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("instinct", -1); }}
        disabled={layerOrder.indexOf("instinct") <= 0}
        className="px-2.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Subir capa">▲</button>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("instinct", 1); }}
        disabled={layerOrder.indexOf("instinct") >= layerOrder.length - 1}
        className="px-2.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Bajar capa">▼</button>
    </>
  );
  return (
    <CollapsibleSection
      title="Subconciencia"
      titleButtons={instinctTitleButtons}
      enabled={instinctEnabled}
      onToggleEnabled={setInstinctEnabled}
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.6)]" />}
      sectionBg="bg-fuchsia-950/30"
    >
      <div className="flex flex-col gap-1">
        {instinctEnabled && (
          <>
            <select value={instinctMode} onChange={(e) => setInstinctMode(e.target.value as InstinctMode)}
              disabled={isDecoding || isRecording}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-fuchsia-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              <option value="water">🌊 Reflejo en agua</option>
              <option value="organic">🧬 Formas orgánicas</option>
              <option value="fragments">🎀 Fragmentos</option>
              <option value="ifs">🔮 Autosimilar</option>
            </select>
            <label className="block">
              <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                <span>Velocidad</span>
                <span className="tabular-nums text-slate-300">{instinctSpeed.toFixed(1)}</span>
              </div>
              <input type="range" min={0.1} max={5} step={0.1} value={instinctSpeed} onChange={(e) => setInstinctSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
            </label>
            <label className="block">
              <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                <span>Intensidad</span>
                <span className="tabular-nums text-slate-300">{instinctStrength}</span>
              </div>
              <input type="range" min={1} max={100} step={1} value={instinctStrength} onChange={(e) => setInstinctStrength(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
            </label>
            <label className="block">
              <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                <span>Frecuencia</span>
                <span className="tabular-nums text-slate-300">{instinctFrequency.toFixed(3)}</span>
              </div>
              <input type="range" min={0.001} max={0.1} step={0.001} value={instinctFrequency} onChange={(e) => setInstinctFrequency(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
            </label>
            <div className="flex justify-center pt-0.5 pb-1">
              <canvas ref={instinctPreviewRef} width={80} height={80}
                className="w-[80px] h-[80px] rounded-lg border border-slate-700/50 bg-slate-950/80"
                aria-label="Vista previa del instinto" />
            </div>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
