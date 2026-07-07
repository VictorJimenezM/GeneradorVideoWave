import AudioVisualizerG from "./components/AudioVisualizerG";

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">

        {/* Header */}
        <header className="animate-fade-in space-y-4">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-xl shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gradient lg:text-4xl">
                SOUNDWAVE RENDER
              </h1>
              <p className="text-xs text-slate-500 tracking-wide mt-0.5">Simple Audio to Video</p>
            </div>
          </div>
          <p className="w-full text-sm leading-relaxed text-slate-400">
            El sonido no solo se escucha, también se ve. Sube tu audio, personaliza la estética y genera videos con espectros visuales únicos.
          </p>
        </header>

        {/* Main component */}
        <main className="animate-slide-up">
          <AudioVisualizerG />
        </main>

        {/* Example video */}
        <section className="glass glass-hover animate-fade-in overflow-hidden p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.6)]" />
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">
              Video de ejemplo
            </h2>
          </div>
          <a
            href="https://youtu.be/8DkfEmRST10"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-xl border border-slate-700/50 transition-all duration-200 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
          >
            <div className="relative aspect-video">
              <img
                src="https://i.ytimg.com/vi/8DkfEmRST10/maxresdefault.jpg"
                alt="Triste - Gerardo Arias (Muyuqi Reinterpretation)"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600/90 shadow-lg transition-transform group-hover:scale-110">
                  <svg className="ml-1 h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        </section>

        {/* Footer */}
        <footer className="animate-fade-in flex flex-col items-center gap-3 pb-8 text-center text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/59172531206"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 transition-all duration-200 hover:border-emerald-600/50 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat por WhatsApp
            </a>
            <span className="text-slate-700">·</span>
            <span>
              Hecho por{" "}
              <span className="font-medium text-slate-400">AUDIO-DOSIS</span>
              , La Paz — Bolivia
            </span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-500">Si buscas alguna mejora contáctame</span>
          </div>
          <p className="text-xs text-slate-600">
            Desarrollado con Vite + React + Tailwind, Cursos, Opencode y Ig Pickle
          </p>
        </footer>
        <p className="pb-4 text-center text-xs text-slate-600">Version 1.0.0</p>
      </div>
    </div>
  );
}
