import AudioVisualizer from "./components/AudioVisualizer";

export default function App() {
  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Visualizador de audio test ia
          </h1>
          <p className="text-sm text-slate-300">
            Base con Vite + React + Tailwind, lista para capturar micrófono y
            renderizar barras.
          </p>
        </header>

        <main>
          <AudioVisualizer />
        </main>
      </div>
    </div>
  );
}

