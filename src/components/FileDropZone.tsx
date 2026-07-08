import { useState, type ReactNode } from "react";

export default function FileDropZone({
  onDrop,
  children,
}: {
  onDrop: (file: File) => void;
  children: ReactNode;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onDrop(file);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative transition-all duration-200 ${
        isDragOver
          ? "after:absolute after:inset-0 after:rounded-lg after:border-2 after:border-dashed after:border-indigo-400/60 after:bg-indigo-500/10"
          : ""
      }`}
    >
      {children}
    </div>
  );
}
