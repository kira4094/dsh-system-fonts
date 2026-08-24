// dsh-system-fonts — host half.
//
// Enumerates every font installed on the system (Windows registry HKLM + HKCU
// and the user-level fonts directory) and exposes them to the browser half as
// JSON over the harness web server. The browser half (lib/client.js) shows a
// Settings → General picker that lets you choose any of these fonts for the UI
// font and/or the code font.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROUTE = '/plugins/dsh-system-fonts/fonts'
const name = 'dsh-system-fonts'
const inject = ['webServer']

/** Regex to strip the trailing " (TrueType)"/"(OpenType)"/" (All res)" decoration. */
const DECOR = /\s*\((TrueType|OpenType|All res|Fontresource)\)\s*$/i

/** Common weight/style words (space- or dash-separated) to strip from a family name. */
const WEIGHT_WORDS = /\s*[-_]?\s*(Regular|Bold|Italic|Light|Medium|SemiBold|Semibold|ExtraBold|ExtraLight|Thin|Black|Hairline|Book|Demi|Heavy|Roman)\s*$/i

/** Reduce a family name to its base name (drop weight/style suffix). */
function baseFamily(name) {
  let s = name.replace(DECOR, '').trim()
  // strip one trailing weight/style word, repeat for e.g. "Bold Italic"
  for (let i = 0; i < 2; i++) {
    const next = s.replace(WEIGHT_WORDS, '').trim()
    if (next === s) break
    s = next
  }
  return s
}

/**
 * Read Windows font registry keys into a list of { family, file } entries.
 * Returns [] when the platform or registry is unavailable.
 */
function readRegistryFonts() {
  const out = []
  const roots = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts',
    'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'
  ]
  for (const root of roots) {
    try {
      const raw = execFileSync('reg', ['query', root, '/s'], { encoding: 'utf8' })
      for (const line of raw.split(/\r?\n/)) {
        const m = /^\s*(.+?)\s+REG_SZ\s+(.+)$/.exec(line)
        if (!m) continue
        const fullName = m[1].trim()
        const file = m[2].trim()
        const family = baseFamily(fullName)
        if (family.length > 0 && file.length > 0) out.push({ family, file })
      }
    } catch {
      // registry unavailable — fall through to the directory scan
    }
  }
  return out
}

/** Dedupe by family (case-insensitive), keeping the first (HKLM) occurrence. */
function uniqueFamilies(entries) {
  const seen = new Set()
  const result = []
  for (const e of entries) {
    const key = e.family.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(e)
  }
  return result.sort((a, b) => a.family.localeCompare(b.family))
}

/** Scan the user-level fonts directory for fonts not in the registry. */
function directoryFamilies() {
  const families = new Set()
  const dirs = [
    join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts'),
    join(process.env.WINDIR || '', 'Fonts')
  ]
  for (const dir of dirs) {
    try {
      for (const file of readdirSync(dir)) {
        if (!/\.(ttf|otf|ttc)$/i.test(file)) continue
        // family = filename minus extension and weight suffixes, then drop a
        // trailing "_0"/"-0" duplicate-install marker and normalize separators
        let base = file.replace(/\.(ttf|otf|ttc)$/i, '').replace(/[-_]+/g, ' ')
          .replace(/\s+\d+\s*$/i, '')
        base = baseFamily(base)
        if (base.length > 0) families.add(base)
      }
    } catch {
      // skip unreadable dir
    }
  }
  return [...families].sort((a, b) => a.localeCompare(b))
}

export function apply(ctx) {
  const dispose = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler(_req, res) {
      const entries = uniqueFamilies(readRegistryFonts())
      const dirOnly = directoryFamilies().filter((f) => !entries.some((e) => normFamily(e.family) === normFamily(f)))
      const all = [
        ...entries.map((e) => ({ name: e.family })),
        ...dirOnly.map((name) => ({ name }))
      ]
      res.statusCode = 200
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      res.end(JSON.stringify({ fonts: all }))
    }
  })
  ctx.on('dispose', dispose)
}

/** Normalize a family name for dedup: lowercase, strip all non-alphanumerics. */
function normFamily(name) {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

export { name, inject }
