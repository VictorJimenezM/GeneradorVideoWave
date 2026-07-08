# GeneradorVideoWave — Agent Guide

## Commands

### Docker (primary — dev environment)
```bash
docker compose up -d          # start dev server on port 3000 (background)
docker compose restart        # restart container (pick up code changes)
docker compose down           # stop container
docker compose logs -f        # follow logs
```

### Local (alternative — requires node/npm locally)
```bash
npm install          # install dependencies
npm run dev          # start dev server on port 3000
npm run build        # build to dist/
npm run preview      # serve dist/ locally
```

No test, lint, or typecheck scripts exist.

## File tree

```
src/
├── main.tsx                  # Entrypoint React (StrictMode → App)
├── App.tsx                   # Layout: header + AudioVisualizerG + footer + YouTube example
├── index.css                 # Tailwind layers, glass/custom scrollbar/range/color/file inputs
├── ffmpeg.d.ts               # Type declarations for FFmpeg.wasm (FFmpegInstance, Window.FFmpeg)
├── recordrtc.d.ts            # Type declaration for RecordRTC (any)
├── vite-env.d.ts             # Vite client types
├── components/
│   ├── AudioVisualizerG.tsx  # ~2758 lines — main component
│   ├── ConversionProgress.tsx # Cyberpunk terminal overlay during WebM→MP4 conversion
│   └── IAAsistentPanel.tsx   # IA Assistant checkbox + mode selector + BPM/beat status + playback controls
├── hooks/
│   ├── useAudioAnalyser.ts   # Micrófono hook (getUserMedia → AnalyserNode, NOT integrated)
│   └── useIAAsistent.ts      # IA Assistant hook: BPM detection, beat scheduling, parameter changes
└── utils/
    └── convertWebmToMp4.ts   # FFmpeg.wasm init + WebM→MP4 conversion (ultrafast preset)

public/
├── fondo_muestra_1.png
├── fondo_muestra_2.png
├── fondo_muestra_3.png
├── fondo_muestra_4.jpg
└── fondo_muestra_5.png

Infra: Dockerfile, Dockerfile.dev, docker-compose.yml, vercel.json, .cert/
```

## Internal components (in AudioVisualizerG.tsx)

| Component | Props | Purpose |
|-----------|-------|---------|
| `CollapsibleSection` | title, icon, collapsed, onToggle, children, sectionBg? | Accessible collapsible with `aria-expanded`/`aria-controls`, smooth max-h transition |
| `FileDropZone` | onDrop, children | Drag-and-drop wrapper with visual overlay feedback |

## Utilities & constants

| Symbol | Value/Purpose |
|--------|---------------|
| `TWO_PI` | `2π` |
| `GOLDEN_ANGLE` | `2.39996…` (phyllotaxis spiral, defined inside component) |
| `formatBytes(n)` | B/KB/MB/GB formatting |
| `clamp(n, min, max)` | Number clamping |
| `hexToRgba(hex, alpha)` | Hex → `rgba(r,g,b,a)` |

## Types

```typescript
type Point = { x: number; y: number };
type Particle = { x, y, vx, vy, life, maxLife, size };
type FractalType = "ripple" | "spiral" | "mandala";
type BgMode = "color" | "image" | "fractal";
type WaveGradientMode = "solid" | "gradient" | "rainbow";
```

## Key architecture

- **Entrypoint**: `src/main.tsx` → `App.tsx` → renders `<AudioVisualizerG />`
- **Main component**: `src/components/AudioVisualizerG.tsx`
- **Styling**: Tailwind CSS v3 (Inter, glass morphism, dark theme, custom scrollbar, animations)
- Single-page app, no routing, no monorepo.

## Audio decoding pipeline

1. `onPickFile` → `URL.createObjectURL` + `decodeAudioToMono`
2. `AudioContext.decodeAudioData()` → raw PCM
3. Mix all channels to mono (`Float32Array`)
4. Precompute circular cos/sin arrays mapping `pcmIndex → angle = (idx/total)*2π - π/2`
5. `fftLikePointsPerCircle = 2600` — sample step = `max(1, total/2600)`

Audio is **not** streamed through Web Audio API nodes; raw samples are indexed directly by `currentTime / duration`.

## Sidebar order

