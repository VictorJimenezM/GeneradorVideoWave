import CollapsibleSection from "../CollapsibleSection";
import { TITLE_FONTS, type TitleMotion } from "../../utils/title";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  allCollapsed?: boolean;
  showTitle: boolean;
  setShowTitle: (v: boolean) => void;
  songTitle: string;
  setSongTitle: (v: string) => void;
  titlePreset: string;
  setTitlePreset: (v: string) => void;
  titleColor: string;
  setTitleColor: (v: string) => void;
  titleFont: string;
  setTitleFont: (v: string) => void;
  titleWeight: "normal" | "bold";
  setTitleWeight: (v: "normal" | "bold") => void;
  titleItalic: boolean;
  setTitleItalic: (v: boolean) => void;
  titleAlign: "left" | "center" | "right";
  setTitleAlign: (v: "left" | "center" | "right") => void;
  titleValign: "top" | "middle" | "bottom";
  setTitleValign: (v: "top" | "middle" | "bottom") => void;
  titleSizeScale: number;
  setTitleSizeScale: (v: number) => void;
  titleCurve: number;
  setTitleCurve: (v: number) => void;
  titleMotion: TitleMotion;
  setTitleMotion: (v: TitleMotion) => void;
  titleMotionAmount: number;
  setTitleMotionAmount: (v: number) => void;
  moveLayer: (layer: string, dir: number) => void;
  layerOrder: string[];
}

const ALIGN_OPTS: { value: "left" | "center" | "right"; label: string }[] = [
  { value: "left", label: "Izq" },
  { value: "center", label: "Cent" },
  { value: "right", label: "Der" },
];
const VALIGN_OPTS: { value: "top" | "middle" | "bottom"; label: string }[] = [
  { value: "top", label: "Arr" },
  { value: "middle", label: "Med" },
  { value: "bottom", label: "Aba" },
];
const MOTION_OPTS: { value: TitleMotion; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "pulse", label: "Pulso" },
  { value: "float", label: "Flotar" },
  { value: "zoom", label: "Zoom" },
  { value: "rotate", label: "Rotación" },
];

export default function TextSection({
  collapsed, onToggle,
  allCollapsed,
  showTitle, setShowTitle,
  songTitle, setSongTitle,
  titlePreset, setTitlePreset,
  titleColor, setTitleColor,
  titleFont, setTitleFont,
  titleWeight, setTitleWeight,
  titleItalic, setTitleItalic,
  titleAlign, setTitleAlign,
  titleValign, setTitleValign,
  titleSizeScale, setTitleSizeScale,
  titleCurve, setTitleCurve,
  titleMotion, setTitleMotion,
  titleMotionAmount, setTitleMotionAmount,
  moveLayer, layerOrder,
}: Props) {
  const classicFonts = TITLE_FONTS.filter((f) => f.group === "clasicas");
  const extremeFonts = TITLE_FONTS.filter((f) => f.group === "extremas");
  const textTitleButtons = (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("letras", -1); }}
        disabled={layerOrder.indexOf("letras") <= 0}
        className="px-2.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Subir capa">▲</button>
      <button type="button" onClick={(e) => { e.stopPropagation(); moveLayer("letras", 1); }}
        disabled={layerOrder.indexOf("letras") >= layerOrder.length - 1}
        className="px-2.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Bajar capa">▼</button>
    </>
  );

  const segBtn = (active: boolean) =>
    `px-2 py-0.5 text-[10px] rounded transition-all ${active ? "bg-indigo-600 text-white" : "bg-slate-800/60 text-slate-400 hover:text-slate-200"}`;

  return (
    <CollapsibleSection
      title="Texto"
      titleButtons={textTitleButtons}
      enabled={showTitle}
      onToggleEnabled={setShowTitle}
      collapsed={collapsed}
      onToggle={onToggle}
      allCollapsed={allCollapsed}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />}
      sectionBg="bg-rose-950/30"
    >
      <div className={`flex flex-col gap-1.5 transition-all duration-200 ${showTitle ? "" : "opacity-40 pointer-events-none select-none"}`}>
        <input type="text" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Mi canción..."
          aria-label="Título de la canción"
          className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
        />
        <div className="flex items-center gap-1.5">
          <input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} aria-label="Color de título" className="h-7 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
          <span className="text-[11px] font-mono text-slate-500">{titleColor}</span>
        </div>

        <div className="border-t border-slate-800/60 pt-1.5 mt-0.5">
          <div className="text-[11px] font-semibold tracking-wider text-rose-400/60 uppercase pb-0.5">Serios</div>
          <select value={titleFont} onChange={(e) => setTitleFont(e.target.value)}
            aria-label="Fuente del título"
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
          >
            <optgroup label="Clásicas">
              {classicFonts.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </optgroup>
            <optgroup label="Extremas">
              {extremeFonts.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </optgroup>
          </select>
          <div className="flex gap-1 pt-1">
            <button type="button" onClick={() => setTitleWeight(titleWeight === "bold" ? "normal" : "bold")}
              aria-pressed={titleWeight === "bold"}
              className={`flex-1 ${segBtn(titleWeight === "bold")} font-bold`}>Negrita</button>
            <button type="button" onClick={() => setTitleItalic(!titleItalic)}
              aria-pressed={titleItalic}
              className={`flex-1 ${segBtn(titleItalic)} italic`}>Cursiva</button>
          </div>
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 w-12">Alinear</span>
            <div className="flex flex-1 gap-0.5">
              {ALIGN_OPTS.map((o) => (
                <button key={o.value} type="button" onClick={() => setTitleAlign(o.value)}
                  aria-pressed={titleAlign === o.value}
                  className={`flex-1 ${segBtn(titleAlign === o.value)}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 w-12">Vertical</span>
            <div className="flex flex-1 gap-0.5">
              {VALIGN_OPTS.map((o) => (
                <button key={o.value} type="button" onClick={() => setTitleValign(o.value)}
                  aria-pressed={titleValign === o.value}
                  className={`flex-1 ${segBtn(titleValign === o.value)}`}>{o.label}</button>
              ))}
            </div>
          </div>
          <label className="block pt-1">
            <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
              <span>Tamaño</span>
              <span className="tabular-nums text-slate-300">{titleSizeScale.toFixed(2)}×</span>
            </div>
            <input type="range" min={0.5} max={2} step={0.05} value={titleSizeScale} onChange={(e) => setTitleSizeScale(parseFloat(e.target.value))} className="mt-0.5 w-full" />
          </label>
        </div>

        <div className="border-t border-slate-800/60 pt-1.5 mt-0.5">
          <div className="text-[11px] font-semibold tracking-wider text-rose-400/60 uppercase pb-0.5">Creativos</div>
          <label className="block">
            <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
              <span>Texto en curva</span>
              <span className="tabular-nums text-slate-300">{titleCurve.toFixed(2)}</span>
            </div>
            <input type="range" min={-1} max={1} step={0.05} value={titleCurve} onChange={(e) => setTitleCurve(parseFloat(e.target.value))} className="mt-0.5 w-full" />
          </label>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 w-14">Movimiento</span>
            <select value={titleMotion} onChange={(e) => setTitleMotion(e.target.value as TitleMotion)}
              aria-label="Movimiento del título"
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              {MOTION_OPTS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <label className="block pt-1">
            <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
              <span>Intensidad</span>
              <span className="tabular-nums text-slate-300">{titleMotionAmount.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={titleMotionAmount} onChange={(e) => setTitleMotionAmount(parseFloat(e.target.value))} className="mt-0.5 w-full" />
          </label>
        </div>
      </div>
    </CollapsibleSection>
  );
}
