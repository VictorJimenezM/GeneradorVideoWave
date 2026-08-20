import { type Ref, type RefObject } from "react";
import CollapsibleSection from "../CollapsibleSection";
import FileDropZone from "../FileDropZone";

type AudioSourceMode = "file" | "youtube";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  fileInputRef: Ref<HTMLInputElement>;
  isMobile: boolean;
  isDecoding: boolean;
  isRecording: boolean;
  isPreviewing: boolean;
  onPickFile: (file: File | null) => void;
  fileMeta: string | null;
  audioSourceMode: AudioSourceMode;
  onAudioSourceModeChange: (mode: AudioSourceMode) => void;
  youTubeUrl: string;
  onYouTubeUrlChange: (url: string) => void;
  onPickYouTubeUrl: () => void;
  onPickYouTubeFile: (file: File | null) => void;
  youTubeFileInputRef: RefObject<HTMLInputElement>;
  onOpenCutter: () => void;
  hasAudio: boolean;
}

export default function AudioSection({
  collapsed,
  onToggle,
  fileInputRef,
  isMobile,
  isDecoding,
  isRecording,
  isPreviewing,
  onPickFile,
  fileMeta,
  audioSourceMode,
  onAudioSourceModeChange,
  youTubeUrl,
  onYouTubeUrlChange,
  onPickYouTubeUrl,
  onPickYouTubeFile,
  youTubeFileInputRef,
  onOpenCutter,
  hasAudio,
}: Props) {
  const busy = isDecoding || isRecording || isPreviewing;

  return (
    <CollapsibleSection
      title="Audio"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />}
      sectionBg="bg-indigo-950/30"
    >
      <div className="flex flex-col gap-1">
        {/* Toggle file / YouTube */}
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAudioSourceModeChange("file")}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 ${
              audioSourceMode === "file"
                ? "bg-indigo-500/30 text-indigo-200 ring-1 ring-indigo-500/40"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
            }`}
          >
            Subir archivo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAudioSourceModeChange("youtube")}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 ${
              audioSourceMode === "youtube"
                ? "bg-red-500/30 text-red-200 ring-1 ring-red-500/40"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-300"
            }`}
          >
            YouTube
          </button>
        </div>

        {/* File upload mode */}
        {audioSourceMode === "file" && (
          <>
            <FileDropZone onDrop={(file) => onPickFile(file)}>
              <input
                ref={fileInputRef}
                type="file"
                accept={isMobile ? "audio/*" : ".mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff,.opus"}
                aria-label="Seleccionar archivo de audio"
                disabled={busy}
                className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 transition-all duration-200 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-indigo-200 hover:file:bg-indigo-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
                onClick={(e) => { e.currentTarget.value = "" }}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
            </FileDropZone>
            {fileMeta ? (
              <div className="text-xs text-slate-400">{fileMeta}</div>
            ) : (
              <div className="text-xs text-slate-400">Selecciona un archivo de audio</div>
            )}
          </>
        )}

        {/* YouTube mode */}
        {audioSourceMode === "youtube" && (
          <>
            <input
              type="text"
              placeholder="Pega el link de YouTube aquí..."
              value={youTubeUrl}
              disabled={busy}
              onChange={(e) => onYouTubeUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && youTubeUrl.trim() && !busy) {
                  onPickYouTubeUrl();
                }
              }}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
            />
            <button
              type="button"
              disabled={busy || !youTubeUrl.trim()}
              onClick={onPickYouTubeUrl}
              className="w-full rounded-lg bg-red-500/20 px-2 py-1.5 text-xs font-medium text-red-200 transition-all duration-200 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Descargar en y2mate
            </button>
            <p className="text-[10px] text-slate-500 leading-tight">
              Se abrirá y2mate en una pestaña nueva. Descarga el MP3 y súbelo aquí.
            </p>
            <input
              ref={youTubeFileInputRef}
              type="file"
              accept=".mp3"
              aria-label="Subir MP3 descargado"
              disabled={busy}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950/60 text-xs text-slate-200 transition-all duration-200 file:mr-2 file:rounded-lg file:border-0 file:bg-red-500/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-red-200 hover:file:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-950"
              onClick={(e) => { e.currentTarget.value = "" }}
              onChange={(e) => onPickYouTubeFile(e.target.files?.[0] ?? null)}
            />
          </>
        )}

        {fileMeta && audioSourceMode === "file" && null}

        <p className="mt-1 text-xs text-amber-400/80">
          Revisa permisos si no encuentras tu audio
        </p>

        {hasAudio && (
          <button
            type="button"
            disabled={busy}
            onClick={onOpenCutter}
            className="w-full rounded-lg bg-amber-500/20 px-2 py-1.5 text-xs font-medium text-amber-200 transition-all duration-200 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <line x1="20" y1="4" x2="8.12" y2="15.88" />
              <line x1="14.47" y1="14.48" x2="20" y2="20" />
              <line x1="8.12" y1="8.12" x2="12" y2="12" />
            </svg>
            CORTA
          </button>
        )}
      </div>
    </CollapsibleSection>
  );
}
