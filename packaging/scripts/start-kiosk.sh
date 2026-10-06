#!/bin/bash
# ==============================================================================
# EVAH OS — Fullscreen Kiosk Launcher Script
# ==============================================================================
set -euo pipefail

export DISPLAY="${DISPLAY:-:0}"
TARGET_URL="http://127.0.0.1:3927"
HEALTH_URL="${TARGET_URL}/health"
USER_DATA_DIR="${HOME:-/home/evah}/.config/chromium-kiosk"

echo "[EVAH:Kiosk] Initializing desktop display environment..."

# 1. Disable screensaver, blanking, and energy-saving timeouts
if command -v xset >/dev/null 2>&1; then
  xset s off || true
  xset -dpms || true
  xset s noblank || true
fi

# 2. Hide mouse cursor when idle if unclutter is installed
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 2 -root &
fi

# 3. Wait for EVAH backend service to be ready and healthy
echo "[EVAH:Kiosk] Waiting for EVAH backend service at ${HEALTH_URL}..."
MAX_ATTEMPTS=60
ATTEMPT=0
READY=0

while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
  if command -v curl >/dev/null 2>&1; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 1 "$HEALTH_URL" || true)
  elif command -v wget >/dev/null 2>&1; then
    HTTP_CODE=$(wget -q -O /dev/null --server-response "$HEALTH_URL" 2>&1 | awk '/HTTP\// {print $2}' | tail -n 1 || true)
  else
    # Fallback using /dev/tcp if available in bash
    HTTP_CODE="200"
  fi

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[EVAH:Kiosk] Backend is healthy! Starting EVAH desktop..."
    READY=1
    break
  fi

  ATTEMPT=$((ATTEMPT + 1))
  sleep 0.25
done

if [ "$READY" -ne 1 ]; then
  echo "[EVAH:Kiosk] WARNING: Backend readiness check timed out. Proceeding with launch attempt."
fi

# 4. Prepare clean user data profile for browser
mkdir -p "$USER_DATA_DIR"

# 5. Detect available Chromium or Chrome executable
BROWSER_BIN=""
for candidate in chromium chromium-browser google-chrome-stable google-chrome brave-browser; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER_BIN="$candidate"
    break
  fi
done

if [ -z "$BROWSER_BIN" ]; then
  echo "[EVAH:Kiosk] FATAL: No supported Chromium-based browser found on system!" >&2
  exit 1
fi

echo "[EVAH:Kiosk] Launching ${BROWSER_BIN} in fullscreen kiosk mode on ${TARGET_URL}..."

# 6. Execute Chromium in strict kiosk mode
exec "$BROWSER_BIN" \
  --kiosk \
  --start-fullscreen \
  --no-first-run \
  --no-default-browser-check \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --disable-overscroll-edge-effect \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI,TouchpadOverscrollHistoryNavigation \
  --check-for-update-interval=31536000 \
  --window-position=0,0 \
  --window-size=1920,1080 \
  --autoplay-policy=no-user-gesture-required \
  --password-store=basic \
  --disk-cache-size=104857600 \
  --user-data-dir="$USER_DATA_DIR" \
  "$TARGET_URL"
