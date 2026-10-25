import { spawn } from 'node:child_process'
import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const standaloneApp = `${appRoot}.next/standalone/apps/product`

await mkdir(`${standaloneApp}/.next`, { recursive: true })
await cp(`${appRoot}.next/static`, `${standaloneApp}/.next/static`, { recursive: true })

const server = spawn(process.execPath, [`${standaloneApp}/server.js`], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT ?? '3001',
    HOSTNAME: process.env.HOSTNAME ?? '0.0.0.0',
  },
})
server.on('exit', (code) => process.exit(code ?? 0))
