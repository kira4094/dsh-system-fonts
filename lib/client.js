// dsh-system-fonts — browser half (client plugin bundle).
//
// Loaded by dsh-client-modules at /plugins/dsh-system-fonts/client.js and
// executed through the vendored cordis Loader's lazy-CJS module table
// (window.__ModuleLoader__.load). Plain CJS inside the factory; React and the
// official client runtime resolve against the shell's module table.
//
// Registers a Settings → General picker that lets you pick any locally-installed
// font for the UI font (--dsw-font-family) and the code font
// (--ds-font-family-code). The font list is fetched from the host endpoint
// /plugins/dsh-system-fonts/fonts. Choices apply immediately via
// ctx.theme.overrideTokens and persist in localStorage.
window.__ModuleLoader__.load({
  id: 'dsh-system-fonts',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { useState, useEffect, useCallback } = React

    const SETTINGS_NS = 'settings.systemFonts'
    const STORAGE_KEY = 'dsh-system-fonts:prefs'
    const FONT_LIST_URL = '/plugins/dsh-system-fonts/fonts'

    const zh = {
      'font.title': '系统字体',
      'font.hint': '从你系统里已安装的字体中选择，应用到界面或代码。',
      'font.default': '默认（跟随主题）',
      'font.ui': '界面字体',
      'font.code': '代码字体',
      'font.loading': '加载系统字体中…',
      'font.error': '无法读取系统字体列表：',
      'font.refresh': '刷新字体列表'
    }
    const en = {
      'font.title': 'System Fonts',
      'font.hint': 'Pick any font installed on this machine, applied to UI or code.',
      'font.default': 'Default (follow theme)',
      'font.ui': 'UI font',
      'font.code': 'Code font',
      'font.loading': 'Loading system fonts…',
      'font.error': 'Could not read system fonts: ',
      'font.refresh': 'Refresh font list'
    }

    // ---------------------------------------------------------------------
    // Persistence
    // ---------------------------------------------------------------------
    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw)
      } catch {
        return null
      }
    }
    function writePrefs(prefs) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
      } catch {}
    }

    const defaultPrefs = {
      ui: '',   // empty => default (follow theme)
      code: ''  // empty => default (follow theme)
    }

    // ---------------------------------------------------------------------
    // Font list fetch
    // ---------------------------------------------------------------------
    async function fetchSystemFonts() {
      const res = await fetch(FONT_LIST_URL)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const data = await res.json()
      const list = Array.isArray(data.fonts) ? data.fonts.map((f) => f.name) : []
      // dedupe, sort
      const seen = new Set()
      const out = []
      for (const n of list) {
        const k = n.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        out.push(n)
      }
      return out.sort((a, b) => a.localeCompare(b))
    }

    // ---------------------------------------------------------------------
    // Apply fonts via ctx.theme.overrideTokens
    // ---------------------------------------------------------------------
    function applyFonts(ctx, prefs) {
      const tokens = {}
      if (prefs.ui) tokens['--dsw-font-family'] = { light: prefs.ui, dark: prefs.ui }
      if (prefs.code) tokens['--ds-font-family-code'] = { light: prefs.code, dark: prefs.code }
      const dispose = ctx.theme.overrideTokens('dsh-system-fonts', tokens)
      return dispose
    }

    // ---------------------------------------------------------------------
    // Settings row component
    // ---------------------------------------------------------------------
    const styles = {
      group: { display: 'flex', flexDirection: 'column', gap: '8px' },
      title: { color: 'var(--dsw-alias-label-primary)', fontSize: '14px', lineHeight: '20px' },
      hint: { color: 'var(--dsw-alias-label-tertiary)', fontSize: '12px', lineHeight: '16px' },
      row: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', lineHeight: '20px' },
      rowLabel: { color: 'var(--dsw-alias-label-secondary)', width: '70px', flexShrink: 0 },
      select: {
        flex: '1 1 auto',
        minWidth: 0,
        boxSizing: 'border-box',
        height: '30px',
        padding: '0 8px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '13px'
      },
      toolRow: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' },
      refreshBtn: {
        boxSizing: 'border-box',
        height: '26px',
        padding: '0 10px',
        borderRadius: '8px',
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: '12px',
        cursor: 'pointer'
      },
      error: { color: 'var(--dsw-alias-state-error-primary)', fontSize: '12px' }
    }

    function SystemFontRow({ t, useStore }) {
      // read persisted prefs + a store if provided
      const store = useStore && useStore((s) => s)
      const [prefs, setPrefs] = useState(() => ({ ...defaultPrefs, ...readPrefs() }))
      const [fonts, setFonts] = useState([])
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState('')

      const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
          const list = await fetchSystemFonts()
          setFonts(list)
        } catch (e) {
          setError(t('font.error') + (e && e.message ? e.message : String(e)))
        } finally {
          setLoading(false)
        }
      }, [t])

      useEffect(() => {
        load()
        // apply current prefs on mount
        const restore = readPrefs()
        if (restore) applyFonts(ctxRef, { ...defaultPrefs, ...restore })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])

      const update = (field, value) => {
        const next = { ...prefs, [field]: value }
        setPrefs(next)
        writePrefs(next)
        applyFonts(ctxRef, next)
      }

      const selectOptions = [
        React.createElement('option', { key: '', value: '' }, t('font.default')),
        ...fonts.map((f) => React.createElement('option', { key: f, value: f }, f))
      ]

      return React.createElement('div', { style: styles.group },
        React.createElement('div', { style: styles.title }, t('font.title')),
        React.createElement('div', { style: styles.hint }, t('font.hint')),
        React.createElement('div', { style: styles.row },
          React.createElement('div', { style: styles.rowLabel }, t('font.ui')),
          React.createElement('select', {
            style: styles.select,
            value: prefs.ui,
            onChange: (e) => update('ui', e.target.value)
          }, selectOptions)
        ),
        React.createElement('div', { style: styles.row },
          React.createElement('div', { style: styles.rowLabel }, t('font.code')),
          React.createElement('select', {
            style: styles.select,
            value: prefs.code,
            onChange: (e) => update('code', e.target.value)
          }, selectOptions)
        ),
        loading
          ? React.createElement('div', { style: styles.hint }, t('font.loading'))
          : null,
        error
          ? React.createElement('div', { style: styles.error }, error)
          : null,
        React.createElement('div', { style: styles.toolRow },
          React.createElement('button', { style: styles.refreshBtn, onClick: load }, t('font.refresh'))
        )
      )
    }

    // The row needs ctx at apply time; we stash it on a module-level ref so the
    // component can apply fonts without threading ctx through the store.
    let ctxRef = null

    // ---------------------------------------------------------------------
    // Client plugin body
    // ---------------------------------------------------------------------
    const inject = ['slots', 'locale', 'theme']

    function apply(ctx) {
      ctxRef = ctx

      // register locale + apply persisted choice on boot
      ctx.effect(() => ctx.locale.register(SETTINGS_NS, { zh, en }), 'dsh-system-fonts: locale')

      const storeShape = (useStore) => useStore

      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'system-fonts',
        order: 18,
        store: storeShape,
        locale: SETTINGS_NS,
        inject: () => ({})
      }, SystemFontRow))
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
