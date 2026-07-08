import CollapsibleSection from "../CollapsibleSection";
import FileDropZone from "../FileDropZone";
import { bgPresets } from "../../utils/fondo";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  bgMode: "color" | "image" | "fractal";
  handleBgModeChange: (mode: "color" | "image") => void;
  activeBgPreset: string | null;
  applyBgPreset: (id: string) => void;
  bgColor: string;
  setBgColor: (v: string) => void;
  setActiveBgPreset: (v: string | null) => void;
  bgImagePreset: string;
  handleBgImagePresetChange: (v: string) => void;
  bgImage: HTMLImageElement | null;
  onPickBgImage: (file: File | null) => void;
  BG_IMAGE_PRESETS: Array<{ id: string; label: string; src: string }>;
  isDecoding: boolean;
  isRecording: boolean;
  isPreviewing: boolean;
}

export default function BgSection({
  collapsed, onToggle,
  bgMode, handleBgModeChange,
  activeBgPreset, applyBgPreset,
  bgColor, setBgColor, setActiveBgPreset,
  bgImagePreset, handleBgImagePresetChange,
  bgImage, onPickBgImage,
  BG_IMAGE_PRESETS,
  isDecoding, isRecording, isPreviewing,
}: Props) {
  return (
    <CollapsibleSection
      title="Fondo"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />}
      sectionBg="bg-violet-950/30"
    >
      <div className="grid grid-cols-2 gap-1 pb-1.5">
        {(["color", "image"] as const).map((mode) => (
          <button key={mode} type="button" onClick={() => handleBgModeChange(mode)}
            disabled={isDecoding || isRecording}
            aria-label={`Modo fondo: ${mode === "color" ? "Color" : "Imagen"}`}
            className={`rounded-lg px-1.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
              bgMode === mode
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
            }`}
          >
            {mode === "color" ? "Color" : "Imagen"}
          </button>
        ))}
      </div>

      <div className={`overflow-hidden transition-all duration-250 ease-in-out ${
        bgMode === "color" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="pt-0.5 space-y-1">
          <div className="flex flex-wrap gap-1">
            {bgPresets.map((p) => (
              <button key={p.id} type="button" onClick={() => applyBgPreset(p.id)} disabled={isDecoding || isRecording}
                aria-label={`Fondo preset: ${p.label}`}
                className={`rounded-lg px-2 py-0.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                  activeBgPreset === p.id
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                    : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-slate-600/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="block">
            <div className="text-xs font-medium text-slate-400 tracking-wide pb-0.5">Personalizado</div>
            <div className="flex items-center gap-1.5">
              <input type="color" value={bgColor} onChange={(e) => { setBgColor(e.target.value); setActiveBgPreset(null); }}
                disabled={isDecoding || isRecording} aria-label="Color de fondo personalizado" className="h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
              <span className="text-[11px] font-mono text-slate-500">{bgColor}</span>
            </div>
          </label>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-250 ease-in-out ${
        bgMode === "image" ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <div className="pt-0.5 space-y-1">
          <select value={bgImagePreset} onChange={(e) => handleBgImagePresetChange(e.target.value)}
            aria-label="Imagen de fondo predefinida"
            disabled={isDecoding || isRecording}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-cyan-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
          >
            <option value="custom">Ninguna</option>
            {BG_IMAGE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <FileDropZone onDrop={(file) => onPickBgImage(file)}>
            <input
              type="file"
              accept="image/*"
              aria-label="Seleccionar imagen de fondo"
              disabled={isDecoding || isRecording || isPreviewing}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 transition-all duration-200 file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-cyan-200 hover:file:bg-cyan-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              onChange={(e) => onPickBgImage(e.target.files?.[0] ?? null)}
            />
          </FileDropZone>
          {bgImage && (
            <button
              type="button"
              onClick={() => onPickBgImage(null)}
              aria-label="Remover imagen de fondo"
              className="self-start rounded-lg px-1.5 py-0.5 text-xs text-rose-400 transition-all duration-200 hover:bg-rose-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              Remover
            </button>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
