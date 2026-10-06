# EVAH OS — Bootable Linux USB Environment

> **Your Personal Digital Environment, Everywhere.**
> EVAH packaged as a lightweight, bootable Linux operating environment for USB flash drives.

---

## 1. Overview & Architecture

EVAH OS converts the standard EVAH web application into an offline-first, bootable live Linux operating system.

When flashed onto a USB flash drive, you can insert the USB drive into any x86_64 PC or laptop, power on the system, select the USB from the boot menu (UEFI or BIOS), and EVAH launches automatically in full-screen kiosk mode.

### Boot Lifecycle

```text
Computer Power ON
       ↓
Boot from EVAH USB (UEFI / Legacy BIOS)
       ↓
Linux Kernel & Live Initramfs initialize
       ↓
evah-backend.service starts automatically
  * Executes: node /opt/evah/backend/index.cjs
  * Binds to: http://127.0.0.1:3927
  * Serves React frontend from: /opt/evah/frontend
       ↓
evah-kiosk.service starts automatically
  * Verifies backend health (http://127.0.0.1:3927/health)
  * Launches: chromium --kiosk --start-fullscreen http://127.0.0.1:3927
       ↓
EVAH Desktop is displayed full-screen
```

### Key Technical Specs

- **Base Architecture**: x86_64 (Intel & AMD 64-bit PCs & laptops)
- **Boot Support**: Dual-mode Hybrid ISO (UEFI with GRUB EFI + Legacy BIOS with ISOLINUX)
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide Icons
- **Backend**: Node.js Local-First MVC Service bundled with zero external runtime dependencies (`server/dist/index.cjs`)
- **Port Binding**: Strictly local at `http://127.0.0.1:3927`
- **Network Dependency**: **0%** — Completely self-contained, 100% offline-first. No internet connection required after booting.

---

## 2. Quick Start: Build the ISO

To compile the frontend, prepare the backend bundle, and generate the bootable hybrid ISO:

```bash
./build-iso.sh
```

### Build Modes

| Command | Description |
|---|---|
| `./build-iso.sh` | **Default / Standalone**: Generates `dist/evah-live-x86_64.iso` with the embedded EVAH payload and dual UEFI/BIOS bootloaders. |
| `./build-iso.sh --live` | **Debian Live-Build**: Runs the official Debian `live-build` pipeline on Debian/Ubuntu host machines. |
| `./build-iso.sh --docker` | **Containerized Build**: Builds a full Debian Live ISO inside a reproducible `debian:bookworm` container. |

The final output is generated at:
```text
dist/evah-live-x86_64.iso
```

---

## 3. Verify the Generated ISO

Run the built-in integrity and bootloader verification script:

```bash
./packaging/scripts/verify-iso.sh
```

This verifies:
1. Valid ISO9660 volume identifier (`EVAH_LIVE`)
2. Rock Ridge POSIX filesystem extensions
3. El Torito BIOS boot record marked `0x88` (bootable)
4. El Torito UEFI section headers pointing to `efi.img`
5. Linux kernel (`/boot/vmlinuz`) and composite initramfs (`/boot/initrd.img`)
6. GRUB & ISOLINUX boot configurations
7. EVAH production backend and kiosk launcher scripts

---

## 4. Test Without a Physical USB (QEMU)

You can test-boot the ISO inside a virtual machine without needing a physical USB drive:

### UEFI Mode (Recommended)
```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 4096 \
  -smp 2 \
  -vga virtio \
  -bios /usr/share/ovmf/OVMF.fd \
  -cdrom dist/evah-live-x86_64.iso
```

### Standard BIOS Mode
```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 4096 \
  -smp 2 \
  -vga virtio \
  -cdrom dist/evah-live-x86_64.iso
```

*(Note: On systems without KVM hardware acceleration, omit `-enable-kvm` or replace with `-accel tcg` or `-accel whpx` on Windows).*

---

## 5. Flash to a Physical USB Pendrive

### Step 1: Identify your USB drive

Plug in your USB flash drive and list all block devices:

```bash
lsblk
```

Example output:
```text
NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
sda      8:0    0 512.1G  0 disk 
├─sda1   8:1    0   512M  0 part /boot/efi
└─sda2   8:2    0 511.6G  0 part /
sdb      8:16   1  14.9G  0 disk 
└─sdb1   8:17   1  14.9G  0 part /media/user/MYUSB
```

> [!CAUTION]
> **Carefully verify the target device letter!**
> In the example above, `sdb` is the 16GB USB flash drive (`RM=1`), while `sda` is the internal 512GB SSD.
> **Writing to the wrong device will permanently erase your data.** Never write to `sda` or `nvme0n1`.

Unmount any auto-mounted partitions:
```bash
sudo umount /dev/sdX* || true
```

### Step 2: Write the ISO to the USB

Use `dd` to flash the hybrid ISO directly to the USB drive:

```bash
sudo dd if=dist/evah-live-x86_64.iso \
  of=/dev/sdX \
  bs=4M \
  status=progress \
  oflag=sync
```

