# GeneradorVideoWave — Agent Guide

## Commands
```bash
npm install          # install dependencies
npm run dev          # start dev server on port 3000
npm run build        # build to dist/ (uses node_modules/.bin/vite)
npm run preview      # serve dist/ locally
```

No test, lint, or typecheck scripts exist. `tsc` is not configured as a script.

## Key architecture

- **Entrypoint**: `src/main.tsx` → `App.tsx` → renders `<AudioVisualizerG />`
- **Only component**: `src/components/AudioVisualizerG.tsx` (RecordRTC + canvas.captureStream + combined MediaStream)
- **Audio analysis hook**: `src/hooks/useAudioAnalyser.ts` (mic input via getUserMedia) — not used in App.tsx
- **Styling**: Tailwind CSS v3 with custom theme (Inter font, glass morphism, dark theme, custom scrollbar, animations)
- Single-page app, no routing, no monorepo.

## Framework quirks

- **Vite 2.9.18** — uses `@vitejs/plugin-react` v1. The build script calls `node node_modules/vite/bin/vite.js build` explicitly (also set in `vercel.json`).
- HMR overlay disabled via `server.hmr.overlay: false`.
- Dev server on port **3000**.
- Docker builds from `node:18-alpine`.

## Visual style

- **Theme**: Dark with indigo/cyan accents, glass cards (`backdrop-blur-xl border-white/10`), subtle animated gradient background.
- **Font**: Inter (Google Fonts).
- **Animations**: `fade-in`, `slide-up`, `glow-pulse`, `gradient` (bg shift 8s).
- **Custom scrollbar**, custom `<input type="range">` and `<input type="color">` styling.
- Utility classes in `src/index.css`: `.glass`, `.glass-hover`, `.glow-border`, `.text-gradient`.

## Video recording (.webm with audio)

Uses `canvas.captureStream(30)` + `RecordRTC` to produce `.webm` (VP9). Audio is captured from the `<audio>` element via `HTMLMediaElement.captureStream()` and merged with the canvas video track into a combined `MediaStream`. The `.webm` is downloaded directly after recording — no FFmpeg, no remuxing.

Audio capture flow:
1. `audioEl.src` is set **before** calling `captureStream()` (required)
2. `canvas.captureStream(30)` → video track
3. `audioEl.captureStream()` → audio track (falls back to video-only if unavailable, e.g. Firefox)
4. `new MediaStream([...videoTracks, ...audioTracks])` → combined stream
5. RecordRTC receives the combined stream → `.webm` with audio

The tab must be in the foreground during capture.

## Song title overlay

A text input in the sidebar (`songTitle` state) is rendered on the canvas via `drawTitle()` in the `tick` animation loop. Reads from `paramsRef.songTitle` and `paramsRef.titleColor` to avoid stale closures.

## Background image

The user can upload a background image (or remove it). The image is rendered as a cover-fit background on the canvas via `bgImage`/`bgImageRef`, with `drawImage()` in the `clearCanvasSolid()` function.

## Docker

- `docker-compose up` builds from `node:18-alpine`, runs on port 3000.
- Volume mounts `.` to `/app` with `node_modules` excluded from bind mount.

## Deploy

- `vercel.json` sets the build command to `node node_modules/vite/bin/vite.js build`.

---

## Puntos a mejorar (futuros)

1. **Efectos visuales en la onda** — glow/neón, partículas, gradientes animados, múltiples capas en la visualización circular.
2. **Sidebar colapsable** — secciones plegables para ordenar los controles cuando hay muchos.
3. **Selector de resolución** — elegir 720p, 1080p, 4K antes de exportar.
4. **Preview de waveform** — mostrar la forma de onda estática en la UI antes de reproducir.
5. **Background presets** — fondos predefinidos de un clic (gradientes, sólidos, patrones).
6. **Performance** — optimizar el loop de animación `tick`, reducir re-renders innecesarios, memoizar cálculos costosos.
7. **Detección de silencio** — opción para recortar silencio al inicio/final del audio.
8. **Múltiples tracks** — overlay de letra sincronizada o múltiples visualizadores simultáneos.
