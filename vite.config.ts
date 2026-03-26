import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      },
    },
  ],
  server: {
    hmr: {
      overlay: false, // <--- ESTO DESACTIVA EL ERROR QUE ESTÁS VIENDO
    },
    port: 3000,
    https: {
      // Usamos los certificados de mkcert
      key: fs.readFileSync(path.resolve(__dirname, '.cert/localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '.cert/localhost.pem')),
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  worker: {
    format: 'es', // Obligatorio para la versión 0.12.x
    plugins: [],
  },
})