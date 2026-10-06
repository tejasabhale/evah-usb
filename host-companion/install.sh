#!/usr/bin/env bash
# ==============================================================================
# EVAH Host Companion — Linux Installer
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${HOME}/.local/share/evah/companion"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"

echo "======================================================================"
echo "  EVAH Host Companion — Linux Installer"
echo "======================================================================"

mkdir -p "$INSTALL_DIR"
mkdir -p "$SYSTEMD_USER_DIR"

echo "[1/3] Copying companion files to $INSTALL_DIR..."
if [ -f "$SCRIPT_DIR/dist/companion.cjs" ]; then
  cp -f "$SCRIPT_DIR/dist/companion.cjs" "$INSTALL_DIR/companion.cjs"
elif [ -f "$SCRIPT_DIR/companion.cjs" ]; then
  cp -f "$SCRIPT_DIR/companion.cjs" "$INSTALL_DIR/companion.cjs"
fi

cp -f "$SCRIPT_DIR/uninstall.sh" "$INSTALL_DIR/uninstall.sh"
chmod +x "$INSTALL_DIR/uninstall.sh"

echo "[2/3] Configuring systemd user service..."
cat << 'EOF' > "$SYSTEMD_USER_DIR/evah-companion.service"
[Unit]
Description=EVAH Host Companion Background USB Presence Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node %h/.local/share/evah/companion/companion.cjs
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF

echo "[3/3] Enabling and starting evah-companion service..."
systemctl --user daemon-reload
systemctl --user enable --now evah-companion.service

echo "======================================================================"
echo "  EVAH Host Companion is now active and monitoring for USB drives!"
echo "======================================================================"
