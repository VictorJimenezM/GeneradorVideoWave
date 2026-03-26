import { useEffect, useMemo, useRef, useState } from "react";

type UseAudioAnalyserState = {
  isRunning: boolean;
  error: string | null;
  fftSize: number;
  data: Uint8Array;
  start: () => Promise<void>;
  stop: () => void;
};

export function useAudioAnalyser(fftSize = 2048): UseAudioAnalyserState {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Uint8Array>(() => new Uint8Array(fftSize / 2));

  const stableFftSize = useMemo(() => {
    // AnalyserNode.fftSize must be power of 2 between 32 and 32768
    const min = 32;
    const max = 32768;
    let v = Math.max(min, Math.min(max, Math.floor(fftSize)));
    v = 2 ** Math.round(Math.log2(v));
    return Math.max(min, Math.min(max, v));
  }, [fftSize]);

  useEffect(() => {
    setData(new Uint8Array(stableFftSize / 2));
  }, [stableFftSize]);

  const stop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    sourceRef.current = null;
    setIsRunning(false);
  };

  const start = async () => {
    setError(null);
    if (isRunning) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext: AudioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = stableFftSize;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      setData(new Uint8Array(buffer.length));
      setIsRunning(true);

      const tick = () => {
        const a = analyserRef.current;
        if (!a) return;
        a.getByteFrequencyData(buffer);
        setData(new Uint8Array(buffer));
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
    } catch (e: any) {
      stop();
      setError(e?.message ?? "No se pudo acceder al micrófono");
    }
  };

  useEffect(() => stop, []);

  return { isRunning, error, fftSize: stableFftSize, data, start, stop };
}

