#!/usr/bin/env bash
# ==============================================================================
# EVAH OS — Master Bootable ISO Build Script
# ==============================================================================
# Usage:
#   ./build-iso.sh             # Automatic build using standalone hybrid engine
#   ./build-iso.sh --live      # Build full Debian Live ISO via live-build (Debian/Ubuntu)
#   ./build-iso.sh --docker    # Build full Debian Live ISO inside Docker container
# ==============================================================================
set -euo pipefail

# ANSI Colors
CYAN='\033[1;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${CYAN}======================================================================${NC}"
echo -e "${CYAN}       EVAH OS -- Bootable Linux USB ISO Build Pipeline                ${NC}"
echo -e "${CYAN}======================================================================${NC}"

MODE="standalone"
if [ "${1:-}" = "--live" ]; then
  MODE="live-build"
elif [ "${1:-}" = "--docker" ]; then
  MODE="docker"
fi

# ------------------------------------------------------------------------------
# 1. Host Requirements Check
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[1/6] Checking Host Requirements...${NC}"

if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}Error: Node.js is required but not installed.${NC}" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo -e "${RED}Error: npm is required but not installed.${NC}" >&2
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "  * Node.js version: ${GREEN}${NODE_VERSION}${NC}"

PYTHON_BIN=""
for py in python3 python py "/c/Program Files/Python314/python.exe" "/c/Users/Lenovo/AppData/Local/Programs/Python/Python312/python.exe"; do
  if command -v "$py" >/dev/null 2>&1; then
    if "$py" -c "import sys" >/dev/null 2>&1; then
      PYTHON_BIN="$py"
      break
    fi
  fi
done

if [ -z "$PYTHON_BIN" ] && [ "$MODE" = "standalone" ]; then
  echo -e "${RED}Error: Working Python 3 runtime is required for standalone ISO packaging.${NC}" >&2
  exit 1
fi
echo -e "  * Python runtime: ${GREEN}$($PYTHON_BIN --version 2>&1)${NC}"

# ------------------------------------------------------------------------------
# 2. Build Frontend (React + TypeScript + Tailwind)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[2/6] Building Production React Frontend...${NC}"
npm run build

if [ ! -f "dist/index.html" ]; then
  echo -e "${RED}Error: Frontend build failed. dist/index.html not found.${NC}" >&2
  exit 1
fi
echo -e "  * Frontend compiled successfully into ${GREEN}dist/${NC}"

# ------------------------------------------------------------------------------
# 3. Build Node.js Backend Bundle
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[3/6] Building Production Standalone Node.js Backend...${NC}"
npm run build:server

if [ ! -f "server/dist/index.cjs" ]; then
  echo -e "${RED}Error: Server build failed. server/dist/index.cjs not found.${NC}" >&2
  exit 1
fi
echo -e "  * Backend bundle compiled successfully into ${GREEN}server/dist/index.cjs${NC}"

# ------------------------------------------------------------------------------
# 4. Prepare Dedicated Packaging Rootfs Structure
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[4/6] Preparing Packaging Directory Structure...${NC}"
mkdir -p packaging/rootfs/opt/evah/backend
mkdir -p packaging/rootfs/opt/evah/frontend
mkdir -p packaging/rootfs/opt/evah/scripts
mkdir -p packaging/rootfs/opt/evah/data/files
mkdir -p packaging/rootfs/opt/evah/data/vault
mkdir -p packaging/rootfs/opt/evah/data/wallpapers
mkdir -p packaging/rootfs/opt/evah/data/settings
mkdir -p packaging/rootfs/opt/evah/data/sessions
mkdir -p packaging/rootfs/etc/systemd/system
mkdir -p packaging/rootfs/etc/X11/xinit
mkdir -p packaging/rootfs/etc/xdg/openbox
mkdir -p packaging/rootfs/etc/sysctl.d

