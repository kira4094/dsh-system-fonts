# dsh-system-fonts

> 一款为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）Web GUI 设计的**系统字体选择插件**。它枚举你电脑上**所有已安装的字体**，让你自由设置 **界面字体**（`--dsw-font-family`）与 **代码字体**（`--ds-font-family-code`）。

![DSH](https://img.shields.io/badge/DSH-DeepSeek%20Harness-blue)
![dsh-plugin](https://img.shields.io/badge/dsh-plugin-系统字体-orange)
![license](https://img.shields.io/badge/license-MIT-green)
![node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)

- English README: [README.en.md](./README.en.md)

---

## 这个插件做什么

让 DSH 使用**你电脑上已经安装好的任意字体**：

- **界面字体**（`--dsw-font-family`）—— 控制整个 DSH 界面的文字
- **代码字体**（`--ds-font-family-code`）—— 控制代码块、终端里的文字

你不需要准备任何字体文件——插件直接读取你 Windows 系统的字体注册表和字体目录，把**全部已安装字体**列成下拉框，选哪个就立刻用哪个。

## 功能特性

- 🖥️ **枚举系统全部字体**：读取 `HKLM` / `HKCU` 字体注册表 + 用户级/系统字体目录，智能去重、剥离字重后缀（例如 `FontName Bold` → `FontName`）
- 🎨 **界面字体 & 代码字体独立设置**：分别控制 `--dsw-font-family` 与 `--ds-font-family-code`
- ⚡ **即时生效**：通过官方 `ctx.theme.overrideTokens` API，改动立即应用到页面，无需刷新
- 💾 **持久化**：选择保存在浏览器 `localStorage`，刷新/重启后保持
- 🔄 **刷新按钮**：新安装字体后一键重新枚举
- 🌐 **中英双语**：自动跟随 DSH 界面语言
- 🔧 **不改任何官方代码**：纯插件，挂在 profile 层，卸载即还原

## 界面预览

在 **设置 → 通用（General）** 页面，你会看到一个 **「系统字体」** 设置项，包含两个下拉框：

```
界面字体  [ 默认（跟随主题）   ▾ ]
代码字体  [ 默认（跟随主题）   ▾ ]
[ 刷新字体列表 ]
```

下拉框里是你在本机安装的全部字体（按字母排序）。选哪个，对应的界面/代码字体立刻切换。

## 安装

### 从 GitHub 安装（推荐）

```sh
dsh plugin --profile web add github:kira4094/dsh-system-fonts
```

### 本地目录安装

```sh
# 先 clone 或下载本项目，然后（profile 目录是 pnpm workspace 根，需加 -w）
dsh plugin --profile web add -w /path/to/dsh-system-fonts
```

安装完成后 **重启 `dsh web`**（或重启 DSH Desktop）。

### 卸载

```sh
dsh plugin --profile web remove dsh-system-fonts
```

## 使用

1. 重启后打开 **设置 → 通用**
2. 找到 **「系统字体」**
3. 在「界面字体」「代码字体」下拉框中选择你想要的系统字体
4. 立即生效，无需刷新

## 工作原理

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Host 端 (Node)             │        │  Browser 端 (Client)         │
│                             │        │                              │
│  读注册表 HKLM/HKCU 字体键   │  JSON   │  Settings → General 设置项   │
│  读 %LOCALAPPDATA% Fonts    │ ─────► │  下拉选择界面/代码字体         │
│  + %WINDIR%\Fonts           │        │  ctx.theme.overrideTokens()  │
│                             │        │  localStorage 持久化          │
└─────────────┬───────────────┘        └──────────────▲───────────────┘
              │                                       │
              └── /plugins/dsh-system-fonts/fonts ─────┘
```

- **Host 端**（`lib/index.js`）：用 `reg query` 读取 `HKLM/HKCU\...\Fonts`，扫描字体目录，归一化 family 名（去字重后缀、去重、排序），通过 webServer 暴露 `/plugins/dsh-system-fonts/fonts` JSON 接口。
- **Client 端**（`lib/client.js`）：注册 `Settings → General` 槽位，拉取字体列表，用下拉框展示，`ctx.theme.overrideTokens` 应用，localStorage 持久化。

## 支持平台

当前 Host 端的字体枚举针对 **Windows**（使用 `reg query` + Windows 字体目录）。
Linux / macOS 暂未实现枚举（会退化为仅返回空列表）。欢迎 PR 补充 POSIX 字体枚举（如 `fc-list`）。

## 贡献

欢迎提交 Issue 与 PR！

- 补充 Linux / macOS 字体枚举
- 增加「搜索字体」输入框（字体多时更好找）
- 增加字体预览（用所选字体渲染示例文本）
- 更多翻译

## License

[MIT](./LICENSE)
