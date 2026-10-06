#!/usr/bin/env bash
# ==============================================================================
# EVAH Host Companion — Linux Uninstaller
# ==============================================================================
set -euo pipefail

INSTALL_DIR="${HOME}/.local/share/evah/companion"
SYSTEMD_USER_DIR="${HOME}/.config/systemd/user"

echo "======================================================================"
echo "  EVAH Host Companion — Linux Uninstaller"
echo "======================================================================"

echo "[1/3] Stopping and disabling systemd user service..."
systemctl --user stop evah-companion.service 2>/dev/null || true
systemctl --user disable evah-companion.service 2>/dev/null || true

echo "[2/3] Removing service file..."
rm -f "$SYSTEMD_USER_DIR/evah-companion.service"
systemctl --user daemon-reload

echo "[3/3] Removing companion files..."
rm -rf "$INSTALL_DIR"

echo "======================================================================"
echo "  EVAH Host Companion has been completely uninstalled."
echo "======================================================================"