| # | Section | Content |
|---|---------|---------|
| 0 | — | **IA Assistant** checkbox + mode (agresivo/sensible) + BPM + compás + mini waveform + **Volumen slider + [Previsualizar \| Detener] + Loop** + botón **Colapsar** + botón **↺ Reset** |
| 1 | **Audio** (collapsible, open by default) | File input + drag-drop + file info |
| 2 | **Presets** (collapsible) | Grid 5 presets + [← Resetear valores \| Guardar preset] |
| 3 | **Onda** (collapsible) | **Mostrar onda** checkbox, **Forma** (radio, intensidad, grosor, brillo), **Color** (color picker + gradiente select side by side, conditional Color 1/2) |
| 4 | **Fondo** (collapsible) | 2 tabs: **Color** (5 presets + picker), **Imagen** (5 preset select + file upload + remove) |
| 5 | **Fractal** (collapsible) | Activar checkbox, tipo (ripple/spiral/mandala), reactivo al audio, opacidad, preview (80×80) + controles específicos por tipo |
| 6 | **Partículas** (collapsible) | Activar checkbox, color picker, opacidad slider |
| 7 | **Texto** (collapsible) | Input título, selector estilo (10 presets), color picker |
| 8 | **Exportar** (collapsible) | Resolución 720p/1080p/4K, botón **Grabar y descargar** (icono rojo), advertencia foreground |

## Preset system

| Type | Count | Storage |
|------|-------|---------|
| Quick presets (built-in) | 5 (croma, image, fractal1-3) | Hardcoded in `applyQuickPreset` |
| Saved presets | N | `localStorage: quickPreset_{key}` + `quickPreset_saved` index |
| BG color presets | 5 (dark, purple, cyan, emerald, warm) | Static `bgPresets` array |
| Title presets | 10 (bottom-center, bottom-left, …, compact) | Static `TITLE_PRESETS` array |
| BG image presets | 5 (`fondo_muestra_{1..5}`) | `/public/` files |

Reset defaults: single `resetDefaults()` button restores all 30+ state variables.

## State defaults

- `showWave` = `true`
- `showParticles` = `false`
- `bgMode` = `"color"`
- `bgColor` = `"#000000"`
- `fractalEnabled` = `false`
- `fractalType` = `"ripple"`
- `fractalLayerMode` = `"overlay"`
- `fractalOpacity` = `0.8`
- `fractalAudioReactive` = `true`
- `particleColor` = `"#a78bfa"`
- `particleOpacity` = `0.7`
- `collapsedSections` starts with `"presets"`, `"wave"`, `"bg"`, `"fractal"`, `"particles"`, `"text"`, `"export"` (todo colapsado excepto Audio)
- Volume = 0.7, Loop = true
- `radiusRatio` = `0.60`, `intensity` = `0.80`, `strokeWidth` = `1.0`, `glowIntensity` = `0.40`
- `waveColor` = `"#ffffff"`, `waveGradientMode` = `"solid"`, `gradColor1` = `"#6366f1"`, `gradColor2` = `"#a855f7"`
- `songTitle` = `""`, `titleColor` = `"#ffffff"`, `titlePreset` = `"bottom-center"`
- `resolution` = `"1080p"`, `loop` = `true`, `isLoopingUI` = `true`

## Dual-canvas rendering pipeline

Two stacked `<canvas>` inside `relative w-full aspect-square`:

| Canvas | Ref | Z-index | Role |
|--------|-----|---------|------|
| **Fractal/Background** | `fractalCanvasRef` | 0 | Solid color, cover-fit bg image, or fractal animation |
| **Waveform** | `canvasRef` | 1 | Circular waveform, tip, particles, title. Transparent bg. |

### Drawing order (every frame in `tick()`)

1. **Fractal canvas** — full redraw:
   - If fractal enabled + replace → fractal only
   - Else → solid `bgColor` or cover-fit `bgImage`
   - If fractal enabled + overlay → fractal on top with `globalAlpha = fractalOpacity`

2. **Waveform canvas background**:
   - First frame: `clearRect()` (transparent)
   - Loop/trail active: `source-atop` black overlay `rgba(0,0,0,0.02)` — only darkens waveform pixels
   - Recording: `clearRect()` + `drawImage(fractalCanvas)`, then full redraw from 0→head

3. **Waveform drawing** (`drawAdditionalPath`):
   - Mid-point interpolation between samples for smoother curves
   - Glow pass: `shadowBlur = 25 * glowIntensity` behind main stroke
   - Main stroke: 3 modes — **solid** (waveColor), **gradient** (linear 2-stop), **rainbow** (conic HSL 0-360°)
   - Draws incrementally from `lastDrawnPointIndex → head`

4. **Tip** (`drawTip`): circle at head position, radius `max(2, min(10, lineWidth * 0.9))`

5. **Title** (`drawTitle`): rendered per preset config (font, size, align, position)

6. **Particles** (`updateAndDrawParticles`): update physics, draw fading circles

