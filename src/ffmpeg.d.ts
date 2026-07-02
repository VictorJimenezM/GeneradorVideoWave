interface FFmpegInstance {
  load(): Promise<void>;
  run(...args: string[]): Promise<void>;
  FS(method: "writeFile", path: string, data: Uint8Array): void;
  FS(method: "readFile", path: string): { buffer: ArrayBuffer };
  FS(method: "unlink", path: string): void;
  setLogger(callback: (obj: { type: string; message: string }) => void): void;
  setProgress(callback: (obj: { ratio: number }) => void): void;
  exit(): void;
}

interface Window {
  FFmpeg: {
    createFFmpeg(options?: { log?: boolean; corePath?: string }): FFmpegInstance;
    fetchFile(file: Blob | File | string): Promise<Uint8Array>;
  };
}
