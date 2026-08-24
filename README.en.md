# dsh-system-fonts

> A font picker plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web GUI. It enumerates **every font installed on your machine** and lets you set the **UI font** (`--dsw-font-family`) and the **code font** (`--ds-font-family-code`) freely — not limited to a few built-in presets.

![DSH](https://img.shields.io/badge/DSH-DeepSeek%20Harness-blue)
![dsh-plugin](https://img.shields.io/badge/dsh-plugin-system%20fonts-orange)
![license](https://img.shields.io/badge/license-MIT-green)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

中文说明: [README.zh-CN.md](./README.md)

## Why?

The official `dsh-fonts` plugin offers font settings but only via built-in presets or manually entered woff2 URLs (an offline webfont approach). It cannot enumerate the fonts already installed on your OS. If you want DSH to use a locally installed font (e.g. **Maple Mono NF CN**, Source Han Serif, JetBrains Mono…), `dsh-fonts` won't help directly.

`dsh-system-fonts` takes a different route: the **host side reads your Windows font registry + font directories** and exposes every installed font to the browser as a picker. The chosen font is a system font rendered natively by the browser — **no webfont files needed**.

## Features

- 🖥️ **Enumerate all system fonts**: reads `HKLM`/`HKCU` font registry + user/system font dirs, dedupes and strips weight suffixes (`Maple Mono NF CN Bold` → `Maple Mono NF CN`)
- 🎨 **Independent UI & code font**: controls `--dsw-font-family` and `--ds-font-family-code`
- ⚡ **Instant apply**: via the official `ctx.theme.overrideTokens` API — applies immediately, no refresh
- 💾 **Persistent**: saved in `localStorage`
- 🔄 **Refresh button**: re-enumerate after installing new fonts
- 🌐 **Bilingual**: follows the DSH UI language
- 🔧 **No official code touched**: pure plugin on the profile layer

## Install

```sh
dsh plugin --profile web add github:kiray/dsh-system-fonts
```

Or from a local checkout (profile dir is the pnpm workspace root, add `-w`):

```sh
dsh plugin --profile web add -w /path/to/dsh-system-fonts
```

Restart `dsh web` (or DSH Desktop) after install.

### Uninstall

```sh
dsh plugin --profile web remove dsh-system-fonts
```

## Usage

1. Open **Settings → General**
2. Find **「System Fonts」**
3. Pick a font in the **UI font** / **Code font** dropdowns
4. Applies instantly

## How it works

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Host (Node)                │        │  Browser (Client)            │
│                             │        │                              │
│  read HKLM/HKCU font keys   │  JSON  │  Settings → General row      │
│  read %LOCALAPPDATA% Fonts  │ ─────► │  pick UI/code font           │
│  + %WINDIR%\Fonts           │        │  ctx.theme.overrideTokens()  │
│                             │        │  localStorage persistence    │
└─────────────┬───────────────┘        └──────────────▲───────────────┘
              │                                       │
              └── /plugins/dsh-system-fonts/fonts ─────┘
```

## Platform

Host-side font enumeration currently targets **Windows** (`reg query` + Windows font dirs). Linux/macOS enumeration is not implemented yet (falls back to an empty list). PRs welcome (e.g. `fc-list`).

## Contributing

Issues and PRs welcome:
- Linux / macOS font enumeration
- Font search input
- Font preview (render sample text in the chosen font)
- More translations

## License

[MIT](./LICENSE)

## Links

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)
- [dsh-fonts](https://github.com/zhijun-dai/dsh-Fonts) (layout reference)
- [Maple Mono](https://github.com/subframe7536/maple-font) (popular coding font, includes NF-CN)
