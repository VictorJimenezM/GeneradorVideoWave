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
            El sonido no solo se escucha, también se ve.
          </p>

          <p className="text-sm text-slate-300">
            SOUNDWAVE RENDER es ideal para la generacion automatizada de espectros de audio en formato de video.
          </p>

          <p className="text-sm text-slate-300">
            Sube tu audio y personalizar la estética visual mediante la manipulación de variables de color,
            tamaño, grosor y color de la onda ademas de color de fondo.
          </p>

          <p>
            Desarrollado por AUDIO DOSIS con base con Vite + React + Tailwind.
          </p>

        </header>

        <main>
          <AudioVisualizer />
        </main>

          <p className="text-sm text-slate-300">
            Ejemplo de Soundwave Render       
          </p>

          <div class="contenedor-video">
            <iframe 
              width="560" 
              height="315" 
              src="https://www.youtube.com/embed/8DkfEmRST10" 
              title="Ejemplo SoundWave Render"
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          </div>

          <p className="text-sm text-slate-300">
            Mail: charlyjm@gmail.com          
          </p>

          <a href="https://wa.me/59172531206" target="_blank" rel="noopener noreferrer">
            Chat por WhatsApp
          </a>

          <p className="text-sm text-slate-300">
            Elaborado por AUDIO-DOSIS, La Paz-Bolivia        
          </p>

      </div>
    </div>
  );
}

