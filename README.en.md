# dsh-system-fonts

> A font picker plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) Web GUI. It enumerates **every font installed on your machine** and lets you set the **UI font** (`--dsw-font-family`) and the **code font** (`--ds-font-family-code`).

![DSH](https://img.shields.io/badge/DSH-DeepSeek%20Harness-blue)
![dsh-plugin](https://img.shields.io/badge/dsh-plugin-system%20fonts-orange)
![license](https://img.shields.io/badge/license-MIT-green)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

中文说明: [README.zh-CN.md](./README.md)

## What it does

Let DSH use **any font already installed on your machine**:

- **UI font** (`--dsw-font-family`) — the overall DSH interface text
- **Code font** (`--ds-font-family-code`) — code blocks and terminal text

No font files needed — the plugin reads your Windows font registry and font directories and lists **every installed font** in a dropdown. Pick one and it applies instantly.

## Features

- 🖥️ **Enumerate all system fonts**: reads `HKLM`/`HKCU` font registry + user/system font dirs, dedupes and strips weight suffixes (e.g. `FontName Bold` → `FontName`)
- 🎨 **Independent UI & code font**: controls `--dsw-font-family` and `--ds-font-family-code`
- ⚡ **Instant apply**: via the official `ctx.theme.overrideTokens` API — applies immediately, no refresh
- 💾 **Persistent**: saved in `localStorage`
- 🔄 **Refresh button**: re-enumerate after installing new fonts
- 🌐 **Bilingual**: follows the DSH UI language
- 🔧 **No official code touched**: pure plugin on the profile layer, uninstall restores everything

## Install

```sh
dsh plugin --profile web add github:kira4094/dsh-system-fonts
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
