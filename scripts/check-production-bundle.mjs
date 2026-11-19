#!/usr/bin/env node
// Guards the deploy against shipping dev URLs.
//
// NEXT_PUBLIC_* values are inlined into the bundle by `next build`, while the
// wrangler `vars` only exist at runtime. A build that runs without them bakes
// the defaults from apps/*/src/lib/env.ts and apps/landing/src/components/site.tsx
// (http://localhost:...) into the browser bundle, and the deployed app then
// calls the visitor's own machine.
//
// Runs after the build, before `wrangler deploy`:
//   node scripts/check-production-bundle.mjs product
//   node scripts/check-production-bundle.mjs landing
//   node scripts/check-production-bundle.mjs          # both
//
// The fallback defaults match deploy.yml and the package.json deploy scripts.
// Override with the same NEXT_PUBLIC_* variables used for the build.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const expected = {
  api: process.env.NEXT_PUBLIC_API_URL ?? 'https://replo.dawoodmsam422.workers.dev',
  app: process.env.NEXT_PUBLIC_APP_URL ?? 'https://replo.dawoodmsam422.workers.dev/app',
  site: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://replo.dawoodmsam422.workers.dev',
}
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '/app').replace(/\/$/, '')

const TEXT = new Set(['.html', '.txt', '.xml', '.json'])
const SCRIPT = new Set(['.js', '.mjs', '.html'])

function* walk(dir) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    throw new Error(`missing build output: ${dir} (run the build first)`)
  }
  for (const entry of entries) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

function extension(path) {
  const dot = path.lastIndexOf('.')
  return dot === -1 ? '' : path.slice(dot)
}

const failures = []
const notes = []

function checkProduct() {
  const dir = 'apps/product/.open-next/assets'
  const resolved = new Map()
  const pattern = /NEXT_PUBLIC_(API|APP)_URL:"([^"]*)"/g

  for (const path of walk(dir)) {
    if (!SCRIPT.has(extension(path))) continue
    const source = readFileSync(path, 'utf8')
    for (const match of source.matchAll(pattern)) {
      const [, key, value] = match
      if (!value) continue
      resolved.set(key, value)
    }
  }

  for (const [key, variable] of [
    ['API', 'NEXT_PUBLIC_API_URL'],
    ['APP', 'NEXT_PUBLIC_APP_URL'],
  ]) {
    const value = resolved.get(key)
    if (!value) {
      failures.push(`product: ${variable} was not found in ${dir} — was the build run?`)
      continue
    }
    const want = key === 'API' ? expected.api : expected.app
    if (value !== want) failures.push(`product: ${variable} is "${value}", expected "${want}"`)
    if (value.includes('localhost')) failures.push(`product: ${variable} is a dev URL: ${value}`)
  }

  if (basePath) {
    try {
      statSync(join(dir, basePath, '_next'))
    } catch {
      failures.push(
        `product: assets are not under ${basePath}/_next — build without NEXT_PUBLIC_BASE_PATH?`,
      )
    }
  }

  notes.push(
    `product: api=${resolved.get('API') ?? '?'} app=${resolved.get('APP') ?? '?'} base=${basePath || '/'}`,
  )
}

function checkLanding() {
  const dir = 'apps/landing/out'
  const texts = []

  for (const path of walk(dir)) {
    if (!TEXT.has(extension(path))) continue
    texts.push([path, readFileSync(path, 'utf8')])
  }

  const joined = texts.map(([, source]) => source).join('\n')
  const loginLink = `${expected.app}/login`
  if (!joined.includes(loginLink)) {
    failures.push(`landing: no sign-in link to ${loginLink} in ${dir}`)
  }
  if (/https?:\/\/localhost[:\/]/.test(joined)) {
    const offender = texts.find(([, source]) => /https?:\/\/localhost[:\/]/.test(source))
    failures.push(`landing: dev URL in ${offender?.[0] ?? dir}`)
  }
  if (!joined.includes(`${expected.site}/sitemap.xml`)) {
    failures.push(`landing: robots.txt/sitemap do not point at ${expected.site}`)
  }

  notes.push(`landing: login=${loginLink} site=${expected.site}`)
}

const targets = process.argv.slice(2)
if (targets.length === 0) targets.push('product', 'landing')
for (const target of targets) {
  if (target === 'product') checkProduct()
  else if (target === 'landing') checkLanding()
  else {
    console.error(`unknown target "${target}" (use product or landing)`)
    process.exit(2)
  }
}

for (const note of notes) console.log(note)
if (failures.length > 0) {
  console.error('\nProduction bundle check failed:')
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error(
    '\nSet NEXT_PUBLIC_API_URL / NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL for the build ' +
      '(see deploy.yml and the cf:*:deploy scripts) and rebuild.',
  )
  process.exit(1)
}
console.log('production bundle check: ok')
