import CollapsibleSection from "../CollapsibleSection";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  applyQuickPreset: (key: string) => void;
  activePreset: string | null;
  presetSavedKeys: Set<string>;
  resetDefaults: () => void;
  saveCurrentToActivePreset: () => void;
}

export default function PresetsSection({
  collapsed,
  onToggle,
  applyQuickPreset,
  activePreset,
  presetSavedKeys,
  resetDefaults,
  saveCurrentToActivePreset,
}: Props) {
  const presets = [
    { label: "Croma", key: "croma" },
    { label: "Imagen", key: "image" },
    { label: "Fractal 1", key: "fractal1" },
    { label: "Fractal 2", key: "fractal2" },
    { label: "Fractal 3", key: "fractal3" },
  ];

  return (
    <CollapsibleSection
      title="Presets"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]" />}
      sectionBg="bg-amber-950/30"
    >
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-5 gap-1">
          {presets.map((p) => (
            <button key={p.key} type="button" onClick={() => applyQuickPreset(p.key)}
              aria-label={`Preset ${p.label}`}
              className={`rounded-lg px-1 py-0.5 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950 ${
                activePreset === p.key
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:border-indigo-500/50 hover:text-indigo-300"
              }`}
            >
              {p.label}{presetSavedKeys.has(p.key) ? "*" : ""}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button type="button" onClick={resetDefaults}
            aria-label="Restablecer valores predeterminados"
            className="w-full rounded-lg border border-slate-700/50 bg-slate-800/40 px-2 py-1 text-[11px] font-medium text-slate-400 transition-all duration-200 hover:border-slate-600/50 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
          >
            ← Resetear valores
          </button>
          <button type="button" onClick={saveCurrentToActivePreset}
            disabled={!activePreset}
            aria-label="Guardar preset activo"
            className="w-full rounded-lg px-1 py-0.5 text-[11px] font-medium bg-slate-800/60 text-amber-400 border border-slate-700/50 hover:border-amber-500/50 hover:text-amber-300 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
          >
            Guardar preset
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
}
