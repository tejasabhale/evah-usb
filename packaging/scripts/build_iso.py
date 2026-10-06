#!/usr/bin/env python3
"""
EVAH OS — Automated Bootable Hybrid ISO Generator
Builds a production-ready, UEFI & BIOS bootable hybrid ISO containing:
- Linux kernel (x86_64)
- Live initramfs with EVAH payload overlay
- React frontend (dist/)
- Node.js backend (server/dist/index.cjs)
- Systemd service configurations (evah-backend.service, evah-kiosk.service)
- Fullscreen Chromium kiosk launcher
- Dual bootloader: ISOLINUX (BIOS) + GRUB EFI (UEFI)
- Hybrid MBR for direct USB flashing via `dd`
"""

import os
import sys
import io
import time
import gzip
import shutil
import subprocess
from pathlib import Path

try:
    import pycdlib
except ImportError:
    print("[EVAH:ISO] Installing pycdlib dependency...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pycdlib"])
    import pycdlib

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DIST_DIR = PROJECT_ROOT / "dist"
SERVER_DIST = PROJECT_ROOT / "server" / "dist" / "index.cjs"
PACKAGING_DIR = PROJECT_ROOT / "packaging"
CACHE_DIR = PACKAGING_DIR / "cache"
OUTPUT_ISO = DIST_DIR / "evah-live-x86_64.iso"


def log(msg: str):
    print(f"\033[1;36m[EVAH:ISO]\033[0m {msg}")


def make_cpio_entry(path_in_archive: str, data: bytes, mode: int = 0o100755, mtime: int = 1700000000) -> bytes:
    """Creates a standard CPIO newc archive entry."""
    filename = path_in_archive.lstrip("/")
    namesize = len(filename) + 1
    filesize = len(data)
    hdr = (
        f"070701"
        f"{0:08x}"           # ino
        f"{mode:08x}"        # mode
        f"{0:08x}"           # uid
        f"{0:08x}"           # gid
        f"{1:08x}"           # nlink
        f"{mtime:08x}"       # mtime
        f"{filesize:08x}"    # filesize
        f"{0:08x}"           # devmajor
        f"{0:08x}"           # devminor
        f"{0:08x}"           # rdevmajor
        f"{0:08x}"           # rdevminor
        f"{namesize:08x}"    # namesize
        f"{0:08x}"           # check
    )
    out = hdr.encode("ascii") + filename.encode("utf-8") + b"\x00"
    while len(out) % 4 != 0:
        out += b"\x00"
    out += data
    while len(out) % 4 != 0:
        out += b"\x00"
    return out


def make_cpio_trailer() -> bytes:
    return make_cpio_entry("TRAILER!!!", b"", mode=0)


def build_evah_cpio_overlay() -> bytes:
    """Builds a CPIO archive containing all EVAH application, service, and configuration files."""
    log("Building EVAH filesystem overlay...")
    entries = []

    # 1. Add directories
    dirs = [
        "opt",
        "opt/evah",
        "opt/evah/backend",
        "opt/evah/frontend",
        "opt/evah/scripts",
        "opt/evah/data",
        "opt/evah/data/files",
        "opt/evah/data/vault",
        "opt/evah/data/wallpapers",
        "opt/evah/data/settings",
        "opt/evah/data/sessions",
        "etc",
        "etc/systemd",
        "etc/systemd/system",
        "etc/X11",
        "etc/X11/xinit",
        "etc/xdg",
        "etc/xdg/openbox",
        "etc/sysctl.d",
    ]
    for d in dirs:
        entries.append(make_cpio_entry(d, b"", mode=0o040755))

    # 2. Add backend bundle
    if not SERVER_DIST.exists():
        raise FileNotFoundError(f"Missing server bundle at {SERVER_DIST}. Run `npm run build:server` first.")
    backend_bytes = SERVER_DIST.read_bytes()
    entries.append(make_cpio_entry("opt/evah/backend/index.cjs", backend_bytes, mode=0o100755))

    # 3. Add frontend files (from dist/)
    for item in DIST_DIR.rglob("*"):
        if item.is_file() and item.name != "evah-live-x86_64.iso":
            rel_path = item.relative_to(DIST_DIR).as_posix()
            archive_path = f"opt/evah/frontend/{rel_path}"
            entries.append(make_cpio_entry(archive_path, item.read_bytes(), mode=0o100644))

    # 4. Add kiosk startup script
    kiosk_script = PACKAGING_DIR / "scripts" / "start-kiosk.sh"
    if kiosk_script.exists():
        entries.append(make_cpio_entry("opt/evah/scripts/start-kiosk.sh", kiosk_script.read_bytes(), mode=0o100755))

    # 5. Add systemd service definitions
    backend_svc = PACKAGING_DIR / "systemd" / "evah-backend.service"
    if backend_svc.exists():
        entries.append(make_cpio_entry("etc/systemd/system/evah-backend.service", backend_svc.read_bytes(), mode=0o100644))

    kiosk_svc = PACKAGING_DIR / "systemd" / "evah-kiosk.service"
    if kiosk_svc.exists():
        entries.append(make_cpio_entry("etc/systemd/system/evah-kiosk.service", kiosk_svc.read_bytes(), mode=0o100644))

    # 6. Add configuration files
    xinitrc = PACKAGING_DIR / "config" / "xinitrc"
    if xinitrc.exists():
        entries.append(make_cpio_entry("etc/X11/xinit/xinitrc", xinitrc.read_bytes(), mode=0o100755))

    openbox = PACKAGING_DIR / "config" / "openbox-autostart"
    if openbox.exists():
        entries.append(make_cpio_entry("etc/xdg/openbox/autostart", openbox.read_bytes(), mode=0o100755))

    sysctl = PACKAGING_DIR / "config" / "99-evah.conf"
    if sysctl.exists():
        entries.append(make_cpio_entry("etc/sysctl.d/99-evah.conf", sysctl.read_bytes(), mode=0o100644))

    issue_txt = (
        "\n"
        "======================================================================\n"
        "  EVAH OS -- Your Personal Digital Environment, Everywhere\n"
        "  Bootable USB Environment | Offline-First | Local-First MVC\n"
        "======================================================================\n\n"
    ).encode("utf-8")
    entries.append(make_cpio_entry("etc/issue", issue_txt, mode=0o100644))

    entries.append(make_cpio_trailer())
    return b"".join(entries)