# Copy application artifacts
cp -f server/dist/index.cjs packaging/rootfs/opt/evah/backend/index.cjs
cp -rf dist/* packaging/rootfs/opt/evah/frontend/ 2>/dev/null || true
rm -f packaging/rootfs/opt/evah/frontend/evah-live-x86_64.iso

# Copy scripts and systemd definitions
cp -f packaging/scripts/start-kiosk.sh packaging/rootfs/opt/evah/scripts/start-kiosk.sh
chmod +x packaging/rootfs/opt/evah/scripts/start-kiosk.sh

cp -f packaging/systemd/evah-backend.service packaging/rootfs/etc/systemd/system/
cp -f packaging/systemd/evah-kiosk.service packaging/rootfs/etc/systemd/system/
cp -f packaging/config/xinitrc packaging/rootfs/etc/X11/xinit/
cp -f packaging/config/openbox-autostart packaging/rootfs/etc/xdg/openbox/autostart
cp -f packaging/config/99-evah.conf packaging/rootfs/etc/sysctl.d/

# Also sync into Debian live-build includes.chroot
mkdir -p packaging/iso/config/includes.chroot/opt/evah
mkdir -p packaging/iso/config/includes.chroot/etc/systemd/system
cp -rf packaging/rootfs/opt/evah/* packaging/iso/config/includes.chroot/opt/evah/
cp -rf packaging/rootfs/etc/systemd/system/* packaging/iso/config/includes.chroot/etc/systemd/system/

echo -e "  * Packaging files staged in ${GREEN}packaging/rootfs/${NC}"

# ------------------------------------------------------------------------------
# 5. Build Bootable Hybrid ISO Image
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[5/6] Generating Bootable Hybrid ISO (Mode: ${MODE})...${NC}"

if [ "$MODE" = "live-build" ]; then
  if ! command -v lb >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Debian live-build (lb) not found. Falling back to standalone builder.${NC}"
    MODE="standalone"
  else
    echo -e "  * Executing Debian live-build..."
    cd packaging/iso
    lb clean
    lb config
    lb build
    cp -f live-image-amd64.hybrid.iso "$SCRIPT_DIR/dist/evah-live-x86_64.iso"
    cd "$SCRIPT_DIR"
  fi
fi

if [ "$MODE" = "docker" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Docker not found. Falling back to standalone builder.${NC}"
    MODE="standalone"
  else
    echo -e "  * Running containerized Debian live-build in Docker..."
    docker run --privileged --rm -v "$SCRIPT_DIR":/workspace -w /workspace/packaging/iso debian:bookworm bash -c \
      "apt-get update && apt-get install -y live-build systemd-boot && lb clean && lb config && lb build && cp live-image-amd64.hybrid.iso /workspace/dist/evah-live-x86_64.iso"
  fi
fi

if [ "$MODE" = "standalone" ]; then
  "$PYTHON_BIN" packaging/scripts/build_iso.py
fi

# ------------------------------------------------------------------------------
# 6. Verification & Completion
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}[6/6] Verifying Final ISO Output...${NC}"

ISO_FILE="dist/evah-live-x86_64.iso"

if [ ! -f "$ISO_FILE" ]; then
  echo -e "${RED}Error: ISO build failed. $ISO_FILE was not created.${NC}" >&2
  exit 1
fi

ISO_SIZE=$(du -h "$ISO_FILE" | cut -f1)

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}       EVAH OS Bootable ISO Successfully Built!                       ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo -e "  * Output ISO:     ${CYAN}${SCRIPT_DIR}/${ISO_FILE}${NC}"
echo -e "  * Size:           ${GREEN}${ISO_SIZE}${NC}"
echo -e "  * Boot Support:   ${GREEN}UEFI (x86_64) + BIOS (ISOLINUX) + Hybrid MBR${NC}"
echo -e "  * Auto-Start:     ${GREEN}Node.js Backend (port 3927) + Chromium Kiosk${NC}"
echo -e ""
echo -e "${YELLOW}Test without USB using QEMU:${NC}"
echo -e "  qemu-system-x86_64 -enable-kvm -m 4096 -cdrom ${ISO_FILE}"
echo -e ""
echo -e "${YELLOW}Flash to USB Pendrive:${NC}"
echo -e "  sudo dd if=${ISO_FILE} of=/dev/sdX bs=4M status=progress oflag=sync"
echo -e "  (Replace /dev/sdX with your actual USB drive; use 'lsblk' to verify)"
echo -e "${GREEN}======================================================================${NC}"
