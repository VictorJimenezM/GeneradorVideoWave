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

## Dual-canvas rendering pipeline

Two stacked `<canvas>` elements inside a `relative w-full aspect-square` container:

| Canvas | Ref | Z-index | Role |
|--------|-----|---------|------|
| **Fractal/Background** | `fractalCanvasRef` / `fractalCtxRef` | 0 (bottom) | Solid color, background image, or fractal animation |
| **Waveform** | `canvasRef` / `ctxRef` | 1 (top) | Circular waveform, tip, particles, title. Transparent bg. |

Both canvases are synced in a single `requestAnimationFrame` loop (`tick`).

### Drawing order (every frame)

1. **Fractal canvas** — always redrawn:
   - If fractal enabled + replace mode: `drawFractalBackground()` (fractal only)
   - Else: solid `bgColor` or cover-fit `bgImage`
   - If fractal enabled + overlay mode: fractal drawn on top with `globalAlpha = fractalOpacity`

2. **Waveform canvas background**:
   - Preview + first frame: `clearRect()` (transparent)
   - Preview + trail (loop on): black overlay `rgba(0,0,0,0.02)` via `fadeCanvas()`
   - Recording (all frames): `clearRect()` + `drawImage(fractalCanvas)` to composite background, then full waveform redraw from 0→head

3. **Waveform drawing** (unchanged): incremental segments, tip, particles, title, all on the transparent waveform canvas. The fractal canvas shows through the transparent areas.

### Why two canvases

The fractal animation requires clearing and redrawing every frame. Previously this also cleared the waveform trail. With two canvases:
- The fractal canvas is cleared/redrawn freely every frame
- The waveform canvas preserves its trail (fadeCanvas only affects the waveform, not the background)
- CSS layering composites them seamlessly

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

The user can upload a background image (or remove it). The image is rendered as a cover-fit background on the **fractal canvas** via `bgImage`/`bgImageRef`, with `drawImage()` in the fractal canvas section of `tick`. `clearCanvasSolid()` now only clears the waveform canvas (transparent).

## Docker

- `docker-compose up` builds from `node:18-alpine`, runs on port 3000.
- Volume mounts `.` to `/app` with `node_modules` excluded from bind mount.

## Deploy

- `vercel.json` sets the build command to `node node_modules/vite/bin/vite.js build`.

---

## Mejoras implementadas

1. **Efectos visuales en la onda** ✅
   - Brillo/glow (`shadowBlur` configurable 0‑1)
   - Modo gradiente (2 colores personalizables)
   - Modo arcoíris (cono de color HSL alrededor del círculo)
   - Partículas que emanan del cursor (`showParticles` + color configurable)

 2. **Sidebar colapsable** ✅
    - Secciones plegables: Audio, Onda, Exportar, Fondo, Fractal, Título
    - Animación de expansión/colapso con `max-h` + `opacity`

3. **Selector de resolución** ✅
   - 720p / 1080p / 4K antes de exportar
   - Botones tipo pill con estado activo

4. **Preview de waveform** ✅
   - Pequeño canvas con la forma de onda circular estática debajo del sidebar
   - Se actualiza al cambiar radio/intensidad/color

5. **Background presets** ✅
   - 5 presets de un clic: Oscuro, Púrpura, Cian, Esmeralda, Cálido
   - Al elegir un preset se limpia la imagen de fondo y se aplica el color sólido

 6. **Performance** ✅
    - `useCallback` en `toggleSection` y `applyBgPreset`
    - Parámetros de dibujo sincronizados por ref (`paramsRef`) para evitar re‑renders en el loop `tick`
    - Cálculos geométricos precomputados (cos/sin arrays)

7. **Dual-canvas rendering** ✅
    - Dos `<canvas>` superpuestos: fractal (fondo) + waveform (transparente)
    - El fractal se redibuja cada frame sin destruir el trail de la onda
    - CSS layering con `z-index` y `absolute/relative`

8. **Fondo fractal animado** ✅
    - 3 modos: Ripple (ondas concéntricas), Espiral (phyllotaxis), Mandala (simetría radial)
    - Modo capa: Fondo completo / Superposición
    - Parámetros ajustables por tipo (anillos, velocidad, colores, etc.)
    - Reactividad al audio con `getCurrentAmplitude()` (ventana de 256 samples)

## Pendientes (futuros)

9. **Detección de silencio** — opción para recortar silencio al inicio/final del audio.
10. **Múltiples tracks** — overlay de letra sincronizada o múltiples visualizadores simultáneos.
