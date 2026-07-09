import CollapsibleSection from "../CollapsibleSection";
import { TITLE_PRESETS } from "../../utils/title";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  songTitle: string;
  setSongTitle: (v: string) => void;
  titlePreset: string;
  setTitlePreset: (v: string) => void;
  titleColor: string;
  setTitleColor: (v: string) => void;
  moveLayer: (layer: string, dir: number) => void;
  layerOrder: string[];
}

export default function TextSection({
  collapsed,
  onToggle,
  songTitle,
  setSongTitle,
  titlePreset,
  setTitlePreset,
  titleColor,
  setTitleColor,
  moveLayer,
  layerOrder,
}: Props) {
  const textTitleButtons = (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("letras", -1); }}
        disabled={layerOrder.indexOf("letras") <= 0}
        className="px-1 py-0.5 text-[9px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Subir capa">▲</button>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("letras", 1); }}
        disabled={layerOrder.indexOf("letras") >= layerOrder.length - 1}
        className="px-1 py-0.5 text-[9px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Bajar capa">▼</button>
    </>
  );
  return (
    <CollapsibleSection
      title="Texto"
      titleButtons={textTitleButtons}
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />}
      sectionBg="bg-rose-950/30"
    >
      <div className="flex flex-col gap-1">
        <input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Mi canción..."
          aria-label="Título de la canción"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
        />
        <select value={titlePreset} onChange={(e) => setTitlePreset(e.target.value)}
          aria-label="Estilo de título"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
        >
          {TITLE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} aria-label="Color de título" className="h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
          <span className="text-[11px] font-mono text-slate-500">{titleColor}</span>
        </div>
      </div>
    </CollapsibleSection>
  );
}
