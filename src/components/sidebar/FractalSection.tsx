import { type Ref } from "react";
import CollapsibleSection from "../CollapsibleSection";
import type { FractalType } from "../../utils/fractals";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  fractalEnabled: boolean;
  setFractalEnabled: (v: boolean) => void;
  fractalType: FractalType;
  setFractalType: (v: FractalType) => void;
  fractalLayerMode: "replace" | "overlay";
  fractalOpacity: number;
  setFractalOpacity: (v: number) => void;
  fractalAudioReactive: boolean;
  setFractalAudioReactive: (v: boolean) => void;
  rippleRingCount: number;
  setRippleRingCount: (v: number) => void;
  rippleSpeed: number;
  setRippleSpeed: (v: number) => void;
  rippleAmplitude: number;
  setRippleAmplitude: (v: number) => void;
  rippleThickness: number;
  setRippleThickness: (v: number) => void;
  rippleColor1: string;
  setRippleColor1: (v: string) => void;
  rippleColor2: string;
  setRippleColor2: (v: string) => void;
  spiralDensity: number;
  setSpiralDensity: (v: number) => void;
  spiralRotationSpeed: number;
  setSpiralRotationSpeed: (v: number) => void;
  spiralTightness: number;
  setSpiralTightness: (v: number) => void;
  spiralDotSize: number;
  setSpiralDotSize: (v: number) => void;
  spiralColor1: string;
  setSpiralColor1: (v: string) => void;
  spiralColor2: string;
  setSpiralColor2: (v: string) => void;
  mandalaSegments: number;
  setMandalaSegments: (v: number) => void;
  mandalaRotationSpeed: number;
  setMandalaRotationSpeed: (v: number) => void;
  mandalaComplexity: number;
  setMandalaComplexity: (v: number) => void;
  mandalaLineWidth: number;
  setMandalaLineWidth: (v: number) => void;
  mandalaColor1: string;
  setMandalaColor1: (v: string) => void;
  mandalaColor2: string;
  setMandalaColor2: (v: string) => void;
  fractalPreviewRef: Ref<HTMLCanvasElement>;
  isDecoding: boolean;
  isRecording: boolean;
  moveLayer: (layer: string, dir: number) => void;
  layerOrder: string[];
}

