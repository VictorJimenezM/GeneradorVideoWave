import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { randomBytes } from 'crypto'

const execFileAsync = promisify(execFile)

const certDir = path.resolve('.cert')
const httpsConfig =
  fs.existsSync(path.join(certDir, 'key.pem')) && fs.existsSync(path.join(certDir, 'cert.pem'))
    ? { key: fs.readFileSync(path.join(certDir, 'key.pem')), cert: fs.readFileSync(path.join(certDir, 'cert.pem')) }
    : false

function parseJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) } catch { reject(new Error('JSON inválido')) }
    })
    req.on('error', reject)
  })
}

const YTDLP_ARGS = ['--js-runtimes', 'deno', '--extractor-args', 'youtube:player_client=android', '--no-playlist']

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
          next();
        });
      },
    },
    {
      name: 'youtube-audio-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'POST' || req.url !== '/api/youtube-audio') {
            return next()
          }

          let tmpFile = ''
          try {
            const { url } = await parseJsonBody(req)
            if (!url || !/youtu(\.be|be\.com)/.test(url)) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'URL de YouTube inválida' }))
              return
            }

            const { stdout: titleRaw } = await execFileAsync('yt-dlp', [
              ...YTDLP_ARGS, '--print', '%(title)s', url
            ], { timeout: 30000 })
            const videoTitle = titleRaw.trim()

            const hash = randomBytes(8).toString('hex')
            tmpFile = `/tmp/ytaudio_${hash}.mp3`

            await execFileAsync('yt-dlp', [
              ...YTDLP_ARGS,
              '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
              '-o', tmpFile, url
            ], { timeout: 300000 })

            const audioBuffer = fs.readFileSync(tmpFile)

            res.writeHead(200, {
              'Content-Type': 'audio/mpeg',
              'Content-Disposition': `attachment; filename="${videoTitle}.mp3"`,
              'X-Video-Title': encodeURIComponent(videoTitle),
            })
            res.end(audioBuffer)
          } catch (e: any) {
            console.error('[youtube-audio]', e?.message)
            const status = e?.killed ? 504 : 500
            res.writeHead(status, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: e?.message ?? 'Error al descargar audio' }))
          } finally {
            if (tmpFile) {
              try { fs.unlinkSync(tmpFile) } catch { /* ignore */ }
            }
          }
        })
      },
    },
  ],
  server: {
    hmr: {
      overlay: false,
    },
    port: 3000,
    https: httpsConfig,
    host: true,
  },
})