### Tip clearing
- Only clears previous tip when `showParticles` is active
- Uses circular clip (`arc` + `clip`) instead of square `clearRect` to avoid visible artifacts on the trail

## Particle system

- **Emit**: 2 particles/frame at tip when `showParticles && (preview|record)`
- **Properties**: position, velocity (random angle 0.5-2.5 speed), life (0.5-2s), size (1-4px)
- **Cap**: 300 max (oldest spliced)
- **Rendering**: `globalAlpha = life * particleOpacity`, size shrinks with life

## Fractal types

| Type | Algorithm | Key params |
|------|-----------|------------|
| **Ripple** | Concentric sine-modulated rings: `r = baseR + sin(theta * freq + phase) * amp` | rings (3-20), speed (0.1-3), amplitude (2-60), thickness (0.5-18) |
| **Spiral** | Phyllotaxis: `r = sqrt(i) * scale, angle = i * GA + rotation` | density (50-500), rotation (0-1), tightness (0.1-1.5), dotSize (3-12) |
| **Mandala** | Mirrored arc segments: `arc(0,0,r, -halfArc, +halfArc) × segments × complexity layers` | segments (3-24), rotation (0-1), complexity (1-6), lineWidth (0.5-20) |

Each has a static preview canvas (80×80) in the UI.

### Fractal audio-reactive multipliers

| Parameter | Formula | Max multiplier (amp=1) |
|-----------|---------|----------------------|
| Ripple speed | `0.5 + amp * 0.5` | 1.0× |
| Ripple amplitude | `0.3 + amp * 0.7` | 1.0× |
| Spiral rotation | `0.7 + amp * 0.15` | 0.85× |
| Spiral scale | `0.6 + amp * 0.8` | 1.4× |
| Spiral dotSize | `0.5 + amp * 0.8` | 1.3× |
| Mandala rotation | `0.5 + amp * 0.375` | 0.875× |

## IA Assistant (feat_ia_controller)

Sistema de control automático de parámetros visuales sincronizado con el ritmo de la canción.

### Componentes

| Archivo | Rol |
|---------|------|
| `src/hooks/useIAAsistent.ts` | Hook: BPM detection, beat scheduling, parameter changes |
| `src/components/IAAsistentPanel.tsx` | UI: checkbox + modo + BPM/beat display + mini waveform + controles de playback (volumen, previsualizar/detener, loop, colapsar, reset) |

### Tipos

```typescript
type IAIAssistantMode = "aggressive" | "sensitive";
```

### BPM Detection

- **Algoritmo**: Autocorrelación sobre envolvente de energía RMS (ventana 2048, hop 512)
- Diferenciación para detección de onsets → autocorrelación → mejor lag → BPM
- Rango detectable: 70–200 BPM
- Fallback: 120 BPM si la señal es muy corta
- Se ejecuta en el `useEffect` al activarse o al cargar nuevo audio

### Resolución dinámica según amplitud

El intervalo de beat se ajusta en tiempo real según `getCurrentAmplitude()`:

| Amplitud | Resolución | Factor |
|----------|-----------|--------|
| > 0.5 | **Corchea** | interval/2 |
| 0.2–0.5 | **Negra** | interval |
| < 0.2 | **Blanca** | interval × 2 |

### Scheduled changes (`applyBeatChanges`)

Disparados en el `tick()` cada vez que se cruza un beat. No modifican forma de la onda (intensity, strokeWidth, radiusRatio, glowIntensity se mantienen intactos).

| Cada X beats | Cambios | Prob (agresivo) | Prob (sensible) |
|-------------|---------|:---:|:---:|
| 4 | waveColor, waveGradientMode, gradColor1/2, showParticles, particleColor | 85% | 45% |
| 8 | fractalEnabled, fractalType, rippleSpeed, rippleAmplitude, rippleThickness, rippleColor1, rippleColor2 | 100% | 70% |
| 16 | spiralRotationSpeed, spiralTightness, spiralDotSize, mandalaRotationSpeed, mandalaLineWidth, fractalOpacity, spiralColor1, mandalaColor1 | 100% | 90% |

### Integración en AudioVisualizerG.tsx

