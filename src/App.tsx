import AudioVisualizer from "./components/AudioVisualizer";

export default function App() {
  return (
    <div className="min-h-full p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
          SOUNDWAVE RENDER
          </h1>
          
          <p className="text-sm text-slate-300">
            El sonido no solo se escucha, también se ve, ideal para la generacion rapida de videos donde la musica sea la protagonista.
          
            Desarrollado por Audio Dosis para la renderización automatizada de espectros de audio en formato de video.
            Permite a los usuarios subir archivos de sonido y personalizar la estética visual mediante la manipulación de variables de color,
            tamaño y grosor de la onda, ademas cuenta con la opción de cambiar el color del fondo para efectos croma.
          
            Base con Vite + React + Tailwind.
          </p>

        </header>

        <main>
          <AudioVisualizer />
        </main>
          <p className="text-sm text-slate-300">
            Elaborado por AUDIO-DOSIS, La Paz-Bolivia, mail: charlyjm@gmail.com, cel:+591 72531206
          </p>
      </div>
    </div>
  );
}

