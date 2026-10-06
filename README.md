# EVAH — Your Personal Digital Environment, Everywhere

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Offline-First](https://img.shields.io/badge/Offline--First-100%25-emerald.svg)](SECURITY.md)
[![USB Hardware Bound](https://img.shields.io/badge/USB-Bound%20Security-blue.svg)](SECURITY.md)

**EVAH** is a lightweight, portable, offline-first operating-system desktop environment designed to reside entirely on a USB flash drive. Inspired by the calm simplicity and usability of modern desktop systems, EVAH delivers a self-contained portable PC experience with hardware-bound session security.

---

## 🌟 Key Architecture & Capabilities

- **USB-Presence-Aware Secure Session**:
  - Continuous native heartbeat monitoring of mounted volumes.
  - Physical USB detachment **immediately invalidates the active session**, purges in-memory cryptographic keys, wipes sensitive clipboard contents, and locks private applications.
- **Offline-First Vault (AES-256-GCM)**:
  - Local password key derivation via PBKDF2/Argon2id.
  - Stored strictly encrypted on USB at `EVAH/data/vault/vault.enc`.
  - Zero plaintext secrets ever persisted to host disk.
- **Deep Personalization & Theme Studio**:
  - 9 Built-in design presets (*EVAH Default, Light, Dark, Ocean, Forest, Slate, Warm, Minimal, High Contrast*).
  - Fine-grained typography, text scaling (85%–130%), UI density, window radii, dock positioning, and real-time wallpaper filter editor (*Brightness, Contrast, Blur, Saturation, Grayscale, Color Tint*).
  - All styling tokens persist directly on the USB drive.
- **Built-In System Applications**:
  - **Files**: Native/Offline file explorer with drag-and-drop, previews, and host import/export.
  - **Secure Vault**: Category-based encrypted credentials manager with automatic 15-second clipboard clearing.
  - **Web Browser**: Multi-tabbed browser shell with bookmark manager and privacy wiper.
  - **EVAH Notes**: Markdown notepad stored directly inside `EVAH/data/files/Notes/`.
  - **Terminal**: Interactive CLI emulator with Unix & EVAH telemetry commands (`ls`, `cat`, `vault`, `usb`, `panic`, etc.).
  - **Settings & Theme Studio**: Centralized control center for hardware policies and visual design tokens.
- **Dual-Mode Operation**:
  - **Mode A (Tauri Desktop Shell)**: Production desktop binary with native hardware USB polling and direct OS filesystem hooks.
  - **Mode B (Browser Development Mode)**: Full in-browser simulation (`npm run dev`) with interactive USB disconnect simulator.

---

## 🚀 Quick Start & Development

### Prerequisites

- Node.js 18+ (tested on Node v24)
- npm or pnpm
- *(Optional for Desktop Mode A)*: Rust toolchain and Cargo

### 1. Browser Development Mode (Simulated USB)

```bash
# Clone the repository
git clone https://github.com/evah-os/evah.git
cd evah

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` to test the full OS environment. In browser mode, use the **Dev Mode: (Unplug USB / Plug In USB)** toggle in the top status bar or inside Settings to simulate physical removal.

### 2. Desktop Mode (Tauri Native Shell)

```bash
# Launch Tauri desktop window with native Rust monitor
npm run tauri dev
```

### 3. Production Build

```bash
# Build frontend web bundle
npm run build

# Compile standalone desktop installer
npm run tauri build
```

---

## 📁 Portable USB Drive Structure

```text
USB_DRIVE/
├── EVAH_DEVICE                      # Hardware presence marker
└── EVAH/
    ├── app/                         # Standalone executable binaries
    └── data/
        ├── files/                   # User documents, downloads, notes
        │   ├── Documents/
        │   ├── Downloads/
        │   ├── Pictures/
        │   ├── Projects/
        │   └── Notes/
        ├── vault/
        │   └── vault.enc            # AES-256-GCM encrypted credentials
        ├── wallpapers/              # Custom image backgrounds
        ├── themes/                  # Custom .evah-theme configs
        ├── settings/                # User preferences & hardware policies
        └── sessions/                # Ephemeral session receipts
```

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd> | **Emergency Panic Lockdown** (Purges keys & locks OS) |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> | Launch Files Manager |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> | Launch Web Browser |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> | Launch Encrypted Vault |
| <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd> | Launch Interactive Terminal |
| <kbd>Esc</kbd> | Dismiss active dialogs |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
