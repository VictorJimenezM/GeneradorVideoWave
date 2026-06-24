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
- **Only component**: `src/components/AudioVisualizerG.tsx` (RecordRTC + canvas.captureStream + FFmpeg muxing)
- **Audio analysis hook**: `src/hooks/useAudioAnalyser.ts` (mic input via getUserMedia) — not used in App.tsx
- Single-page app, no routing, no monorepo.

## Framework quirks

- **Vite 2.9.18** — uses `@vitejs/plugin-react` v1. The build script calls `node node_modules/vite/bin/vite.js build` explicitly (also set in `vercel.json`).
- `@ffmpeg/ffmpeg` and `@ffmpeg/util` are excluded from Vite's `optimizeDeps` (required for ffmpeg.wasm 0.12.x).
- Worker format forced to `"es"` in vite config (required by ffmpeg.wasm 0.12.x).
- COEP/COOP headers (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) are set both in dev server and production Vite config — required for `SharedArrayBuffer` used by ffmpeg.wasm.
- HMR overlay disabled via `server.hmr.overlay: false`.
- Dev server on port **3000**.

## FFmpeg core files

Copied into `public/` at two paths:
- `public/ffmpeg-core.{js,wasm,worker.js}`
- `public/ffmpeg/ffmpeg-core.{js,wasm,worker.js}`

The app probes both paths at runtime. These files must exist in `dist/` after build for the offline FFmpeg feature to work.

## Video recording (MP4 with audio)

Uses `canvas.captureStream(30)` + `RecordRTC` to produce `.webm` (VP9). Two-layer audio capture for reliability:

1. **Primary**: `HTMLMediaElement.captureStream()` captures the audio track from the `<audio>` element and merges it with the canvas video track into a combined `MediaStream`. This gives audio in the `.webm` directly, without FFmpeg.
2. **Secondary**: After recording, **FFmpeg.wasm** remuxes to `.mp4` (H.264 + AAC via `libx264 -preset ultrafast`). If FFmpeg fails, the `.webm` (which already has audio from step 1) is downloaded as fallback.

FFmpeg uses explicit `-map` flags (`0:v:0` from webm, `1:a:0` from original file) and the original audio filename for format detection. The tab must be in the foreground during capture.

## Song title overlay

A text input in the sidebar (`songTitle` state) is rendered on the canvas via `drawTitle()` in the `tick` animation loop. Reads from `paramsRef.songTitle` and `paramsRef.titleColor` to avoid stale closures.

## AI image generation

Uses HuggingFace Inference API (`stabilityai/stable-diffusion-2-1`). The user provides their own HuggingFace API token. The generated image is automatically used as the canvas background (reuses the `bgImage`/`bgImageRef` system).

## Docker

- `docker-compose up` builds from `node:14-alpine`, runs on port 3000.
- Volume mounts `.` to `/app` with `node_modules` excluded from bind mount.

## Deploy

- `vercel.json` sets the build command to `node node_modules/vite/bin/vite.js build`.
