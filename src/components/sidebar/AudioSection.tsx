import { type Ref } from "react";
import CollapsibleSection from "../CollapsibleSection";
import FileDropZone from "../FileDropZone";

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
}: Props) {
  return (
    <CollapsibleSection
      title="Audio"
      collapsed={collapsed}
      onToggle={onToggle}
      icon={<div aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />}
      sectionBg="bg-indigo-950/30"
    >
      <div className="flex flex-col gap-1">
        <FileDropZone onDrop={(file) => onPickFile(file)}>
          <input
            ref={fileInputRef}
            type="file"
            accept={isMobile ? "audio/*" : ".mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,.aiff,.opus"}
            aria-label="Seleccionar archivo de audio"
            disabled={isDecoding || isRecording || isPreviewing}
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

        <p className="mt-1 text-xs text-amber-400/80">
          Revisa permisos si no encuentras tu audio
        </p>
      </div>
    </CollapsibleSection>
  );
}
