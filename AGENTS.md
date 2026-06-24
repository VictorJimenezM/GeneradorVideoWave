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
- **Active component**: `src/components/AudioVisualizerG.tsx` (RecordRTC + canvas.captureStream)
- **Inactive component**: `src/components/AudioVisualizer.tsx` (older version with commented FFmpeg offline export — not imported anywhere)
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

The app probes both paths at runtime. These files must exist in `dist/` after build for the offline export feature to work.

## Video recording

Uses `canvas.captureStream(30)` + `RecordRTC` to produce `.webm` (VP9). The tab must be in the foreground during capture. Download starts automatically when audio playback finishes.

## Docker

- `docker-compose up` builds from `node:14-alpine`, runs on port 3000.
- Volume mounts `.` to `/app` with `node_modules` excluded from bind mount.

## Deploy

- `vercel.json` sets the build command to `node node_modules/vite/bin/vite.js build`.
