# EVAH Host Mode & Companion Guide

> **Your Personal Digital Environment, Everywhere.**
> Launch EVAH instantly inside an already-running Windows or Linux desktop without rebooting.

---

## 1. Overview & Conceptual Architecture

EVAH supports two complementary operating modes from a single USB drive:

```text
               EVAH PORTABLE USB DRIVE
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
     BOOT MODE                       HOST MODE
  Power on computer               Computer already running
  Select USB in BIOS/UEFI         (Windows or Linux)
  Boot EVAH Linux OS              Plug in USB
         ↓                               ↓
  Fullscreen Kiosk                EVAH Host Companion detects USB
  Complete Isolation              Launches backend from USB
                                  Opens EVAH in new browser window
```

> [!IMPORTANT]
> **Why `autorun.inf` is not used:**
> Modern operating systems (Windows 7/10/11, macOS, and modern Linux distributions) disable AutoRun/AutoPlay for removable USB drives by default for critical security reasons. A USB drive cannot force a host PC to execute arbitrary binaries automatically upon insertion.
> EVAH solves this using a lightweight, silent **EVAH Host Companion** installed **once** on the host machine.

---

## 2. The Host Mode Experience

### First Time Setup (Installed Once on Host)
```text
Install EVAH Host Companion (EVAH-Host-Companion-Setup.exe)
        ↓
Companion starts quietly in the background on login
        ↓
Insert EVAH USB
        ↓
EVAH opens automatically in a new browser window
```

### Every Subsequent Use
```text
Insert EVAH USB
        ↓
Wait ~2 seconds
        ↓
EVAH opens automatically
```

No need to open a terminal, find drive letters, start Node, run commands, or type URLs.

### On USB Removal
```text
USB drive unplugged
        ↓
Companion detects missing manifest
        ↓
Backend process terminated (targeted PID only)
        ↓
Active session invalidated
```

---

## 3. USB Runtime Layout

When prepared with `npm run build:usb`, your USB drive contains:

```text
[USB_ROOT]/
├── evah.manifest.json            # Marker identifying verified EVAH drive
├── backend/
│   └── index.cjs                 # Standalone, self-contained Node.js MVC bundle
├── frontend/
│   ├── index.html                # Compiled React SPA entry
│   └── assets/                   # Bundled CSS, JS, fonts
├── runtime/
│   └── node.exe                  # Portable Node.js executable (no host Node needed)
├── config/
│   └── evah.json                 # Host mode configuration
├── launcher/
│   ├── start-evah.bat            # Manual fallback launcher for Windows
│   └── start-evah.sh             # Manual fallback launcher for Linux
└── data/
    ├── files/                    # User files & documents
    ├── vault/                    # Encrypted AES-256 vault container
    ├── wallpapers/               # Persisted & imported wallpapers
    ├── settings/                 # Desktop preferences & theme tokens
    └── sessions/                 # User profile metadata
```

### The Manifest (`evah.manifest.json`)
```json
{
  "app": "EVAH",
  "mode": "host",
  "version": "1.0.0",
  "name": "EVAH — Your Personal Digital Environment, Everywhere",
  "entryPoint": "backend/index.cjs",
  "minNodeVersion": "18.0.0"
}
```

---

## 4. Building the Packages

Run the unified host build script:

```bash
npm run build:usb
```

This performs the complete production pipeline:
1. Builds React frontend (`tsc && vite build` -> `dist/`)
2. Compiles standalone backend bundle (`esbuild` -> `server/dist/index.cjs`)
3. Compiles host companion daemon (`esbuild` -> `host-companion/dist/companion.cjs`)
4. Assembles `dist/EVAH-USB/` with the manifest, bundled runtime, and folder structures
5. Compiles native Windows installer: `dist/EVAH-Host-Companion-Setup.exe`
6. Generates batch installer: `dist/EVAH-Host-Companion-Setup.bat`

---

## 5. Installing the Host Companion

### On Windows (Recommended)

1. Double-click **`EVAH-Host-Companion-Setup.exe`** (or run `EVAH-Host-Companion-Setup.bat`).
2. The installer runs in user-space (`%LOCALAPPDATA%\EVAH\HostCompanion\`), requiring **zero administrator privileges**.
3. It registers a startup entry under `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and launches the silent background runner (`evah-companion.vbs`).
4. The companion is now active and will restart quietly whenever you log into Windows.

### On Linux

Run the companion installer script:

```bash
./host-companion/install.sh
```

This creates and starts a systemd user-level service:
```bash
systemctl --user status evah-companion.service
```

---

## 6. How It Works Internally

### 1. Drive Detection Engine
The companion polls mounted drives every 1.5 seconds with virtually 0% CPU overhead:
- **Windows**: Checks mounted drive letters `D:` through `Z:` for `evah.manifest.json`.
- **Linux**: Scans mount locations (`/media/$USER`, `/run/media/$USER`, `/mnt`) for `evah.manifest.json`.
- Validates that `manifest.app === "EVAH"` and that `backend/index.cjs` is present. Non-EVAH flash drives are silently ignored.

### 2. Process Execution & Sandboxing
When an EVAH USB is detected:
- Spawns the backend using the USB-bundled runtime:
  `[USB]\runtime\node.exe [USB]\backend\index.cjs`
- Working directory is set to the USB root.
- Environment variables configured:
  - `PORT=3927`
  - `HOST=127.0.0.1`
  - `EVAH_DIST_PATH=[USB]/frontend`
  - `EVAH_STORAGE_PATH=[USB]/data`
- Runs in detached background mode (`windowsHide: true`).

### 3. Readiness Check & Browser Launch
- Polls `http://127.0.0.1:3927/health` every 250ms until HTTP 200 is returned.
- Once healthy, launches a new application-style window:
  - Chrome: `chrome.exe --app=http://127.0.0.1:3927/ --new-window`
  - Edge: `msedge.exe --app=http://127.0.0.1:3927/ --new-window`
  - Fallback: System default browser.

### 4. Duplicate-Instance Prevention
If EVAH is already running from the same USB drive:
- The companion checks backend health.
- If already responsive, it avoids spawning duplicate Node processes or duplicate browser tabs.
- If the previous instance crashed, it safely cleans up before re-launching.

### 5. Safe Removal & Teardown
When the USB drive is unplugged:
- The companion detects that `evah.manifest.json` is missing.
- Sends a `POST /api/system/usb/disconnect` shutdown notification to the backend.
- Terminates **ONLY** the specific child process PID recorded by the companion (`taskkill /PID <PID> /T /F`). Unrelated Node processes on the computer are left untouched.
- Closes the associated browser window.
- Cleans up lock and session tracking files.

---

## 7. Uninstalling the Companion

### On Windows
Run the uninstaller located at:
```cmd
"%LOCALAPPDATA%\EVAH\HostCompanion\uninstall.bat"
```
Or run `host-companion/uninstall.bat` from this repository.
This terminates the background process, deletes the AutoStart registry key, and removes all companion files.

### On Linux
Run:
```bash
./host-companion/uninstall.sh
```
This stops and disables the systemd user service and removes companion files.

---

## 8. Manual Fallback Launchers

If you insert the USB on a computer where the companion is not installed:
- **Windows**: Double-click `[USB]\launcher\start-evah.bat`
- **Linux**: Run `[USB]/launcher/start-evah.sh`

Both scripts launch the USB backend and open your browser without needing anything installed on the host.