*(Replace `/dev/sdX` with your verified USB device, e.g., `/dev/sdb`).*

### Step 3: Boot from the USB

1. Insert the USB drive into your target PC/laptop.
2. Restart or power on the computer.
3. Immediately press the boot menu key (typically <kbd>F12</kbd>, <kbd>F11</kbd>, <kbd>F9</kbd>, or <kbd>Esc</kbd> depending on the computer manufacturer).
4. Select the EVAH USB drive from the boot options.
5. EVAH will boot directly into the desktop in full-screen kiosk mode.

---

## 6. Systemd Services & Automatic Startup

EVAH OS uses standard `systemd` unit files to manage the application lifecycle:

### `evah-backend.service`
Located at `/etc/systemd/system/evah-backend.service`:
- **Executes**: `/usr/bin/node /opt/evah/backend/index.cjs`
- **Environment**:
  - `PORT=3927`
  - `HOST=127.0.0.1`
  - `EVAH_DIST_PATH=/opt/evah/frontend`
  - `EVAH_STORAGE_PATH=/opt/evah/data`
- **Behavior**: Starts automatically on multi-user boot, serves the React static frontend, and handles local-first storage APIs.

### `evah-kiosk.service`
Located at `/etc/systemd/system/evah-kiosk.service`:
- **Executes**: `/opt/evah/scripts/start-kiosk.sh`
- **Behavior**:
  1. Polls `http://127.0.0.1:3927/health` until the backend is healthy.
  2. Disables screensavers and power-saving timeouts (`xset -dpms s off`).
  3. Launches Chromium with:
     ```bash
     chromium \
       --kiosk \
       --start-fullscreen \
       --no-first-run \
       --no-default-browser-check \
       --disable-infobars \
       --user-data-dir=/home/evah/.config/chromium-kiosk \
       http://127.0.0.1:3927
     ```

---

## 7. Storage & Persistence Modes

### Live Mode (Default)
In default Live mode, EVAH runs entirely from RAM using a tmpfs/overlayfs overlay.
- Any notes, settings, or files created during the session are held in memory.
- When the computer is shut down or the USB is removed, sensitive in-memory data is completely wiped.

### Persistent USB Mode
If you wish to retain files, wallpapers, settings, and encrypted vaults across reboots on the physical USB drive:
1. Create a second partition on the USB drive formatted as `ext4`:
   ```bash
   sudo mkfs.ext4 -L persistence /dev/sdX2
   ```
2. Create the persistence configuration file:
   ```bash
   sudo mount /dev/sdX2 /mnt
   echo "/ union" | sudo tee /mnt/persistence.conf
   sudo umount /mnt
   ```
3. Boot selecting the **EVAH OS (Persistent Data Mode)** boot menu entry.
Changes to `/opt/evah/data` will persist across reboots on that partition.

---

## 8. Repository Packaging Structure

```text
evah/
├── build-iso.sh                     # Master one-step build script
├── README-BOOTABLE.md               # Complete bootable OS documentation
├── dist/
│   ├── index.html                   # Built React frontend entry
│   ├── assets/                      # Bundled JS, CSS, fonts
│   └── evah-live-x86_64.iso         # Bootable hybrid ISO artifact
├── server/
│   ├── src/                         # Node.js MVC server source
│   └── dist/
│       └── index.cjs                # Standalone production backend bundle
└── packaging/
    ├── systemd/
    │   ├── evah-backend.service     # Backend systemd service
    │   └── evah-kiosk.service       # Chromium kiosk systemd service
    ├── scripts/
    │   ├── start-kiosk.sh           # X11 & Chromium kiosk launcher
    │   ├── build_iso.py             # Standalone hybrid ISO generator
    │   └── verify-iso.sh            # ISO inspection & verification script
    ├── config/
    │   ├── xinitrc                  # X11 session launcher
    │   ├── openbox-autostart        # Openbox window manager autostart
    │   └── 99-evah.conf             # Sysctl kernel latency & USB flash tuning
    └── iso/
        ├── grub.cfg                 # GRUB UEFI boot configuration
        ├── isolinux.cfg             # ISOLINUX BIOS boot configuration
        ├── auto/config              # Debian live-build auto script
        └── config/
            ├── package-lists/       # Debian live-build package list
            └── hooks/live/          # Debian live-build chroot hooks
```

---

## 9. Troubleshooting & FAQ

#### Q: The computer boots straight to Windows instead of EVAH USB.
**A**: Ensure Secure Boot allows third-party UEFI certificates in your BIOS/UEFI settings, or temporarily disable Secure Boot. Also ensure the USB boot priority is raised in BIOS setup.

#### Q: How do I exit kiosk mode during development or maintenance?
**A**: Press <kbd>Ctrl+Alt+F2</kbd> to switch to virtual terminal 2 (`tty2`). Log in with user `evah` (password: `evah`). To inspect the backend log, run `journalctl -u evah-backend -f`.

#### Q: Can I run EVAH in a browser without booting from USB?
**A**: Yes! For normal web development, run `npm run dev` or launch the production server with `npm start` and visit `http://127.0.0.1:3927`.