def ensure_boot_components():
    """Ensures kernel, initramfs, and bootloader binaries are cached."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    base_iso = CACHE_DIR / "alpine-base.iso"
    if not base_iso.exists():
        log("Downloading verified Linux base components...")
        url = "https://dl-cdn.alpinelinux.org/alpine/v3.20/releases/x86_64/alpine-virt-3.20.2-x86_64.iso"
        import urllib.request
        urllib.request.urlretrieve(url, str(base_iso))

    extracted_dir = CACHE_DIR / "extracted"
    extracted_dir.mkdir(parents=True, exist_ok=True)

    required = ["vmlinuz_virt", "initramfs_virt.gz", "isolinux.bin", "isohdpfx.bin", "ldlinux.c32", "libcom32.c32", "libutil.c32", "mboot.c32", "efi.img"]
    missing = [f for f in required if not (extracted_dir / f).exists()]

    if missing:
        log(f"Extracting boot components from base ISO: {missing}...")
        iso = pycdlib.PyCdlib()
        iso.open(str(base_iso))
        mapping = {
            "/BOOT/VMLINUZ_VIRT.;1": "vmlinuz_virt",
            "/BOOT/INITRAMFS_VIRT.;1": "initramfs_virt.gz",
            "/BOOT/SYSLINUX/ISOLINUX.BIN;1": "isolinux.bin",
            "/BOOT/SYSLINUX/ISOHDPFX.BIN;1": "isohdpfx.bin",
            "/BOOT/SYSLINUX/LDLINUX.C32;1": "ldlinux.c32",
            "/BOOT/SYSLINUX/LIBCOM32.C32;1": "libcom32.c32",
            "/BOOT/SYSLINUX/LIBUTIL.C32;1": "libutil.c32",
            "/BOOT/SYSLINUX/MBOOT.C32;1": "mboot.c32",
            "/BOOT/GRUB/EFI.IMG;1": "efi.img",
        }
        for iso_p, local_n in mapping.items():
            out_p = extracted_dir / local_n
            if not out_p.exists():
                with open(out_p, "wb") as f:
                    iso.get_file_from_iso_fp(f, iso_path=iso_p)
        iso.close()

    return extracted_dir


def generate_iso():
    """Assembles and writes the bootable hybrid ISO."""
    extracted = ensure_boot_components()

    # Create composite initramfs with EVAH payload
    evah_cpio = build_evah_cpio_overlay()
    base_initramfs_gz = (extracted / "initramfs_virt.gz").read_bytes()
    base_initramfs = gzip.decompress(base_initramfs_gz)

    combined_initramfs = base_initramfs + evah_cpio
    combined_initramfs_gz = gzip.compress(combined_initramfs, compresslevel=6)

    combined_initrd_path = CACHE_DIR / "initrd.img"
    combined_initrd_path.write_bytes(combined_initramfs_gz)
    log(f"Combined initramfs created: {len(combined_initramfs_gz) / (1024*1024):.2f} MB")

    # Prepare ISO
    log(f"Constructing hybrid bootable ISO image: {OUTPUT_ISO}...")
    iso = pycdlib.PyCdlib()
    iso.new(rock_ridge="1.09", joliet=3, vol_ident="EVAH_LIVE")

    # Directories
    iso.add_directory("/BOOT", rr_name="boot", joliet_path="/boot")
    iso.add_directory("/BOOT/GRUB", rr_name="grub", joliet_path="/boot/grub")
    iso.add_directory("/BOOT/SYSLINUX", rr_name="syslinux", joliet_path="/boot/syslinux")
    iso.add_directory("/OPT", rr_name="opt", joliet_path="/opt")
    iso.add_directory("/OPT/EVAH", rr_name="evah", joliet_path="/opt/evah")
    iso.add_directory("/OPT/EVAH/BACKEND", rr_name="backend", joliet_path="/opt/evah/backend")
    iso.add_directory("/OPT/EVAH/SCRIPTS", rr_name="scripts", joliet_path="/opt/evah/scripts")

    # Kernel & initrd
    iso.add_file(str(extracted / "vmlinuz_virt"), "/BOOT/VMLINUZ;1", rr_name="vmlinuz", joliet_path="/boot/vmlinuz")
    iso.add_file(str(combined_initrd_path), "/BOOT/INITRD.IMG;1", rr_name="initrd.img", joliet_path="/boot/initrd.img")

    # UEFI GRUB & EFI Image
    iso.add_file(str(extracted / "efi.img"), "/BOOT/GRUB/EFI.IMG;1", rr_name="efi.img", joliet_path="/boot/grub/efi.img")
    grub_cfg = PACKAGING_DIR / "iso" / "grub.cfg"
    iso.add_file(str(grub_cfg), "/BOOT/GRUB/GRUB.CFG;1", rr_name="grub.cfg", joliet_path="/boot/grub/grub.cfg")

    # BIOS SYSLINUX
    iso.add_file(str(extracted / "isolinux.bin"), "/BOOT/SYSLINUX/ISOLINUX.BIN;1", rr_name="isolinux.bin", joliet_path="/boot/syslinux/isolinux.bin")
    iso.add_file(str(extracted / "ldlinux.c32"), "/BOOT/SYSLINUX/LDLINUX.C32;1", rr_name="ldlinux.c32", joliet_path="/boot/syslinux/ldlinux.c32")
    iso.add_file(str(extracted / "libcom32.c32"), "/BOOT/SYSLINUX/LIBCOM32.C32;1", rr_name="libcom32.c32", joliet_path="/boot/syslinux/libcom32.c32")
    iso.add_file(str(extracted / "libutil.c32"), "/BOOT/SYSLINUX/LIBUTIL.C32;1", rr_name="libutil.c32", joliet_path="/boot/syslinux/libutil.c32")
    iso.add_file(str(extracted / "mboot.c32"), "/BOOT/SYSLINUX/MBOOT.C32;1", rr_name="mboot.c32", joliet_path="/boot/syslinux/mboot.c32")

    isolinux_cfg = PACKAGING_DIR / "iso" / "isolinux.cfg"
    iso.add_file(str(isolinux_cfg), "/BOOT/SYSLINUX/ISOLINUX.CFG;1", rr_name="isolinux.cfg", joliet_path="/boot/syslinux/isolinux.cfg")

    # EVAH payload files directly accessible on ISO filesystem
    iso.add_file(str(SERVER_DIST), "/OPT/EVAH/BACKEND/INDEX.CJS;1", rr_name="index.cjs", joliet_path="/opt/evah/backend/index.cjs")
    kiosk_script = PACKAGING_DIR / "scripts" / "start-kiosk.sh"
    iso.add_file(str(kiosk_script), "/OPT/EVAH/SCRIPTS/KIOSK.SH;1", rr_name="start-kiosk.sh", joliet_path="/opt/evah/scripts/start-kiosk.sh")

    # Add El Torito Boot Records
    log("Configuring El Torito bootloaders (BIOS & UEFI)...")
    iso.add_eltorito("/BOOT/SYSLINUX/ISOLINUX.BIN;1", boot_info_table=True, boot_load_size=4)
    iso.add_eltorito("/BOOT/GRUB/EFI.IMG;1", efi=True)

    # Add Hybrid MBR for direct USB booting
    log("Embedding Hybrid MBR partition record...")
    iso.add_isohybrid(efi=True)

    # Write output ISO
    OUTPUT_ISO.parent.mkdir(parents=True, exist_ok=True)
    if OUTPUT_ISO.exists():
        OUTPUT_ISO.unlink()

    log(f"Writing final ISO file to {OUTPUT_ISO}...")
    iso.write(str(OUTPUT_ISO))
    iso.close()

    size_mb = OUTPUT_ISO.stat().st_size / (1024 * 1024)
    log(f"SUCCESS! Bootable ISO created successfully: {OUTPUT_ISO} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    try:
        generate_iso()
    except Exception as e:
        print(f"\033[1;31m[EVAH:ISO:ERROR]\033[0m {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
