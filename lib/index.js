// dsh-system-fonts — host half.
//
// Enumerates every font installed on the system (Windows registry HKLM + HKCU
// and the user-level fonts directory) and exposes them to the browser half as
// JSON over the harness web server. It also persists the chosen UI/code font
// to a stable file under the DSH home, so the preference survives restarts and
// port changes (localStorage is origin-scoped, and the DSH web port changes
// every launch — so the browser half must read/write preferences here).
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FONTS_ROUTE = '/plugins/dsh-system-fonts/fonts'
const PREFS_ROUTE = '/plugins/dsh-system-fonts/prefs'
const name = 'dsh-system-fonts'
const inject = ['webServer']

/** Stable preference file location under the DSH home. */
function prefsFile() {
  const home = process.env.DSH_HOME || join(process.env.USERPROFILE || process.env.HOME || '', '.dsh')
  return join(home, 'storages', 'dsh-system-fonts-prefs.json')
}

/** Regex to strip the trailing " (TrueType)"/"(OpenType)"/" (All res)" decoration. */
const DECOR = /\s*\((TrueType|OpenType|All res|Fontresource)\)\s*$/i

/** Common weight/style words (space- or dash-separated) to strip from a family name. */
const WEIGHT_WORDS = /\s*[-_]?\s*(Regular|Bold|Italic|Light|Medium|SemiBold|Semibold|ExtraBold|ExtraLight|Thin|Black|Hairline|Book|Demi|Heavy|Roman)\s*$/i

/** Reduce a family name to its base name (drop weight/style suffix). */
function baseFamily(name) {
  let s = name.replace(DECOR, '').trim()
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

/** Normalize a family name for dedup: lowercase, strip all non-alphanumerics. */
function normFamily(name) {
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '')
}

/** Read the persisted font preference ({ ui?, code? }), or null. */
function readPrefs() {
  try {
    const raw = readFileSync(prefsFile(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        ui: typeof parsed.ui === 'string' ? parsed.ui : '',
        code: typeof parsed.code === 'string' ? parsed.code : ''
      }
    }
    return null
  } catch {
    return null
  }
}

/** Write the font preference to disk. */
function writePrefs(prefs) {
  try {
    const file = prefsFile()
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(prefs), 'utf8')
  } catch {}
}

function sendJson(res, code, obj) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export function apply(ctx) {
  // --- fonts enumeration ---
  const fontsDispose = ctx.webServer.register({
    kind: 'exact',
    path: FONTS_ROUTE,
    handler(_req, res) {
      const entries = uniqueFamilies(readRegistryFonts())
      const dirOnly = directoryFamilies().filter((f) => !entries.some((e) => normFamily(e.family) === normFamily(f)))
      const all = [
        ...entries.map((e) => ({ name: e.family })),
        ...dirOnly.map((name) => ({ name }))
      ]
      sendJson(res, 200, { fonts: all })
    }
  })

  // --- prefs read/write (survives restarts & port changes) ---
  const prefsDispose = ctx.webServer.register({
    kind: 'exact',
    path: PREFS_ROUTE,
    handler(req, res) {
      if (req.method === 'GET') {
        sendJson(res, 200, { prefs: readPrefs() })
        return
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        readBody(req).then((body) => {
          let parsed = null
          try { parsed = JSON.parse(body || '{}') } catch { parsed = null }
          const prefs = parsed && typeof parsed === 'object' ? {
            ui: typeof parsed.ui === 'string' ? parsed.ui : '',
            code: typeof parsed.code === 'string' ? parsed.code : ''
          } : { ui: '', code: '' }
          writePrefs(prefs)
          sendJson(res, 200, { ok: true, prefs })
        }).catch((e) => sendJson(res, 500, { ok: false, error: String(e) }))
        return
      }
      sendJson(res, 405, { ok: false, error: 'method not allowed' })
    }
  })

  ctx.on('dispose', () => {
    fontsDispose()
    prefsDispose()
  })
}

export { name, inject }
