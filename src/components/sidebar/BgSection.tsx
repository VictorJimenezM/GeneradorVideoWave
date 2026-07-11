import { useRef, type ChangeEvent } from "react";
import CollapsibleSection from "../CollapsibleSection";
import { BG_IMAGE_FILTERS, type BgImageFilter } from "../../utils/fondo";

const COLOR_BUTTONS: { label: string; value: string }[] = [
  { label: "Verde (croma)", value: "#00ff00" },
  { label: "Negro", value: "#000000" },
  { label: "Blanco", value: "#ffffff" },
  { label: "Azul", value: "#0000ff" },
  { label: "Rojo", value: "#ff0000" },
];

interface BgImageSample {
  id: string;
  label: string;
  src: string;
}

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
  bgImagePresets: BgImageSample[];
  onReplaceBgImagePreset: (id: string, file: File) => void;
  onResetBgImagePreset: (id: string) => void;
  bgImageFilter: BgImageFilter;
  setBgImageFilter: (v: BgImageFilter) => void;
  isDecoding: boolean;
  isRecording: boolean;
  isPreviewing: boolean;
}

const DEFAULT_BG_SAMPLES: BgImageSample[] = [
  { id: "1", label: "Muestra 1", src: "/fondo_muestra_1.png" },
  { id: "2", label: "Muestra 2", src: "/fondo_muestra_2.png" },
  { id: "3", label: "Muestra 3", src: "/fondo_muestra_3.png" },
  { id: "4", label: "Muestra 4", src: "/fondo_muestra_4.jpg" },
];

export default function BgSection({
  collapsed, onToggle,
  bgMode, handleBgModeChange,
  activeBgPreset, applyBgPreset,
  bgColor, setBgColor, setActiveBgPreset,
  bgImagePreset, handleBgImagePresetChange,
  bgImage, onPickBgImage,
  bgImagePresets, onReplaceBgImagePreset, onResetBgImagePreset,
  bgImageFilter, setBgImageFilter,
  isDecoding, isRecording, isPreviewing,
}: Props) {
  const handleReplace = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onReplaceBgImagePreset(id, file);
    e.target.value = "";
  };

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleSlotClick = (id: string) => {
    handleBgImagePresetChange(id);
    fileInputRefs.current[id]?.click();
  };

  const curIdx = Math.max(0, bgImagePresets.findIndex((p) => p.id === bgImagePreset));
  const sampleCount = bgImagePresets.length;
  const bgImageStepper = (
    <span className="flex items-center justify-between" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => handleBgImagePresetChange(bgImagePresets[(curIdx - 1 + sampleCount) % sampleCount].id)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Muestra anterior"
      >‹</button>
      <span className="text-xs leading-none text-slate-300 tabular-nums">
        {curIdx + 1}/{sampleCount}
      </span>
      <button type="button" onClick={() => handleBgImagePresetChange(bgImagePresets[(curIdx + 1) % sampleCount].id)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Siguiente muestra"
      >›</button>
    </span>
  );

  const curFilterIdx = Math.max(0, BG_IMAGE_FILTERS.findIndex((f) => f.value === bgImageFilter));
  const filterCount = BG_IMAGE_FILTERS.length;
  const bgFilterStepper = (
    <span className="flex items-center justify-between" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setBgImageFilter(BG_IMAGE_FILTERS[(curFilterIdx - 1 + filterCount) % filterCount].value)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Filtro anterior"
      >‹</button>
      <span className="text-xs leading-none text-slate-300 px-1 min-w-[3.5rem] text-center">
        {BG_IMAGE_FILTERS[curFilterIdx].label}
      </span>
      <button type="button" onClick={() => setBgImageFilter(BG_IMAGE_FILTERS[(curFilterIdx + 1) % filterCount].value)}
        disabled={isDecoding || isRecording}
        className="text-sm px-3 py-0.5 leading-none text-slate-200 bg-fuchsia-900/40 hover:bg-fuchsia-800/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Siguiente filtro"
      >›</button>
    </span>
  );

  const bgHeaderCenter = (
    <span className="flex items-center gap-1.5 flex-1 justify-end">
      {bgImageStepper}
      {bgFilterStepper}
    </span>
  );

  const colorHeaderButtons = (
    <span className="flex items-center justify-end gap-1" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      {COLOR_BUTTONS.map((c) => {
        const isActive = bgColor.toLowerCase() === c.value.toLowerCase();
        return (
          <button key={c.value} type="button" onClick={() => { setBgColor(c.value); setActiveBgPreset(null); }}
            disabled={isDecoding || isRecording}
            aria-label={`Color de fondo: ${c.label}`}
            style={{ backgroundColor: c.value }}
            className={`h-4 w-4 rounded-sm border transition-all duration-200 ${isActive ? "border-violet-400 ring-1 ring-violet-400/60" : "border-white/20 hover:border-white/50"}`}
          />
        );
      })}
    </span>
  );

  return (
    <CollapsibleSection
      title="Fondo"
      headerCenter={bgMode === "image" ? bgHeaderCenter : bgMode === "color" ? colorHeaderButtons : undefined}
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
        <div className="pt-0.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {bgImagePresets.map((p) => {
              const isActive = bgImagePreset === p.id;
              const isCustomized = p.src !== (DEFAULT_BG_SAMPLES.find((d) => d.id === p.id)?.src ?? p.src);
              return (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleSlotClick(p.id)}
                    disabled={isDecoding || isRecording}
                    aria-label="Click para cambiar imagen"
                    className={`group block w-full overflow-hidden rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                      isActive
                        ? "border-cyan-400/70 ring-1 ring-cyan-400/40"
                        : "border-slate-700/50 hover:border-slate-600/50"
                    }`}
                  >
                    <div className="relative aspect-square w-full bg-slate-900">
                      <img src={p.src} alt={p.label} className="h-full w-full object-cover" />
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/70 px-1 py-1 text-center text-[11px] font-medium text-cyan-200">
                        Click para cambiar imagen
                      </div>
                    </div>
                    <div className={`px-1 py-0.5 text-[11px] font-medium text-center truncate ${
                      isActive ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-800/60 text-slate-400"
                    }`}>
                      {p.label}
                    </div>
                  </button>
                  <input
                    ref={(el) => { fileInputRefs.current[p.id] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isDecoding || isRecording || isPreviewing}
                    onChange={(e) => handleReplace(p.id, e)}
                  />
                  <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                    <label
                      className="cursor-pointer rounded bg-slate-950/70 px-1 text-[10px] text-cyan-200 hover:bg-slate-950/90"
                      aria-label={`Reemplazar ${p.label}`}
                      title="Reemplazar"
                    >
                      ⟳
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isDecoding || isRecording || isPreviewing}
                        onChange={(e) => handleReplace(p.id, e)}
                      />
                    </label>
                    {isCustomized && (
                      <button
                        type="button"
                        onClick={() => onResetBgImagePreset(p.id)}
                        disabled={isDecoding || isRecording}
                        aria-label={`Restaurar ${p.label}`}
                        title="Restaurar original"
                        className="rounded bg-slate-950/70 px-1 text-[10px] text-slate-300 hover:bg-slate-950/90"
                      >
                        ↺
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
