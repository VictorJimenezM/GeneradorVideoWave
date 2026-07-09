import { type ReactNode, type Ref } from "react";
import CollapsibleSection from "../CollapsibleSection";
import { INSTINCT_MODES } from "../../utils/instinct";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  allCollapsed?: boolean;
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
  titleButtons?: ReactNode;
  headerBg?: string;
}

export default function InstinctSection({
  collapsed, onToggle,
  allCollapsed,
  instinctEnabled, setInstinctEnabled,
  instinctMode, setInstinctMode,
  instinctSpeed, setInstinctSpeed,
  instinctStrength, setInstinctStrength,
  instinctFrequency, setInstinctFrequency,
  instinctPreviewRef,
  isDecoding, isRecording,
  titleButtons,
  headerBg,
}: Props) {
  const currentIdx = INSTINCT_MODES.findIndex(m => m.value === instinctMode);
  const headerCenter = (
    <span className="flex items-center gap-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setInstinctMode(INSTINCT_MODES[(currentIdx - 1 + INSTINCT_MODES.length) % INSTINCT_MODES.length].value)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Modo anterior"
      >‹</button>
      <span className="text-xs leading-none text-slate-300">
        {INSTINCT_MODES[currentIdx].icon}
      </span>
      <button type="button" onClick={() => setInstinctMode(INSTINCT_MODES[(currentIdx + 1) % INSTINCT_MODES.length].value)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Siguiente modo"
      >›</button>
    </span>
  );

  return (
    <CollapsibleSection
      title="SUB"
      titleButtons={titleButtons}
      headerCenter={headerCenter}
      enabled={instinctEnabled}
      onToggleEnabled={setInstinctEnabled}
      collapsed={collapsed}
      onToggle={onToggle}
      allCollapsed={allCollapsed}
      headerBg={headerBg}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.6)]" />}
      sectionBg="bg-fuchsia-950/30"
    >
      <div className={`flex flex-col gap-1 transition-all duration-200 ${instinctEnabled ? "" : "opacity-40 pointer-events-none select-none"}`}>
            <div className="text-xs font-semibold tracking-wider text-fuchsia-400/80 uppercase flex items-center gap-1 pb-0.5 border-b border-slate-800/60 mb-1">
              <span>{INSTINCT_MODES[currentIdx].icon}</span>
              <span>{INSTINCT_MODES[currentIdx].label}</span>
            </div>
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
      </div>
    </CollapsibleSection>
  );
}