- **Hook** llamado después de `paramsRef` useEffect (línea ~466)
- **Ref** `iaStateRef` para acceso desde el closure del `tick()` sin re-renders
- **Tick**: `ia.update(currentTime, getCurrentAmplitude())` después de `paramsRef.current` (línea ~1390)
- **Panel**: `<IAAsistentPanel>` renderizado al inicio del sidebar (antes de Reset)
- **sampleRate** guardado en `sampleRateRef` durante `decodeAudioToMono`
- **Fondo negro estático**: al activarse la IA, un `useEffect` pone `bgMode="fractal"`, `bgColor="#000000"`, `fractalEnabled=true`, `fractalLayerMode="overlay"`, además de fijar radio=0.50, intensidad=0.70, grosor=1.0, opacidad partículas=0.10 y bgImage=null. El fondo nunca cambia mientras la IA está activa.
- **Visibilidad de controles fractales**: los controles del fractal se muestran también cuando `fractalEnabled=true` aunque `bgMode !== "fractal"` (para que el usuario vea los cambios de la IA).
- **Playback controls**: Volume slider, Previsualizar/Detener buttons y Loop checkbox renderizados dentro de IAAsistentPanel (debajo del mini waveform), eliminados de la sección Exportar.
- **Botón Colapsar y ↺ Reset**: renderizados dentro del panel IA (prop `onCollapseAll` y `onResetDefaults`).

## Canvas sizing

| Mode | Strategy |
|------|----------|
| **Preview** | `syncCanvasSize()` — DPR-aware, responsive to container `getBoundingClientRect()` |
| **Recording** | `setCanvasVideoSize()` — fixed square: 720 / 1080 / 2160 px |
| **Fractal** | `syncFractalCanvasSize()` — mirrors waveform canvas size |

## Video recording (.webm → MP4 via FFmpeg.wasm)

Uses `canvas.captureStream(30)` + RecordRTC → `.webm` (VP9). Audio captured via `HTMLMediaElement.captureStream()` (fallback: Web Audio API `createMediaStreamDestination`). Combined `MediaStream` feeds RecordRTC. Tab must be in foreground.

After recording, the WebM blob is converted to MP4 (H.264 + AAC) using FFmpeg.wasm with `-preset ultrafast` (~3-6s for a 4-min song). Output filename matches the input file (e.g. `cancion.mp3` → `cancion.mp4`).

| Resolution | px | Bitrate |
|------------|----|---------|
| 720p | 720 | 8 Mbps |
| 1080p | 1080 | 20 Mbps |
| 4K | 2160 | 50 Mbps |

```mermaid
flowchart LR
    A[Audio file] --> B[<audio> element]
    B --> C[HTMLMediaElement.captureStream]
    C --> D[Audio MediaStreamTrack]
    F[canvas.captureStream 30fps] --> E[Video MediaStreamTrack]
    D & E --> G[Combined MediaStream]
    G --> H[RecordRTC]
    H --> I[.webm blob]
    I --> J[FFmpeg.wasm]
    J --> K[.mp4 download]
```

FFmpeg.wasm is loaded on mount from CDN (`@ffmpeg/ffmpeg@0.11.6` + `@ffmpeg/core@0.11.0`). If loading fails, falls back to direct WebM download.

## Key functions

| Function | Purpose |
|----------|---------|
| `stopAll()` | Stop audio, cancel RAF, stop recorder, reset preview/record state |
| `resetDefaults()` | Reset all 30+ visual parameters to factory defaults |
| `prepareAndPlay(opts)` | Set audio src, volume, loop, play |
| `handlePreview()` | Start animation loop in `"preview"` mode |
| `handleGenerateAndDownloadRealtime()` | Start recording in `"record"` mode |
| `downloadBlob(blob, extension, customName?)` | Download blob with filename derived from input file or fallback `audio-visualizer-{Date}` |
| `redrawBackgroundCanvas()` | Redraw fractal canvas when params change (idle only) |
| `loadSampleBgImage()` | Load first bg image preset (with procedural fallback) |

## `useAudioAnalyser` hook (not integrated)

Standalone hook at `src/hooks/useAudioAnalyser.ts`:
- Uses `getUserMedia({ audio: true })` → `AnalyserNode` (`fftSize` normalized to power-of-2)
- `requestAnimationFrame` loop reads `getByteFrequencyData`
- Returns `{ isRunning, error, fftSize, data: Uint8Array, start, stop }`
- **Not used** by `AudioVisualizerG` — available for microphone visualization features.

## Versioning

- La versión se define como string en `src/App.tsx` al final del layout
- Se actualiza manualmente antes de cada push a la rama `main`
- Formato semver: `MAJOR.MINOR.PATCH`
  - **MAJOR**: cambios incompatibles o rediseño visual grande
  - **MINOR**: nuevas funcionalidades, secciones o integraciones
  - **PATCH**: bugfixes, ajustes UI, refactors menores

## Pending tasks

- [x] **Conversión blob webm → mp4**: convertir el blob generado por RecordRTC (.webm VP9) a MP4 (H.264/AAC) para descarga, usando FFmpeg.wasm (ultrafast preset). La descarga es `.mp4` con el mismo nombre del archivo de entrada.