export default function FractalSection({
  collapsed, onToggle,
  fractalEnabled, setFractalEnabled,
  fractalType, setFractalType,
  fractalLayerMode,
  fractalOpacity, setFractalOpacity,
  fractalAudioReactive, setFractalAudioReactive,
  rippleRingCount, setRippleRingCount,
  rippleSpeed, setRippleSpeed,
  rippleAmplitude, setRippleAmplitude,
  rippleThickness, setRippleThickness,
  rippleColor1, setRippleColor1,
  rippleColor2, setRippleColor2,
  spiralDensity, setSpiralDensity,
  spiralRotationSpeed, setSpiralRotationSpeed,
  spiralTightness, setSpiralTightness,
  spiralDotSize, setSpiralDotSize,
  spiralColor1, setSpiralColor1,
  spiralColor2, setSpiralColor2,
  mandalaSegments, setMandalaSegments,
  mandalaRotationSpeed, setMandalaRotationSpeed,
  mandalaComplexity, setMandalaComplexity,
  mandalaLineWidth, setMandalaLineWidth,
  mandalaColor1, setMandalaColor1,
  mandalaColor2, setMandalaColor2,
  fractalPreviewRef,
  isDecoding, isRecording,
  moveLayer, layerOrder,
}: Props) {
  return (
    <CollapsibleSection
      title="Fractal"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1 w-1 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(192,38,211,0.6)]" />}
      sectionBg="bg-fuchsia-950/30"
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
            <input type="checkbox" checked={fractalEnabled} onChange={(e) => setFractalEnabled(e.target.checked)}
              disabled={isDecoding || isRecording} aria-label="Activar fractal"
              className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-fuchsia-500 accent-fuchsia-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            />
            Activar
          </label>
          <div className="flex gap-0.5">
            <button type="button" onClick={() => moveLayer("fractal", -1)}
              disabled={layerOrder.indexOf("fractal") <= 0}
              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Subir capa">▲</button>
            <button type="button" onClick={() => moveLayer("fractal", 1)}
              disabled={layerOrder.indexOf("fractal") >= layerOrder.length - 1}
              className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800/60 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Bajar capa">▼</button>
          </div>
        </div>

        {fractalEnabled && (
          <>
            <select value={fractalType} onChange={(e) => setFractalType(e.target.value as FractalType)}
              disabled={isDecoding || isRecording}
              aria-label="Tipo de fractal"
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-200 focus:border-fuchsia-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            >
              <option value="ripple">Ondas (Ripple)</option>
              <option value="spiral">Espiral (Phyllotaxis)</option>
              <option value="mandala">Mandala</option>
            </select>

            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-400 transition-all duration-200 hover:text-slate-300">
              <input type="checkbox" checked={fractalAudioReactive} onChange={(e) => setFractalAudioReactive(e.target.checked)}
                disabled={isDecoding || isRecording} aria-label="Fractal reactivo al audio"
                className="h-3.5 w-3.5 cursor-pointer rounded border-slate-700 bg-slate-800 text-fuchsia-500 accent-fuchsia-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              />
              Reactivo al audio
            </label>

            {fractalLayerMode === "overlay" && (
              <label className="block">
                <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                  <span>Opacidad</span>
                  <span className="tabular-nums text-slate-300">{fractalOpacity.toFixed(2)}</span>
                </div>
                <input type="range" min={0.1} max={1} step={0.05} value={fractalOpacity} onChange={(e) => setFractalOpacity(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
              </label>
            )}

            <div className="flex justify-center pt-0.5 pb-1">
              <canvas ref={fractalPreviewRef} width={80} height={80}
                className="w-[80px] h-[80px] rounded-lg border border-slate-700/50 bg-slate-950/80"
                aria-label="Vista previa del fractal" />
            </div>

            {fractalType === "ripple" && (
              <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Ondas</div>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Anillos</span>
                    <span className="tabular-nums text-slate-300">{rippleRingCount}</span>
                  </div>
                  <input type="range" min={3} max={20} step={1} value={rippleRingCount} onChange={(e) => setRippleRingCount(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Velocidad</span>
                    <span className="tabular-nums text-slate-300">{rippleSpeed.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0.1} max={3} step={0.1} value={rippleSpeed} onChange={(e) => setRippleSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Amplitud</span>
                    <span className="tabular-nums text-slate-300">{rippleAmplitude}</span>
                  </div>
                  <input type="range" min={2} max={60} step={1} value={rippleAmplitude} onChange={(e) => setRippleAmplitude(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Grosor</span>
                    <span className="tabular-nums text-slate-300">{rippleThickness.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0.5} max={18} step={0.5} value={rippleThickness} onChange={(e) => setRippleThickness(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={rippleColor1} onChange={(e) => setRippleColor1(e.target.value)} aria-label="Color de ripple 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{rippleColor1}</span>
                    </div>
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={rippleColor2} onChange={(e) => setRippleColor2(e.target.value)} aria-label="Color de ripple 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{rippleColor2}</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {fractalType === "spiral" && (
              <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Espiral</div>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Densidad</span>
                    <span className="tabular-nums text-slate-300">{spiralDensity}</span>
                  </div>
                  <input type="range" min={50} max={500} step={10} value={spiralDensity} onChange={(e) => setSpiralDensity(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Rotación</span>
                    <span className="tabular-nums text-slate-300">{spiralRotationSpeed.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05} value={spiralRotationSpeed} onChange={(e) => setSpiralRotationSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Apertura</span>
                    <span className="tabular-nums text-slate-300">{spiralTightness.toFixed(2)}</span>
                  </div>
                  <input type="range" min={0.1} max={1.5} step={0.05} value={spiralTightness} onChange={(e) => setSpiralTightness(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Tamaño punto</span>
                    <span className="tabular-nums text-slate-300">{spiralDotSize.toFixed(1)}</span>
                  </div>
                  <input type="range" min={3} max={12} step={0.5} value={spiralDotSize} onChange={(e) => setSpiralDotSize(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={spiralColor1} onChange={(e) => setSpiralColor1(e.target.value)} aria-label="Color de espiral 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{spiralColor1}</span>
                    </div>
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={spiralColor2} onChange={(e) => setSpiralColor2(e.target.value)} aria-label="Color de espiral 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{spiralColor2}</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {fractalType === "mandala" && (
              <div className="border-t border-slate-800/60 pt-1 mt-1 space-y-1">
                <div className="text-[11px] font-semibold tracking-wider text-fuchsia-400/60 uppercase">Mandala</div>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Segmentos</span>
                    <span className="tabular-nums text-slate-300">{mandalaSegments}</span>
                  </div>
                  <input type="range" min={3} max={24} step={1} value={mandalaSegments} onChange={(e) => setMandalaSegments(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Rotación</span>
                    <span className="tabular-nums text-slate-300">{mandalaRotationSpeed.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.1} value={mandalaRotationSpeed} onChange={(e) => setMandalaRotationSpeed(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Complejidad</span>
                    <span className="tabular-nums text-slate-300">{mandalaComplexity}</span>
                  </div>
                  <input type="range" min={1} max={6} step={1} value={mandalaComplexity} onChange={(e) => setMandalaComplexity(parseInt(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <label className="block">
                  <div className="flex items-center justify-between gap-1 text-xs font-medium text-slate-400 tracking-wide">
                    <span>Grosor línea</span>
                    <span className="tabular-nums text-slate-300">{mandalaLineWidth.toFixed(1)}</span>
                  </div>
                  <input type="range" min={0.5} max={20} step={1} value={mandalaLineWidth} onChange={(e) => setMandalaLineWidth(parseFloat(e.target.value))} disabled={isDecoding || isRecording} className="mt-0.5 w-full" />
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 1</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={mandalaColor1} onChange={(e) => setMandalaColor1(e.target.value)} aria-label="Color de mandala 1" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{mandalaColor1}</span>
                    </div>
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-slate-400 tracking-wide">Color 2</div>
                    <div className="flex items-center gap-1">
                      <input type="color" value={mandalaColor2} onChange={(e) => setMandalaColor2(e.target.value)} aria-label="Color de mandala 2" className="mt-0.5 h-6 flex-1 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950" />
                      <span className="text-[10px] font-mono text-slate-500">{mandalaColor2}</span>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
